import { useMemo } from 'react'
import {
  classifySlotTime,
  formatDayShort,
  getNowInVietnam,
  getWeekdayLabel,
  isSameDay,
  parseTimeOfDay,
} from '../../../utils/week'

const ACTIVE_STATUSES = new Set(['Pending', 'CheckedIn', 'Processing'])

/**
 * Helper parse 'HH:MM:SS' hoặc 'HH:MM' thành label ngắn 'HH:MM'.
 */
function shortTime(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

/**
 * Lấy các booking thuộc (date, slot) - chỉ status active.
 *
 * Hạn chế BE: ManagerBookingListDTO không trả CapacityWeight, nên ước lượng
 * used = số booking (mặc định BaseWeight=1). BE vẫn validate capacity khi tạo
 * walk-in nên kết quả thực tế không bị ảnh hưởng.
 *
 * @param {Date} date
 * @param {{ slotId: number, startTime: string, endTime: string }} slot
 * @param {Array} bookings
 */
function getBookingsForCell(date, slot, bookings) {
  const start = parseTimeOfDay(slot.startTime)
  const end = parseTimeOfDay(slot.endTime)
  if (!start || !end) return []

  const dayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
  )
  const dayEnd = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
    0,
    0,
    0,
  )

  return bookings.filter((b) => {
    if (!b?.scheduledTime) return false
    if (!ACTIVE_STATUSES.has(b.status)) return false
    const t = new Date(b.scheduledTime)
    if (Number.isNaN(t.getTime())) return false
    if (t < dayStart || t >= dayEnd) return false

    const h = t.getHours()
    const m = t.getMinutes()
    const minutes = h * 60 + m
    const startMin = start.hours * 60 + start.minutes
    const endMin = end.hours * 60 + end.minutes
    return minutes >= startMin && minutes < endMin
  })
}

/**
 * WeeklyScheduleGrid - lịch tuần T2-CN hiển thị các khung giờ của chi nhánh.
 *
 * Props:
 *   - weekDates: Date[] - 7 ngày T2..CN
 *   - slots: ManagerTimeSlot[] - khung giờ của chi nhánh
 *   - bookings: ManagerBooking[] - booking active (Pending/CheckedIn/Processing)
 *   - lanes: ManagerLane[] - làn rửa của chi nhánh
 *   - onCellClick(payload): callback khi click 1 ô
 *      payload: { date, slot, cellState: 'current-empty' | 'current-full' | 'future' | 'past', bookings }
 *
 * State hiển thị mỗi ô:
 *   - current + empty: viền xanh primary, hover sáng
 *   - current + full: viền đỏ, cursor not-allowed
 *   - future: viền outline, hover sáng
 *   - past: nền xám, opacity-60
 */
