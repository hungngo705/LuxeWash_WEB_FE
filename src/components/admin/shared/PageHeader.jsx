export default function PageHeader({ title, description, actionLabel, actionIcon = 'add', onAction }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-sora text-2xl font-semibold text-on-surface">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-on-surface-variant">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-container px-4 py-2.5 text-sm font-semibold text-on-primary-container transition-transform active:scale-95"
          onClick={onAction}
        >
          <span className="material-symbols-outlined text-[20px]">{actionIcon}</span>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
