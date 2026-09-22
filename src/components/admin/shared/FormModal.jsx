import { useEffect, useState } from 'react'

/**
 * LuxeWash Enterprise FormModal
 *
 * - Backdrop fade-in (200ms) + panel fade-scale (280ms ease-out-expo)
 * - Close animation on exit (200ms)
 * - ESC key to close
 * - Sizes: sm | md | lg | xl
 */
export default function FormModal({
  open,
  title,
  children,
  submitLabel = 'Lưu',
  submitting = false,
  onClose,
  onSubmit,
  size = 'md',
}) {
  const [phase, setPhase] = useState('closed') // 'closed' | 'opening' | 'open' | 'closing'

  useEffect(() => {
    if (open) {
      setPhase('opening')
      const t = setTimeout(() => setPhase('open'), 30)
      return () => clearTimeout(t)
    }
    setPhase('closed')
    return undefined
  }, [open])

  useEffect(() => {
    if (!open || submitting) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, submitting, onClose])

  if (phase === 'closed') return null

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size] ?? 'max-w-lg'

  const backdropClass = phase === 'closing' ? 'lw-backdrop-exit' : 'lw-backdrop-enter'
  const panelClass = phase === 'closing' ? 'lw-panel-exit' : 'lw-panel-enter'

  const handleClose = () => {
    if (submitting) return
    setPhase('closing')
    setTimeout(() => {
      onClose?.()
      setPhase('closed')
    }, 220)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${backdropClass}`}
        aria-label="Đóng"
        disabled={submitting}
        onClick={handleClose}
      />
      <div
        className={`relative flex max-h-[90vh] w-full flex-col rounded-xl border border-outline-variant bg-white shadow-lw-xl ${sizeClass} ${panelClass}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-6 py-4">
          <h3 className="font-sora text-lg font-semibold text-on-surface">{title}</h3>
          <button
            type="button"
            className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting}
            onClick={handleClose}
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit?.(e)
          }}
        >
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          <div className="flex shrink-0 justify-end gap-3 border-t border-outline-variant px-6 py-4">
            <button
              type="button"
              className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              onClick={handleClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-wait disabled:opacity-70"
              disabled={submitting}
            >
              {submitting && (
                <span
                  className="material-symbols-outlined lw-spin text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  progress_activity
                </span>
              )}
              {submitting ? 'Đang lưu…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}