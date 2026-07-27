import {
  getLaneAssignmentState,
  getLaneDisplayName,
} from '../../utils/laneAssignment'

const STYLES = {
  payment: {
    icon: 'payments',
    label: 'Chờ thanh toán',
    className: 'border-tertiary-container/40 bg-tertiary-container/15 text-tertiary-container',
  },
  waiting: {
    icon: 'hourglass_top',
    label: 'Chờ làn trống',
    className: 'border-outline-variant bg-surface-container-high text-on-surface-variant',
  },
  assigned: {
    icon: 'garage',
    className: 'border-primary/35 bg-primary/10 text-primary',
  },
  processing: {
    icon: 'wash',
    className: 'border-secondary/35 bg-secondary/10 text-secondary',
  },
  pending: {
    icon: 'schedule',
    label: 'Chờ check-in',
    className: 'border-tertiary-container/40 bg-tertiary-container/15 text-tertiary-container',
  },
  unknown: {
    icon: 'help',
    label: 'Chưa xác định',
    className: 'border-outline-variant bg-surface-container-high text-on-surface-variant',
  },
}

export default function LaneAssignmentBadge({ booking, className = '' }) {
  const state = getLaneAssignmentState(booking)
  const style = STYLES[state] ?? STYLES.unknown
  const laneName = getLaneDisplayName(booking)
  const label =
    style.label ??
    (state === 'processing' ? `Đang rửa · ${laneName}` : laneName)

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${style.className} ${className}`}
    >
      <span className="material-symbols-outlined text-[15px]">{style.icon}</span>
      {label}
    </span>
  )
}
