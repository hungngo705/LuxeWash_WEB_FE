import { useEffect, useState } from 'react'

/**
 * LuxeWash Enterprise ConfirmDialog
 *
 * - Backdrop fade + panel fade-scale animation
 * - ESC key to cancel
 * - Danger variant shows warning icon
 */
export default function ConfirmDialog({
  open,
  title = 'Xác nhận',
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const [phase, setPhase] = useState('closed')

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
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) handleCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading])

  if (phase === 'closed') return null

  const handleCancel = () => {
    if (loading) return
    setPhase('closing')
    setTimeout(() => {
      onCancel?.()
      setPhase('closed')
    }, 220)
  }

  const handleConfirm = () => {
    if (loading) return
    setPhase('closing')
    setTimeout(() => {
      onConfirm?.()
      setPhase('closed')
    }, 220)
  }

  const confirmClass =
    variant === 'danger'
      ? 'bg-error text-on-error hover:bg-error/90'
      : 'bg-primary text-on-primary hover:bg-primary/90'

  const backdropClass = phase === 'closing' ? 'lw-backdrop-exit' : 'lw-backdrop-enter'
  const panelClass = phase === 'closing' ? 'lw-panel-exit' : 'lw-panel-enter'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${backdropClass}`}
        aria-label="Đóng"
        onClick={handleCancel}
      />
      <div
        className={`relative w-full max-w-md rounded-xl border border-outline-variant bg-white p-6 shadow-lw-xl ${panelClass}`}
      >
        <div className="flex items-start gap-4">
          {variant === 'danger' && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-container/40">
              <span
                className="material-symbols-outlined text-[22px] text-error"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                warning
              </span>
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-sora text-lg font-semibold text-on-surface">{title}</h3>
            {message && (
              <div className="mt-1.5 text-sm text-on-surface-variant">{message}</div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={handleCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 disabled:cursor-wait disabled:opacity-70 ${confirmClass}`}
            disabled={loading}
            onClick={handleConfirm}
          >
            {loading && (
              <span
                className="material-symbols-outlined lw-spin text-[16px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                progress_activity
              </span>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}