export default function WeeklyScheduleGrid({
  weekDates,
  slots,
  bookings,
  lanes,
  onCellClick,
}) {
  const today = useMemo(() => getNowInVietnam(), [])
  const totalLanes = lanes.length

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest py-16 text-center">
        <span className="material-symbols-outlined text-4xl text-outline">schedule</span>
        <p className="mt-3 text-sm font-semibold text-on-surface">
          Chưa có khung giờ
        </p>
        <p className="mt-1 text-xs text-on-surface-variant">
          Tạo khung giờ ở trang "Khung giờ" trước khi xem lịch tuần.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
      <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: '140px' }} />
          {weekDates.map((_, i) => (
            <col key={i} style={{ width: 'auto' }} />
          ))}
        </colgroup>

        <thead>
          <tr className="bg-surface-container">
            <th className="sticky left-0 z-10 border-b border-r border-outline-variant bg-surface-container px-3 py-3 text-left text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
              Khung giờ
            </th>
            {weekDates.map((date, idx) => {
              const isToday = isSameDay(date, today)
              const label = getWeekdayLabel(idx)
              return (
                <th
                  key={idx}
                  className={`border-b border-outline-variant px-2 py-3 text-center align-bottom ${
                    isToday ? 'bg-primary-container/30' : ''
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`text-[11px] font-semibold tracking-wider uppercase ${
                        isToday ? 'text-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      {label.short}
                    </span>
                    <span
                      className={`text-base font-semibold ${
                        isToday ? 'text-primary' : 'text-on-surface'
                      }`}
                    >
                      {formatDayShort(date)}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold tracking-wider text-on-primary uppercase">
                        Hôm nay
                      </span>
                    )}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {slots.map((slot) => {
            const slotLabel = `${shortTime(slot.startTime)} – ${shortTime(slot.endTime)}`
            return (
              <tr key={slot.slotId} className="border-b border-outline-variant/40 last:border-b-0">
                <th className="sticky left-0 z-10 border-r border-outline-variant bg-surface-container-lowest px-3 py-3 text-left align-top">
                  <div className="flex flex-col">
                    <span className="font-mono text-sm font-semibold text-on-surface">
                      {slotLabel}
                    </span>
                    <span className="mt-1 text-[11px] text-on-surface-variant">
                      Max: {slot.maxCapacity}
                    </span>
                  </div>
                </th>

                {weekDates.map((date, dateIdx) => {
                  const cellBookings = getBookingsForCell(date, slot, bookings)
                  const used = cellBookings.length
                  const max = Number(slot.maxCapacity) || 0
                  const busyLaneIds = new Set(
                    cellBookings
                      .map((b) => b.processingLaneId)
                      .filter((id) => id != null && id > 0),
                  )
                  const busyLanes = busyLaneIds.size

                  const timeState = classifySlotTime(date, slot)
                  const isFull = max > 0 && used >= max
                  const isPast = timeState === 'past'
                  const isCurrent = timeState === 'current'
                  const isFuture = timeState === 'future'

                  // Style theo trạng thái
                  let cellClass =
                    'border-r border-outline-variant/40 last:border-r-0 align-top px-2 py-2'
                  let buttonClass =
                    'flex h-[88px] w-full flex-col gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors'

                  if (isPast) {
                    buttonClass +=
                      ' cursor-not-allowed border-outline-variant/40 bg-surface-container-low opacity-60'
                  } else if (isCurrent && isFull) {
                    buttonClass +=
                      ' cursor-not-allowed border-error/40 bg-error-container/20 hover:bg-error-container/30'
                  } else if (isCurrent) {
                    buttonClass +=
                      ' cursor-pointer border-primary bg-primary-container/15 hover:border-primary hover:bg-primary-container/30'
                  } else if (isFuture) {
                    buttonClass +=
                      ' cursor-pointer border-outline-variant bg-white hover:border-secondary hover:bg-secondary-container/15'
                  }

                  return (
                    <td key={dateIdx} className={cellClass}>
                      <button
                        type="button"
                        className={buttonClass}
                        disabled={isPast || (isCurrent && isFull)}
                        onClick={() =>
                          onCellClick?.({
                            date,
                            slot,
                            cellState: isPast
                              ? 'past'
                              : isCurrent
                                ? isFull
                                  ? 'current-full'
                                  : 'current-empty'
                                : 'future',
                            bookings: cellBookings,
                            busyLanes,
                            totalLanes,
                            used,
                            max,
                          })
                        }
                        aria-label={`${slotLabel} ngày ${formatDayShort(date)}, ${used}/${max} booking, ${busyLanes}/${totalLanes} làn`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                          <span
                            className={
                              isCurrent && isFull
                                ? 'text-error'
                                : isCurrent
                                  ? 'text-primary'
                                  : 'text-on-surface'
                            }
                          >
                            {used}/{max}
                          </span>
                          <span
                            className={
                              isCurrent && isFull
                                ? 'text-error/80'
                                : 'text-on-surface-variant'
                            }
                          >
                            {busyLanes}/{totalLanes} làn
                          </span>
                        </div>

                        {cellBookings.length === 0 ? (
                          <div className="flex flex-1 items-center justify-center">
                            <span className="text-[11px] italic text-on-surface-variant/60">
                              Trống
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                            {cellBookings.slice(0, 2).map((b) => (
                              <span
                                key={b.bookingId}
                                className="truncate rounded bg-secondary-container/40 px-1.5 py-0.5 text-[10px] font-medium text-on-secondary-container"
                                title={`${b.licensePlate} • ${b.status}`}
                              >
                                {b.licensePlate}
                              </span>
                            ))}
                            {cellBookings.length > 2 && (
                              <span className="text-[10px] text-on-surface-variant">
                                +{cellBookings.length - 2} nữa
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
