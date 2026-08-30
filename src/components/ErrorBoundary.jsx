import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, resetError: this.resetError });
      }
      return (
        <ErrorFallbackView
          error={this.state.error}
          resetError={this.resetError}
          isWidget={this.props.isWidget}
        />
      );
    }
    return this.props.children;
  }
}

function ErrorFallbackView({ error, resetError, isWidget = false }) {
  const { t } = useTranslation();

  if (isWidget) {
    return (
      <div
        className="p-6 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-center my-4"
        role="alert"
      >
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h4 className="font-semibold text-rose-900 dark:text-rose-200 mb-1">
          {t('common.widgetErrorTitle') || 'Bereich konnte nicht geladen werden'}
        </h4>
        <p className="text-xs text-rose-700 dark:text-rose-300/80 mb-3">
          {error?.message || t('common.genericError') || 'Ein unerwarteter Fehler ist aufgetreten.'}
        </p>
        <button
          type="button"
          onClick={resetError}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('common.retry') || 'Erneut versuchen'}
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-100 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 m-4"
      role="alert"
    >
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          {t('common.appErrorTitle') || 'Ups, etwas ist schiefgelaufen'}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {t('common.appErrorDescription') ||
            'Die Anwendung hat einen unerwarteten Fehler festgestellt. Bitte versuchen Sie, die Ansicht neu zu laden.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={resetError}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.retry') || 'Wiederholen'}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition"
          >
            {t('common.reloadPage') || 'Seite neu laden'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children, fallback, isWidget = false }) {
  return (
    <ErrorBoundaryClass fallback={fallback} isWidget={isWidget}>
      {children}
    </ErrorBoundaryClass>
  );
}
