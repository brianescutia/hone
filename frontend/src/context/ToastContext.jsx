import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const confirmResolveRef = useRef(null);

  const dismiss = useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (variant, message, opts = {}) => {
      const id = nextId++;
      const duration = opts.duration ?? (variant === 'error' ? 7000 : 4000);
      setToasts((ts) => [...ts, { id, variant, message }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = useRef({
    success: (m, o) => show('success', m, o),
    error: (m, o) => show('error', m, o),
    info: (m, o) => show('info', m, o),
  }).current;

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState({
        title: opts.title || 'Are you sure?',
        message: opts.message || '',
        confirmLabel: opts.confirmLabel || 'Confirm',
        cancelLabel: opts.cancelLabel || 'Cancel',
        destructive: !!opts.destructive,
      });
    });
  }, []);

  const closeConfirm = useCallback((answer) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(answer);
      confirmResolveRef.current = null;
    }
    setConfirmState(null);
  }, []);

  // Esc closes the modal
  useEffect(() => {
    if (!confirmState) return;
    const onKey = (e) => e.key === 'Escape' && closeConfirm(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmState, closeConfirm]);

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toasts */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9000] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-auto pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-2xl shadow-lg px-4 py-3 text-sm border flex items-start gap-2 ${
              t.variant === 'success'
                ? 'bg-sage-100 border-sage-300 text-ink-900'
                : t.variant === 'error'
                ? 'bg-red-50 border-red-300 text-red-900'
                : 'bg-sky-100 border-sky-300 text-ink-900'
            }`}
          >
            <span className="mt-0.5">
              {t.variant === 'success' ? '✓' : t.variant === 'error' ? '!' : 'i'}
            </span>
            <div className="flex-1">{t.message}</div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-ink-500 hover:text-ink-900 px-1"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[9100] grid place-items-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && closeConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <h3 className="font-semibold text-lg">{confirmState.title}</h3>
            {confirmState.message && (
              <p className="text-sm text-ink-700 mt-2">{confirmState.message}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => closeConfirm(false)} className="btn-ghost">
                {confirmState.cancelLabel}
              </button>
              <button
                onClick={() => closeConfirm(true)}
                className={
                  confirmState.destructive
                    ? 'btn bg-red-500 text-white hover:bg-red-600'
                    : 'btn-primary'
                }
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
