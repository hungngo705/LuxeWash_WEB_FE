import { formatDayFull, getWeekDates } from '../../../utils/week'

/**
 * Header tuần với nút prev/today/next + hiển thị khoảng ngày.
 *
 * Props:
 *   - anchor: Date - bất kỳ ngày nào trong tuần đang xem
 *   - onChange(date): callback khi chuyển tuần, nhận Date thứ 2 của tuần mới
 *   - onToday(): callback về tuần hiện tại
 */
export default function WeekHeader({ anchor, onChange, onToday }) {
  const dates = getWeekDates(anchor)
  const start = dates[0]
  const end = dates[6]

  const handlePrev = () => {
    const newMonday = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() - 7,
    )
    onChange?.(newMonday)
  }

  const handleNext = () => {
    const newMonday = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + 7,
    )
    onChange?.(newMonday)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
          Lịch tuần
        </p>
        <h2 className="font-sora text-xl font-semibold text-on-surface">
          Tuần {formatDayFull(start)} – {formatDayFull(end)}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrev}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface transition-colors hover:bg-surface-container"
          aria-label="Tuần trước"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>

        <button
          type="button"
          onClick={onToday}
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
        >
          Hôm nay
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface transition-colors hover:bg-surface-container"
          aria-label="Tuần sau"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  )
}
