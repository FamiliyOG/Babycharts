import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n/index.js';
import App from './App.jsx';
import ReportPrintPage from './components/ReportPrintPage.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { logClientError } from './utils/api.js';

// Global Client Error Catchers & iOS PWA Pinch/Double-Tap Zoom Protection
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default mini-infobar and save prompt event globally
    e.preventDefault();
    window.deferredPrompt = e;
    window.dispatchEvent(new Event('pwa-installable'));
  });

  window.addEventListener('error', (event) => {
    logClientError(event.message, event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logClientError(event.reason?.message || 'Unhandled Promise Rejection', event.reason, {
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>{puppeteerChildId ? <ReportPrintPage /> : <App />}</ThemeProvider>
  </StrictMode>
);

// Unregister stale service worker to guarantee fresh assets
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    } catch {
      // ignore
    }
  }

  if ('caches' in window) {
    try {
      const names = await caches.keys();
      for (const name of names) {
        await caches.delete(name);
      }
    } catch {
      // ignore
    }
  }
}
