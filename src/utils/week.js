/**
 * Helpers cho lịch tuần walk-in Manager.
 *
 * Quy ước tuần: Thứ 2 là ngày đầu tuần, Chủ nhật là ngày cuối tuần (7 ngày).
 * Thời gian so sánh theo giờ Việt Nam (UTC+7). Dùng Intl.DateTimeFormat với
 * timeZone 'Asia/Ho_Chi_Minh' để đảm bảo đúng ngày ở mọi múi giờ máy khách.
 */

const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh'

const WEEKDAY_LABELS = [
  { short: 'T2', long: 'Thứ 2' },
  { short: 'T3', long: 'Thứ 3' },
  { short: 'T4', long: 'Thứ 4' },
  { short: 'T5', long: 'Thứ 5' },
  { short: 'T6', long: 'Thứ 6' },
  { short: 'T7', long: 'Thứ 7' },
  { short: 'CN', long: 'Chủ nhật' },
]

/** @returns {Date} Hiện tại theo giờ Việt Nam dưới dạng Date đã chuẩn hoá về 00:00 local. */
export function getNowInVietnam() {
  // Lấy ngày hiện tại theo VN bằng cách format rồi parse lại.
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(new Date())
  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value)
  const day = Number(parts.find((p) => p.type === 'day')?.value)
  return new Date(year, month - 1, day)
}

/**
 * Trả về thời điểm "bây giờ" theo giờ VN, bao gồm cả giờ-phút (Date object ở local).
 * Dùng để so sánh với StartTime/EndTime (TimeSpan) của TimeSlot.
 */
export function getNowDateTimeInVietnam() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date())
  const get = (type) => Number(parts.find((p) => p.type === type)?.value)
  return new Date(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
}

/**
 * Trả về thứ 2 của tuần chứa `date` (date là Date ở local time).
 * @param {Date} date
 * @returns {Date}
 */
export function getMondayOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  // getDay(): 0 = Chủ nhật, 1 = Thứ 2 ... 6 = Thứ 7
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return d
}

/**
 * Trả về 7 Date lần lượt là Thứ 2 → Chủ nhật của tuần chứa `anchor`.
 * @param {Date} anchor
 * @returns {Date[]}
 */
export function getWeekDates(anchor) {
  const monday = getMondayOfWeek(anchor)
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    dates.push(d)
  }
  return dates
}

/** So sánh 2 Date có cùng ngày (local time). */
export function isSameDay(a, b) {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Format ngày kiểu "01/09" cho header cột.
 * @param {Date} date
 */
export function formatDayShort(date) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

/**
 * Format ngày kiểu "01/09/2026" cho header tuần.
 * @param {Date} date
 */
export function formatDayFull(date) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

/** Trả về label thứ trong tuần (T2..CN) cho index 0..6. */
export function getWeekdayLabel(index) {
  return WEEKDAY_LABELS[index] ?? WEEKDAY_LABELS[0]
}

/**
 * Trả về các phần giờ-phút của TimeSpan BE (vd "07:00:00" hoặc "07:00").
 * @param {string} value
 * @returns {{ hours: number, minutes: number } | null}
 */
export function parseTimeOfDay(value) {
  if (!value) return null
  const str = String(value)
  const [hStr, mStr] = str.split(':')
  const hours = Number(hStr)
  const minutes = Number(mStr)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return { hours, minutes }
}

/**
 * So sánh (date, slot) với hiện tại.
 * Trả về:
 *   - 'past' nếu slot đã kết thúc trước hiện tại
 *   - 'current' nếu slot đang diễn ra
 *   - 'future' nếu slot bắt đầu sau hiện tại
 *
 * @param {Date} date
 * @param {{ startTime: string, endTime: string }} slot
 * @param {Date} [now] override cho test
 */
export function classifySlotTime(date, slot, now = getNowDateTimeInVietnam()) {
  const start = parseTimeOfDay(slot.startTime)
  const end = parseTimeOfDay(slot.endTime)
  if (!start || !end) return 'future'

  const slotStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    start.hours,
    start.minutes,
  )
  const slotEnd = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    end.hours,
    end.minutes,
  )

  if (now < slotStart) return 'future'
  if (now >= slotEnd) return 'past'
  return 'current'
}

/**
 * Trả về key YYYY-MM-DD cho 1 Date (local time).
 */
export function toDateKey(date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
