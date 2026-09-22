import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

let toastIdCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    )
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 260)
  }, [])

  const addToast = useCallback(
    (message, variant = 'info', duration = 4000) => {
      const id = ++toastIdCounter
      setToasts((prev) => [...prev, { id, message, variant, exiting: false }])
      timers.current[id] = setTimeout(() => removeToast(id), duration)
      return id
    },
    [removeToast],
  )

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    warning: (msg) => addToast(msg, 'warning'),
    info: (msg) => addToast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  // Fallback noop when ToastProvider is not mounted — keeps the page
  // from white-screening if a component renders outside the provider.
  if (!ctx) {
    return {
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
    }
  }
  return ctx
}

/* ── Internal ── */

const ICONS = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
}

const VARIANT_CLASSES = {
  success: 'lw-toast-success',
  error: 'lw-toast-error',
  warning: 'lw-toast-warning',
  info: 'lw-toast-info',
}

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lw-lg
            ${VARIANT_CLASSES[t.variant]}
            ${t.exiting ? 'lw-toast-exit' : 'lw-toast-enter'}
          `}
          role="alert"
        >
          <span
            className="material-symbols-outlined mt-0.5 shrink-0 text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {ICONS[t.variant]}
          </span>
          <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
          <button
            type="button"
            className="mt-0.5 shrink-0 rounded p-0.5 transition-colors hover:bg-black/10"
            onClick={() => onDismiss(t.id)}
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ))}
    </div>
  )
}
