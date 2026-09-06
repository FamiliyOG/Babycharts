/**
 * src/utils/sentryLoader.js
 *
 * Dynamically loads and initializes @sentry/react only when explicitly enabled (BC-294).
 * This keeps initial bundle size lean (~0 KB Sentry in main chunk when disabled).
 */

export async function initSentryIfEnabled() {
  if (typeof window === 'undefined') return;

  const sentryEnabled =
    import.meta.env.VITE_SENTRY_ENABLED === 'true' ||
    window.__BABYCHARTS_CONFIG__?.sentry_enabled === true;

  const sentryDsn = import.meta.env.VITE_SENTRY_DSN || window.__BABYCHARTS_CONFIG__?.sentry_dsn;

  if (!sentryEnabled || !sentryDsn || typeof sentryDsn !== 'string' || !sentryDsn.trim()) {
    return;
  }

  try {
    const Sentry = await import('@sentry/react');
    const replayEnabled =
      import.meta.env.VITE_SENTRY_REPLAY_ENABLED === 'true' ||
      window.__BABYCHARTS_CONFIG__?.sentry_replay_enabled === true;

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

    window.triggerSentryTest = () => {
      const testErr = new Error('BabyCharts Sentry Setup Verification Error');
      Sentry.captureException(testErr);
      console.log('Sentry test event dispatched to ingest endpoint!', testErr);
      return 'Test-Event gesendet! Bitte Sentry Dashboard prüfen.';
    };
  } catch (err) {
    console.warn('[Sentry] Dynamic import failed:', err);
  }
}
