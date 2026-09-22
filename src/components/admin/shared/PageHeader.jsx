/**
 * LuxeWash Enterprise PageHeader
 *
 * - Eyebrow tag (small uppercase category)
 * - Title (sora, semibold)
 * - Description (muted)
 * - Primary action (filled-tonal)
 * - Optional secondary action
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  actionLabel,
  actionIcon = 'add',
  onAction,
  secondary,
}) {
  return (
    <div className="mb-6 border-b border-outline-variant/50 pb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 text-[11px] font-bold tracking-[0.12em] text-tertiary uppercase">
              {eyebrow}
            </p>
          )}
          <h1 className="font-sora text-2xl font-semibold tracking-tight text-on-surface">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-on-surface-variant">{description}</p>
          )}
        </div>

        {(actionLabel || secondary) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {secondary}
            {actionLabel && onAction && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-container px-4 py-2.5 text-sm font-semibold text-on-primary-container transition-all hover:bg-primary-container/80 active:scale-95"
                onClick={onAction}
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  {actionIcon}
                </span>
                {actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}