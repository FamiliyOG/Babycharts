import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import yaml from 'yaml';
import request from 'supertest';
import app from '../../server/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OPENAPI_PATH = path.join(__dirname, '..', '..', 'openapi', 'babycharts-v1.yaml');

describe('OpenAPI 3.1 Contract Test Suite (BC-289)', () => {
  it('loads and validates OpenAPI 3.1.0 schema specification structure', () => {
    expect(fs.existsSync(OPENAPI_PATH)).toBe(true);

    const raw = fs.readFileSync(OPENAPI_PATH, 'utf8');
    const doc = yaml.parse(raw);

    expect(doc.openapi).toMatch(/^3\.1\.\d+$/);
    expect(doc.info).toBeDefined();
    expect(doc.info.title).toBe('BabyCharts API');
    expect(doc.info.version).toBe('1.0.0');
    expect(doc.paths).toBeDefined();
    expect(Object.keys(doc.paths).length).toBeGreaterThan(20);

    // Verify all paths start with slash and define methods
    for (const [pathKey, pathItem] of Object.entries(doc.paths)) {
      expect(pathKey.startsWith('/')).toBe(true);
      const methods = Object.keys(pathItem).filter((k) =>
        ['get', 'post', 'put', 'delete', 'patch'].includes(k)
      );
      expect(methods.length).toBeGreaterThan(0);
    }
  });

  it('verifies declared public endpoints against running Express instance', async () => {
    // 1. GET /health
    const healthRes = await request(app).get('/api/v1/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBeDefined();

    // 2. GET /auth/setup-status
    const setupRes = await request(app).get('/api/v1/auth/setup-status');
    expect(setupRes.status).toBe(200);
    expect(typeof setupRes.body.setupRequired).toBe('boolean');

    // 3. GET /auth/me without credentials returns 401
    const meRes = await request(app).get('/api/v1/auth/me');
    expect(meRes.status).toBe(401);

    // 4. GET /profiles without credentials returns 401
    const profilesRes = await request(app).get('/api/v1/profiles');
    expect(profilesRes.status).toBe(401);

    // 5. GET /settings without credentials returns 401
    const settingsRes = await request(app).get('/api/v1/settings');
    expect(settingsRes.status).toBe(401);
  });
});
