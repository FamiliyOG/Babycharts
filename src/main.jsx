import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initSentryIfEnabled } from './utils/sentryLoader.js';
import './index.css';
import './i18n/index.js';
import App from './App.jsx';
import ReportPrintPage from './components/ReportPrintPage.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { PwaProvider } from './context/PwaContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { logClientError } from './utils/api.js';
import { cleanupLegacyTokens } from './utils/legacyTokenCleanup.js';

// Migrate any legacy JWT tokens stored in localStorage (Issue #256)
cleanupLegacyTokens();

// Sentry error tracking is opt-in and dynamically loaded only when enabled (Issue #232, BC-294)
initSentryIfEnabled();

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
