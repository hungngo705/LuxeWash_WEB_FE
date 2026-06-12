/**
 * Khung giờ trong ngày — hiển thị dạng "08:00 – 17:00"
 */
export default function TimeRangeField({
  label = 'Thời gian',
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  disabled = false,
  hint,
}) {
  return (
    <div className="block space-y-1">
      <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="time"
          className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
          value={startValue}
          disabled={disabled}
          onChange={(e) => onStartChange(e.target.value)}
        />
        <span className="shrink-0 text-sm font-medium text-on-surface-variant">–</span>
        <input
          type="time"
          className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
          value={endValue}
          disabled={disabled}
          onChange={(e) => onEndChange(e.target.value)}
        />
      </div>
      {hint && <p className="text-xs text-on-surface-variant">{hint}</p>}
    </div>
  )
}
