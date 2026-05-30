import { formatVnd } from '../../../utils/format'

function formatValue(value, format) {
  if (format === 'vnd') return formatVnd(value)
  if (format === 'percent') return `${value}%`
  return new Intl.NumberFormat('vi-VN').format(value)
}

export default function KpiCard({ label, value, format = 'number', icon, trend }) {
  return (
    <div className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
            {label}
          </p>
          <p className="font-sora mt-2 truncate text-2xl font-semibold text-on-surface">
            {formatValue(value, format)}
          </p>
          {trend && (
            <p className="mt-1 text-xs text-primary">{trend}</p>
          )}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/30">
          <span className="material-symbols-outlined text-primary">{icon}</span>
        </div>
      </div>
    </div>
  )
}
