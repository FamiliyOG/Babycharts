import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import './index.css';
import './i18n/index.js';
import App from './App.jsx';
import ReportPrintPage from './components/ReportPrintPage.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { PwaProvider } from './context/PwaContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { logClientError } from './utils/api.js';

// Initialize Sentry error tracking if configured via environment or runtime config
const sentryDsn =
  import.meta.env.VITE_SENTRY_DSN ||
  (typeof window !== 'undefined' && window.__BABYCHARTS_CONFIG__?.VITE_SENTRY_DSN) ||
  'https://07036a692033303919294711f2ae049e@o4512010628497408.ingest.de.sentry.io/4512010705240144';

if (sentryDsn && typeof sentryDsn === 'string' && sentryDsn.trim()) {
  Sentry.init({
    dsn: sentryDsn.trim(),
    environment: import.meta.env.MODE || 'production',
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ['localhost', /^\/api\//],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });

  if (typeof window !== 'undefined') {
    window.triggerSentryTest = () => {
      const testErr = new Error('BabyCharts Sentry Setup Verification Error');
      Sentry.captureException(testErr);
      console.log('Sentry test event dispatched to ingest endpoint!', testErr);
      return 'Test-Event gesendet! Bitte Sentry Dashboard prüfen.';
    };
  }
}

// Global Client Error Catchers & iOS PWA Pinch/Double-Tap Zoom Protection
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default mini-infobar and save prompt event globally
    e.preventDefault();
    window.deferredPrompt = e;
    window.dispatchEvent(new Event('pwa-installable'));
  });

  window.addEventListener('error', (event) => {
    // Ignore harmless browser/extension warnings (e.g. extension accessing file:///, extension messaging, or forced layout notices)
    const msg = event.message || '';
    const filename = event.filename || '';
    if (
      msg.includes('may not load or link to file:///') ||
      msg.includes('Layout-Darstellung') ||
      msg.includes('Layout') ||
      msg.includes('ExtensionMessagingService') ||
      msg.includes('onMessage listener') ||
      filename.includes('moz-extension://') ||
      filename.includes('chrome-extension://')
    ) {
      return;
    }
    logClientError(msg, event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || '';
    const stack = event.reason?.stack || '';
    if (
      msg.includes('may not load or link to file:///') ||
      msg.includes('Layout-Darstellung') ||
      msg.includes('Layout') ||
      msg.includes('ExtensionMessagingService') ||
      msg.includes('onMessage listener') ||
      stack.includes('moz-extension://') ||
      stack.includes('chrome-extension://')
    ) {
      return;
    }
    logClientError(msg || 'Unhandled Promise Rejection', event.reason, {
      type: 'unhandledrejection',
    });
  });

  // Prevent iOS Safari gesture zoom (Pinch-to-zoom)
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  });

  // Prevent iOS double-tap to zoom
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );
}

// Select root component: Puppeteer report mode vs. full app
const puppeteerChildId = new URLSearchParams(window.location.search).get('puppeteerReport');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes fresh cache
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <ToastProvider>
              <PwaProvider>{puppeteerChildId ? <ReportPrintPage /> : <App />}</PwaProvider>
            </ToastProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
