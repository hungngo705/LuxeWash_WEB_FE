import { useEffect, useMemo, useState } from 'react'

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function buildCalendarDays(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startWeekday; i++) {
    cells.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), d))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function formatTimeOfDay(timeStr) {
  if (!timeStr) return ''
  const s = String(timeStr)
  return s.length >= 5 ? s.slice(0, 5) : s
}

function ShiftCalendar({
  shifts,
  selectedDate,
  onSelectDate,
  title = 'Chọn ngày',
  helperText = '',
  emptyText = 'Chưa có ca',
  futureOnly = false,
  minDate = null,
  maxDate = null,
}) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const minBoundary = useMemo(() => (minDate ? startOfDay(minDate) : null), [minDate])
  const maxBoundary = useMemo(() => (maxDate ? startOfDay(maxDate) : null), [maxDate])

  const initialMonth = useMemo(() => {
    const base = selectedDate ? new Date(selectedDate) : new Date(today)
    return new Date(base.getFullYear(), base.getMonth(), 1)
  }, [selectedDate, today])
  const [monthDate, setMonthDate] = useState(initialMonth)

  useEffect(() => {
    setMonthDate(initialMonth)
  }, [initialMonth])

  const shiftsByDate = useMemo(() => {
    const map = new Map()
    for (const s of shifts) {
      const key = s.workDate ? toDateKey(new Date(s.workDate)) : ''
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(s)
    }
    return map
  }, [shifts])

  const cells = useMemo(() => buildCalendarDays(monthDate), [monthDate])
  const monthLabel = useMemo(
    () => `Tháng ${monthDate.getMonth() + 1}/${monthDate.getFullYear()}`,
    [monthDate],
  )

  const isSelectable = (date) => {
    if (!date) return false
    const d = startOfDay(date)
    if (futureOnly && d <= today) return false
    if (!futureOnly && d < today) return false
    if (minBoundary && d < minBoundary) return false
    if (maxBoundary && d > maxBoundary) return false
    return true
  }

  const goPrevMonth = () => {
    setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))
  }
  const goNextMonth = () => {
    setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))
  }

  const selectedKey = selectedDate ? toDateKey(new Date(selectedDate)) : ''

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-on-surface">{title}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrevMonth}
            className="rounded-md border border-outline-variant px-2 py-1 text-on-surface-variant hover:bg-surface-container"
            aria-label="Tháng trước"
          >
            ‹
          </button>
          <span className="px-2 text-sm font-medium text-on-surface">{monthLabel}</span>
          <button
            type="button"
            onClick={goNextMonth}
            className="rounded-md border border-outline-variant px-2 py-1 text-on-surface-variant hover:bg-surface-container"
            aria-label="Tháng sau"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-on-surface-variant">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="h-16" />
          }
          const key = toDateKey(date)
          const isToday = key === toDateKey(today)
          const isSelected = key === selectedKey
          const dayShifts = shiftsByDate.get(key) || []
          const selectable = isSelectable(date)

          return (
            <button
              key={key}
              type="button"
              disabled={!selectable}
              onClick={() => onSelectDate?.(date)}
              className={`flex h-16 flex-col items-stretch justify-between rounded-lg border p-1 text-left transition-colors ${
                isSelected
                  ? 'border-primary bg-primary-container text-on-primary-container'
                  : selectable
                  ? 'border-outline-variant bg-surface-container-lowest hover:border-primary hover:bg-primary-container/30'
                  : 'cursor-not-allowed border-outline-variant/60 bg-surface-container-low/40 text-on-surface-variant/40'
              }`}
              title={selectable ? '' : 'Không thể chọn ngày này'}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isToday ? 'rounded-full bg-primary px-1.5 text-on-primary' : ''}`}>
                  {date.getDate()}
                </span>
              </div>
              {dayShifts.length > 0 ? (
                <div className="space-y-0.5">
                  {dayShifts.slice(0, 2).map((s) => (
                    <div
                      key={s.shiftAssignmentId}
                      className="truncate rounded bg-primary/15 px-1 text-[10px] font-medium text-primary"
                      title={`${s.shiftName} ${formatTimeOfDay(s.startTime)}–${formatTimeOfDay(s.endTime)}`}
                    >
                      {s.shiftName} · {formatTimeOfDay(s.startTime)}
                    </div>
                  ))}
                  {dayShifts.length > 2 && (
                    <div className="text-[10px] text-on-surface-variant">+{dayShifts.length - 2}</div>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-on-surface-variant/60">{emptyText}</div>
              )}
            </button>
          )
        })}
      </div>

      {helperText && <p className="text-xs text-on-surface-variant">{helperText}</p>}
    </div>
  )
}

export default ShiftCalendar
