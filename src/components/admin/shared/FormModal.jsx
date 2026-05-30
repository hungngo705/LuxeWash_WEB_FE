export default function FormModal({
  open,
  title,
  children,
  submitLabel = 'Lưu',
  onClose,
  onSubmit,
  size = 'md',
}) {
  if (!open) return null

  const sizeClass = size === 'lg' ? 'max-w-2xl' : 'max-w-lg'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        className={`glass-panel soft-shadow relative flex max-h-[90vh] w-full flex-col rounded-xl border border-outline-variant bg-surface-container-lowest ${sizeClass}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-6 py-4">
          <h3 className="font-sora text-lg font-semibold text-on-surface">{title}</h3>
          <button
            type="button"
            className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface"
            onClick={onClose}
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
          <div className="overflow-y-auto px-6 py-4">{children}</div>
          <div className="flex shrink-0 justify-end gap-3 border-t border-outline-variant px-6 py-4">
            <button
              type="button"
              className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-variant"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
