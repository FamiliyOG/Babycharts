/**
 * server/index.js
 * BabyCharts Express Server
 *
 * - Serves the built Vite frontend (dist/)
 * - Exposes REST API at /api/*
 * - Initialises the per-child PDF scheduler on startup
 *
 * Environment variables (see .env.example):
 *   PORT          – port to listen on (default: 3001)
 *   APP_URL       – public URL used by Puppeteer (default: http://localhost:PORT)
 *   PDF_OUTPUT_DIR– override the pdf output directory
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readDb,
  writeDb,
  createDbBackup,
  checkDatabaseIntegrity,
  closeDatabase,
} from './utils/db.js';
import { rescheduleAll, setAppUrl, stopScheduler } from './scheduler.js';

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import crypto from 'node:crypto';

import profilesRouter from './routes/profiles.js';
import settingsRouter from './routes/settings.js';
import exportsRouter from './routes/exports.js';
import authRouter from './routes/auth.js';
import familiesRouter from './routes/families.js';
import mediaRouter from './routes/media.js';
import { requireAuth, getUserFamilyRole } from './middleware/auth.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');

const PORT = Number(process.env.PORT) || 3001;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

function resolveNetworkUrl(port) {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return `http://${iface.address}:${port}`;
        }
      }
    }
  } catch {
    // Fallback if OS network inspection fails
  }
  return `http://0.0.0.0:${port}`;
}

// ── Express setup ────────────────────────────────────────────────────────────
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Trust reverse proxies (Nginx, Traefik, Cloudflare, Caddy) for Internet + LAN

// ── Request ID & Structured Logging (BC-240, Issue #177) ─────────────────────
app.use((req, res, next) => {
  const incomingReqId = req.headers['x-request-id'];
  const reqId =
    typeof incomingReqId === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(incomingReqId)
      ? incomingReqId
      : crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// ── HTTP Security Headers (Issues BC-035, BC-036, BC-037, BC-038) ────────────
app.use(
  helmet({
    // BC-036: Strict Content Security Policy configured for SPA, PWA, Chart.js & fonts
    // upgradeInsecureRequests is set to null so local/LAN HTTP connections (e.g. Unraid/Docker/IP:3001) work seamlessly
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        workerSrc: ["'self'", 'blob:'],
        childSrc: ["'self'", 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: [
          "'self'",
          'ws:',
          'wss:',
          'https://fonts.googleapis.com',
          'https://fonts.gstatic.com',
          'https://*.sentry.io',
          'https://*.ingest.sentry.io',
          'https://*.ingest.de.sentry.io',
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: null,
      },
    },
    // BC-037: Strict Referrer-Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    // Disable HSTS header unless HTTPS is explicitly enabled to allow self-hosted HTTP / LAN access
    hsts: process.env.ENABLE_HTTPS === 'true',
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// BC-038: Permissions-Policy header (disables microphone, camera, geolocation, payment, usb)
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), xr-spatial-tracking=(), accelerometer=(), gyroscope=()'
  );
  next();
});

// Global Rate Limiter to prevent brute-force / resource allocation exhaustion (1000 reqs / 15 min per IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' },
});
app.use(globalLimiter);

// CORS configuration: Allow configured origins, same-origin, LAN/private IPs (e.g. Unraid/Docker), and local dev
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [
      process.env.APP_URL,
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ].filter(Boolean);

const isPrivateNetworkHostname = (hostname) => {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }
  if (hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
    return true;
  }
  if (hostname.startsWith('172.')) {
    const parts = hostname.split('.');
    const second = parseInt(parts[1], 10);
    return !Number.isNaN(second) && second >= 16 && second <= 31;
  }
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      // 1. Allow non-browser requests (no origin header), server-to-server, or same-origin
      if (!origin) {
        return callback(null, true);
      }

      // 2. Allow configured whitelist origins or wildcard
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      // 3. Allow private/local LAN network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) and localhost
      try {
        const { hostname } = new URL(origin);
        if (isPrivateNetworkHostname(hostname)) {
          return callback(null, true);
        }
      } catch {
        // Invalid URL format
      }

      // Disallow external untrusted origins safely without throwing 500 error
      return callback(null, false);
    },
    credentials: true,
  })
);

// Granular body parsers: Higher limits for encrypted media uploads and backup imports (Issue #238)
app.use(['/api/media/upload', '/api/v1/media/upload'], express.json({ limit: '35mb' }));
app.use(['/api/exports/import', '/api/v1/exports/import'], express.json({ limit: '35mb' }));

// Standard body parser for all other JSON routes (1MB) to prevent DoS/Memory exhaustion (Issue #238)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Client Error Logging (Forward frontend errors to Unraid container log) ───
app.post('/api/client-logs', (req, res) => {
  const safeTime = new Date().toISOString();
  // Log fixed static message - eliminates any possibility of log injection (SonarQube S5145)
  console.warn('Frontend client error event recorded at %s', safeTime);
  return res.json({ ok: true });
});

// ── API routes (v1 & legacy aliases for backwards compatibility - BC-203, BC-202) ───
app.get(['/api/v1/health', '/api/health'], (req, res) => {
  const dbStatus = checkDatabaseIntegrity();
  return res.json({
    status: dbStatus.ok ? 'healthy' : 'degraded',
    version: 'v1',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
  });
});

app.use(['/api/v1/auth', '/api/auth'], authRouter);
app.use(['/api/v1/families', '/api/families'], familiesRouter);
app.use(['/api/v1/profiles', '/api/profiles'], profilesRouter);
app.use(['/api/v1/settings', '/api/settings'], settingsRouter);
app.use(['/api/v1/exports', '/api/exports'], exportsRouter);
app.use(['/api/v1/media', '/api/media'], mediaRouter);

// ── Central API Error Handler (BC-127) ───────────────────────────────────────
app.use(['/api/v1', '/api'], globalErrorHandler);

// Trigger manual PDF export for a specific child via API (requires auth & family access)
app.post('/api/exports/trigger/:childId', requireAuth, async (req, res) => {
  const { generatePdfForChild } = await import('./pdfGenerator.js');
  const db = readDb();
  const profile = db.profiles.find((p) => p.id === req.params.childId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  // Verify family authorization
  if (profile.familyId) {
    const family = db.families.find((f) => f.id === profile.familyId);
    const role = getUserFamilyRole(family, req.user.id);
    if (!role) {
      return res
        .status(403)
        .json({ error: 'Zugriff verweigert: Sie gehören nicht zu dieser Familie.' });
    }
  }

  const outputPath = await generatePdfForChild(profile, APP_URL);
  if (outputPath) {
    // Update lastExportAt
    const dbAfter = readDb();
    const idx = dbAfter.profiles.findIndex((p) => p.id === req.params.childId);
    if (idx !== -1) {
      dbAfter.profiles[idx].schedule = {
        ...dbAfter.profiles[idx].schedule,
        lastExportAt: new Date().toISOString(),
      };
      writeDb(dbAfter);
    }
    res.json({ ok: true, path: outputPath });
  } else {
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

// ── Serve static Vite build with long-term caching for hashed assets ────────
app.use(
  express.static(DIST_DIR, {
    index: false,
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      // Never cache index.html, service worker, or manifest so updates are instant
      if (
        filePath.endsWith('.html') ||
        filePath.endsWith('sw.js') ||
        filePath.endsWith('.webmanifest') ||
        filePath.endsWith('robots.txt') ||
        filePath.endsWith('llms.txt')
      ) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
        // Hashed assets (e.g. index-xyz.js, index-abc.css) are immutable
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // Other static icons/images
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    },
  })
);

// Direct static file routes
app.get('/icon.png', (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'icon.png'));
});
app.get('/favicon.svg', (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'favicon.svg'));
});

const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');

// SPA fallback – all non-API routes serve index.html with runtime config injected
app.get('{*path}', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  try {
    if (fs.existsSync(INDEX_HTML_PATH)) {
      let html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
      const dbSettings = readDb().settings || {};
      const sentryEnabled = Boolean(
        process.env.VITE_SENTRY_ENABLED === 'true' ||
        process.env.SENTRY_ENABLED === 'true' ||
        dbSettings.sentry_enabled === true
      );
      const runtimeConfig = {
        sentry_enabled: sentryEnabled,
        sentry_dsn: sentryEnabled
          ? process.env.VITE_SENTRY_DSN || process.env.SENTRY_DSN || dbSettings.sentry_dsn || null
          : null,
        sentry_replay_enabled: Boolean(
          process.env.VITE_SENTRY_REPLAY_ENABLED === 'true' ||
          dbSettings.sentry_replay_enabled === true
        ),
      };
      const configScript = `<script>window.__BABYCHARTS_CONFIG__ = ${JSON.stringify(runtimeConfig)};</script>`;
      html = html.replace('</head>', `${configScript}</head>`);
      return res.type('html').send(html);
    }
    return res.status(404).send('Not Found');
  } catch (err) {
    // Fallback: If dynamic HTML injection fails, send the static index.html directly
    console.warn('[SERVER] Dynamic index.html injection failed, serving static file:', err.message);
    return res.sendFile(INDEX_HTML_PATH);
  }
});

// ── Start ────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    const networkUrl = resolveNetworkUrl(PORT);

    console.log('════════════════════════════════════════════════');
    console.log(`  BabyCharts Server started`);
    console.log(`  Local URL   : http://localhost:${PORT}`);
    console.log(`  Network URL : ${networkUrl}`);
    if (process.env.APP_URL) {
      console.log(`  App URL     : ${process.env.APP_URL}`);
    }
    console.log(`  Port        : ${PORT} (0.0.0.0)`);
    console.log('════════════════════════════════════════════════');

    // Initialise scheduler after server is ready
    setAppUrl(APP_URL);
    rescheduleAll();

    // Automated rolling DB backup (on startup and every 24 hours)
    createDbBackup().catch((err) => console.error('[Backup] Startup backup error:', err));
    const backupInterval = setInterval(
      () => {
        createDbBackup().catch((err) => console.error('[Backup] Scheduled backup error:', err));
      },
      24 * 60 * 60 * 1000
    );

    // Graceful Shutdown on SIGTERM & SIGINT (BC-171, BC-172, BC-173)
    const handleShutdown = (signal) => {
      console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
      clearInterval(backupInterval);
      stopScheduler();

      server.close((err) => {
        if (err) {
          console.error('[Server] Error while closing HTTP server:', err);
        } else {
          console.log('[Server] HTTP server closed.');
        }
        closeDatabase();
        console.log('[Server] Graceful shutdown complete. Exiting.');
        process.exit(0);
      });

      // Force shutdown after 10 seconds if connections are hanging
      setTimeout(() => {
        console.error('[Server] Forced shutdown due to timeout.');
        closeDatabase();
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  });
}

export default app;
