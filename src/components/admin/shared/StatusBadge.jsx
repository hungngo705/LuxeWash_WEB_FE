const STATUS_STYLES = {
  Active: 'bg-primary-container/30 text-primary border-primary/30',
  Blocked: 'bg-error-container/30 text-error border-error/30',
  Pending: 'bg-tertiary-container/40 text-on-tertiary-container border-tertiary/30',
  Completed: 'bg-primary-container/30 text-primary border-primary/30',
  'Checked-in': 'bg-secondary-container/40 text-on-secondary-container border-secondary/30',
  Cancelled: 'bg-surface-variant text-on-surface-variant border-outline-variant',
  Expired: 'bg-surface-variant text-on-surface-variant border-outline-variant',
  Success: 'bg-primary-container/30 text-primary border-primary/30',
  Failed: 'bg-error-container/30 text-error border-error/30',
  Earn: 'bg-primary-container/30 text-primary border-primary/30',
  Redeem: 'bg-tertiary-container/40 text-on-tertiary-container border-tertiary/30',
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? 'bg-surface-variant text-on-surface-variant border-outline-variant'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ${style}`}
    >
      {status}
    </span>
  )
}
