import { useId } from 'react'

/**
 * LuxeWash Enterprise Input
 *
 * Props:
 *   label        — uppercase eyebrow label
 *   required     — show red asterisk
 *   helper       — helper text under input
 *   error        — error message (overrides helper, error border)
 *   iconLeft/Right — Material Symbol icon names
 *   size: sm | md | lg
 */
export default function Input({
  label,
  required = false,
  helper,
  error,
  iconLeft,
  iconRight,
  size = 'md',
  className = '',
  id: idProp,
  ...rest
}) {
  const reactId = useId()
  const id = idProp || reactId

  const sizeClass = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-4 py-2.5 text-sm',
  }[size]

  const borderClass = error
    ? 'border-error focus-visible:border-error focus-visible:ring-error/40'
    : 'border-outline-variant focus-visible:border-primary focus-visible:ring-primary/40'

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="flex items-center gap-1 text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase"
        >
          <span>{label}</span>
          {required && <span className="text-error">*</span>}
        </label>
      )}
      <div
        className={`
          group flex items-center gap-2 rounded-lg border bg-white transition-all
          focus-within:ring-2 focus-within:ring-offset-2
          ${sizeClass}
          ${borderClass}
        `}
      >
        {iconLeft && (
          <span
            className="material-symbols-outlined shrink-0 text-[18px] text-on-surface-variant"
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            {iconLeft}
          </span>
        )}
        <input
          id={id}
          className="w-full bg-transparent text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          {...rest}
        />
        {iconRight && (
          <span
            className="material-symbols-outlined shrink-0 text-[18px] text-on-surface-variant"
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            {iconRight}
          </span>
        )}
      </div>
      {(error || helper) && (
        <p
          className={`text-xs ${error ? 'text-error' : 'text-on-surface-variant/80'}`}
        >
          {error || helper}
        </p>
      )}
    </div>
  )
}