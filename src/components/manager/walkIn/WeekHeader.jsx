import { useState } from 'react'
import { formatDayFull, getWeekDates } from '../../../utils/week'

/**
 * Header tuần với nút prev/today/next + hiển thị khoảng ngày.
 *
 * Props:
 *   - anchor: Date - bất kỳ ngày nào trong tuần đang xem
 *   - onChange(date): callback khi chuyển tuần, nhận Date thứ 2 của tuần mới
 *   - onToday(): callback về tuần hiện tại
 *   - enableDatePicker: bật ô chọn ngày + nút "Tới ngày" (mặc định false)
 *   - onJumpToDate(dateKey): callback nhận 'YYYY-MM-DD' khi user bấm "Tới ngày"
 *   - datePickerMax: 'YYYY-MM-DD' - giới hạn ngày tối đa (thường là hôm nay)
 *   - datePickerMin: 'YYYY-MM-DD' - giới hạn ngày tối thiểu (optional)
 */
export default function WeekHeader({
  anchor,
  onChange,
  onToday,
  enableDatePicker = false,
  onJumpToDate,
  datePickerMax,
  datePickerMin,
}) {
  const dates = getWeekDates(anchor)
  const start = dates[0]
  const end = dates[6]
  const [datePickerValue, setDatePickerValue] = useState(() =>
    formatDateInputValue(new Date()),
  )

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

  const handleJump = () => {
    if (!datePickerValue) return
    onJumpToDate?.(datePickerValue)
  }

  const handleJumpKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleJump()
    }
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

      <div className="flex flex-wrap items-center gap-2">
        {enableDatePicker && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={datePickerValue}
              min={datePickerMin}
              max={datePickerMax}
              onChange={(e) => setDatePickerValue(e.target.value)}
              onKeyDown={handleJumpKey}
              className="h-9 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus:border-primary focus:outline-none"
              aria-label="Chọn ngày để nhảy tới"
            />
            <button
              type="button"
              onClick={handleJump}
              disabled={!datePickerValue}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-secondary px-3 text-sm font-medium text-on-secondary transition-colors hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                className="material-symbols-outlined text-[16px]"
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                event
              </span>
              Tới ngày
            </button>
          </div>
        )}

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

/**
 * Trả về 'YYYY-MM-DD' cho Date ở local time (dùng cho <input type="date">).
 */
function formatDateInputValue(date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
