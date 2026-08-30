/**
 * LuxeWash Enterprise Button
 *
 * variants: primary | secondary | ghost | danger-outline | filled-tonal
 * sizes: sm | md | lg
 * loading: shows spinner + disables interaction
 * iconLeft / iconRight: Material Symbol names
 */

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  className = '',
  type = 'button',
  onClick,
  ...rest
}) {
  const isDisabled = disabled || loading

  const baseClass =
    'inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-all duration-200 active:scale-95 select-none'

  const sizeClass = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-sm',
  }[size]

  const variantClass = {
    primary:
      'bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm',
    secondary:
      'border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-variant focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    ghost:
      'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    'danger-outline':
      'border border-error/50 text-error hover:bg-error-container/20 focus-visible:ring-2 focus-visible:ring-error/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    'filled-tonal':
      'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  }[variant]

  return (
    <button
      type={type}
      className={`${baseClass} ${sizeClass} ${variantClass} ${className}`}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      {...rest}
    >
      {loading ? (
        <>
          <span className="material-symbols-outlined lw-spin text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            progress_activity
          </span>
          <span>{children}</span>
        </>
      ) : (
        <>
          {iconLeft && (
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 0" }}>
              {iconLeft}
            </span>
          )}
          <span>{children}</span>
          {iconRight && (
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 0" }}>
              {iconRight}
            </span>
          )}
        </>
      )}
    </button>
  )
}
