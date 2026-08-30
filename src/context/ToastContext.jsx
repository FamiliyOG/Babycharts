import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ message, type = 'info', duration = 4000 }) => {
      toastCounter += 1;
      const id = `toast-${Date.now()}-${toastCounter}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const showSuccess = useCallback(
    (msg, duration) => addToast({ message: msg, type: 'success', duration }),
    [addToast]
  );
  const showError = useCallback(
    (msg, duration) => addToast({ message: msg, type: 'error', duration: duration ?? 6000 }),
    [addToast]
  );
  const showInfo = useCallback(
    (msg, duration) => addToast({ message: msg, type: 'info', duration }),
    [addToast]
  );

  const value = useMemo(
    () => ({ addToast, removeToast, showSuccess, showError, showInfo }),
    [addToast, removeToast, showSuccess, showError, showInfo]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Notification Container (WCAG-compliant aria-live region) */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          const typeStyles = {
            success: 'bg-emerald-900/90 border-emerald-700 text-emerald-100 shadow-emerald-950/50',
            error: 'bg-rose-900/90 border-rose-700 text-rose-100 shadow-rose-950/50',
            info: 'bg-slate-900/90 border-slate-700 text-slate-100 shadow-slate-950/50',
          };
          const Icon =
            toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertCircle : Info;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl border backdrop-blur-md shadow-lg transition-all transform animate-in slide-in-from-bottom-2 ${
                typeStyles[toast.type] || typeStyles.info
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-5 h-5 shrink-0 opacity-90" />
                <p className="text-xs font-medium truncate">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-white/60 hover:text-white transition p-1 rounded-lg hover:bg-white/10 shrink-0"
                aria-label="Schließen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
