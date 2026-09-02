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

// Sentry error tracking is opt-in and disabled by default (Issue #232)
const sentryEnabled =
  import.meta.env.VITE_SENTRY_ENABLED === 'true' ||
  (typeof window !== 'undefined' && window.__BABYCHARTS_CONFIG__?.sentry_enabled === true);

const sentryDsn =
  import.meta.env.VITE_SENTRY_DSN ||
  (typeof window !== 'undefined' && window.__BABYCHARTS_CONFIG__?.sentry_dsn);

if (sentryEnabled && sentryDsn && typeof sentryDsn === 'string' && sentryDsn.trim()) {
  const replayEnabled =
    import.meta.env.VITE_SENTRY_REPLAY_ENABLED === 'true' ||
    (typeof window !== 'undefined' && window.__BABYCHARTS_CONFIG__?.sentry_replay_enabled === true);

  Sentry.init({
    dsn: sentryDsn.trim(),
    environment: import.meta.env.MODE || 'production',
    integrations: [
      Sentry.browserTracingIntegration(),
      ...(replayEnabled ? [Sentry.replayIntegration()] : []),
    ],
    tracesSampleRate: 0.1,
    tracePropagationTargets: ['localhost', /^\/api\//],
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: replayEnabled ? 1.0 : 0.0,
    sendDefaultPii: false,
    ignoreErrors: [
      'ExtensionMessagingService',
      'onMessage listener',
      'rc2Contentscript',
      'scrollHeight',
      'installHook.js',
      'react_devtools',
      'may not load or link to file:///',
      'Layout-Darstellung wurde erzwungen',
    ],
    beforeSend(event, hint) {
      const error = hint?.originalException;
      const errorMessage = (error?.message || event?.message || '').toLowerCase();
      const stack = (error?.stack || '').toLowerCase();
      const url = (event?.request?.url || '').toLowerCase();

      // Block known browser extension noise and devtools sourcemap glitches
      if (
        errorMessage.includes('extensionmessagingservice') ||
        errorMessage.includes('onmessage listener') ||
        errorMessage.includes('rc2contentscript') ||
        errorMessage.includes('scrollheight') ||
        errorMessage.includes('installhook') ||
        stack.includes('moz-extension://') ||
        stack.includes('chrome-extension://') ||
        stack.includes('rc2contentscript') ||
        url.includes('installhook.js')
      ) {
        return null;
      }
      return event;
    },
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

// Global Client Error Catchers & PWA Prompts
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default mini-infobar and save prompt event globally
    e.preventDefault();
    window.deferredPrompt = e;
    window.dispatchEvent(new Event('pwa-installable'));
  });

  window.addEventListener('error', (event) => {
    const msg = (event?.message || '').toString();
    const stack = (event?.error?.stack || '').toString();
    if (
      msg.includes('ExtensionMessagingService') ||
      msg.includes('onMessage listener') ||
      msg.includes('rc2Contentscript') ||
      msg.includes('scrollHeight') ||
      stack.includes('moz-extension://') ||
      stack.includes('chrome-extension://') ||
      stack.includes('rc2Contentscript')
    ) {
      return;
    }
    logClientError(msg || 'Uncaught JavaScript Error', event.error || event.filename, {
      type: 'uncaught_error',
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const msg = (event?.reason?.message || event?.reason || '').toString();
    const stack = (event?.reason?.stack || '').toString();
    if (
      msg.includes('ExtensionMessagingService') ||
      msg.includes('onMessage listener') ||
      msg.includes('rc2Contentscript') ||
      msg.includes('scrollHeight') ||
      stack.includes('moz-extension://') ||
      stack.includes('chrome-extension://') ||
      stack.includes('rc2Contentscript')
    ) {
      return;
    }
    logClientError(msg || 'Unhandled Promise Rejection', event.reason, {
      type: 'unhandledrejection',
    });
  });
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
