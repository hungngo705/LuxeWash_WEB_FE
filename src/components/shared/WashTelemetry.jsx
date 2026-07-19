import { formatDateTime, formatWashDuration, getElapsedWashMinutes } from '../../utils/format'

function getWashDurationMinutes(booking) {
  const explicit = Number(booking?.actualDurationMinutes)
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  return getElapsedWashMinutes(booking?.processingStartTime, booking?.completedTime)
}

export function WashDurationBadge({ booking, className = '' }) {
  const duration = getWashDurationMinutes(booking)
  const isLive = Boolean(booking?.processingStartTime && !booking?.completedTime)

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface px-2 py-1 text-xs font-medium text-on-surface ${className}`}
      title={isLive ? 'Thời gian rửa đang chạy' : 'Thời lượng rửa thực tế'}
    >
      <span className="material-symbols-outlined text-[14px]">timer</span>
      {isLive ? `Đang rửa ${formatWashDuration(duration)}` : formatWashDuration(duration)}
    </span>
  )
}

export default function WashTelemetry({ booking, compact = false, className = '' }) {
  const hasTelemetry =
    booking?.processingStartTime || booking?.completedTime || booking?.actualDurationMinutes

  if (!hasTelemetry) {
    return (
      <div className={`text-xs text-on-surface-variant ${className}`}>
        Chưa có thời gian rửa
      </div>
    )
  }

  const rows = [
    ['Bắt đầu', formatDateTime(booking.processingStartTime)],
    ['Hoàn thành', formatDateTime(booking.completedTime)],
  ]

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <WashDurationBadge booking={booking} />
        {booking.processingStartTime ? (
          <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            {formatDateTime(booking.processingStartTime)}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-outline-variant bg-surface p-3 ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Thời gian rửa
        </div>
        <WashDurationBadge booking={booking} />
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="text-xs text-on-surface-variant">{label}</div>
            <div className="font-medium text-on-surface">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
