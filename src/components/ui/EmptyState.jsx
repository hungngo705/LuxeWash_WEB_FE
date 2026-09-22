/**
 * LuxeWash Enterprise EmptyState
 *
 * size: compact | full
 * action: { label, onClick, icon? }
 */
export default function EmptyState({
  icon = 'inbox',
  title = 'Không có dữ liệu',
  message,
  size = 'full',
  action,
  className = '',
}) {
  const containerClass =
    size === 'compact'
      ? 'flex flex-col items-center justify-center rounded-xl border border-outline-variant/60 bg-white px-6 py-10 text-center'
      : 'flex flex-col items-center justify-center rounded-xl border border-outline-variant/60 bg-white px-6 py-16 text-center shadow-lw-sm'

  const iconSize = size === 'compact' ? 'text-4xl' : 'text-5xl'
  const titleSize = size === 'compact' ? 'text-base' : 'text-lg'

  return (
    <div className={`${containerClass} ${className}`}>
      <span
        className={`material-symbols-outlined mb-4 text-on-surface-variant/40 ${iconSize}`}
        style={{ fontVariationSettings: "'FILL' 0" }}
      >
        {icon}
      </span>
      <p className={`font-sora font-semibold text-on-surface ${titleSize}`}>{title}</p>
      {message && (
        <p className="mt-1.5 max-w-md text-sm text-on-surface-variant/80">{message}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary-container transition-all hover:bg-primary-container/80 active:scale-95"
        >
          {action.icon && (
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 0" }}
            >
              {action.icon}
            </span>
          )}
          {action.label}
        </button>
      )}
    </div>
  )
}