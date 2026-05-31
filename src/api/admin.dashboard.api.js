import { fetchBookingsByDate, normalizeAdminBooking, toApiTargetDate } from './admin.bookings.api'
import { fetchPointsHistory, fetchTransactions, normalizePointsEntry, normalizeTransaction } from './admin.transactions.api'
import { fetchUsers } from './admin.users.api'
import { fetchVouchers } from './admin.vouchers.api'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toDateValue(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function isSameDay(iso, date) {
  if (!iso) return false
  const value = new Date(iso)
  return (
    value.getFullYear() === date.getFullYear() &&
    value.getMonth() === date.getMonth() &&
    value.getDate() === date.getDate()
  )
}

function isInCurrentMonth(iso, ref = new Date()) {
  if (!iso) return false
  const value = new Date(iso)
  return value.getFullYear() === ref.getFullYear() && value.getMonth() === ref.getMonth()
}

function formatChartDate(date) {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`
}

function formatRelativeTime(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  return `${Math.floor(hours / 24)} ngày trước`
}

function getActivityTimestamp(booking) {
  return booking.createdAt ?? booking.scheduledDate ?? null
}

function buildTopServices(bookings) {
  const map = new Map()

  for (const booking of bookings) {
    const name = booking.serviceName && booking.serviceName !== '—' ? booking.serviceName : 'Khác'
    const current = map.get(name) ?? { serviceName: name, count: 0, revenue: 0 }
    current.count += 1
    current.revenue += Number(booking.finalAmount) || 0
    map.set(name, current)
  }

  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5)
}

function buildRecentActivities(bookings, transactions, points) {
  const items = []

  for (const booking of bookings) {
    const time = getActivityTimestamp(booking)
    if (!time) continue

    if (booking.status === 'Completed') {
      items.push({
        id: `booking-complete-${booking.bookingId}`,
        time,
        message: `Hoàn thành #${booking.bookingId} — ${booking.customerName}`,
        icon: 'check_circle',
      })
    } else if (booking.status === 'Cancelled' || booking.status === 'No-show') {
      items.push({
        id: `booking-cancel-${booking.bookingId}`,
        time,
        message: `Hủy booking #${booking.bookingId} — ${booking.status}`,
        icon: 'cancel',
      })
    } else if (booking.status === 'Pending') {
      items.push({
        id: `booking-new-${booking.bookingId}`,
        time,
        message: `Booking #${booking.bookingId} mới — ${booking.customerName} · ${booking.serviceName}`,
        icon: 'calendar_add_on',
      })
    }
  }

  for (const tx of transactions) {
    if (tx.status !== 'Success' || !tx.createdAt) continue
    items.push({
      id: `tx-${tx.transactionId}`,
      time: tx.createdAt,
      message: `Thanh toán #${tx.transactionId} — ${tx.customerName}`,
      icon: 'payments',
    })
  }

  for (const entry of points) {
    if (entry.type !== 'Earn' || !entry.createdAt) continue
    items.push({
      id: `points-${entry.id}`,
      time: entry.createdAt,
      message: `${entry.customerName} +${entry.points.toLocaleString('vi-VN')} điểm`,
      icon: 'stars',
    })
  }

  return items
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8)
    .map((item) => ({
      ...item,
      time: formatRelativeTime(item.time),
    }))
}

function computeCompletionRate(bookings) {
  const completed = bookings.filter((b) => b.status === 'Completed').length
  const denominator = bookings.filter((b) =>
    ['Completed', 'Cancelled', 'No-show'].includes(b.status),
  ).length
  if (!denominator) return 0
  return Math.round((completed / denominator) * 1000) / 10
}

/** @returns {Promise<{
 *   kpiCards: Array<{ id: string; label: string; value: number; format: string; icon: string }>
 *   bookingsLast7Days: Array<{ date: string; count: number }>
 *   topServices: Array<{ serviceName: string; count: number; revenue: number }>
 *   recentActivities: Array<{ id: string; message: string; time: string; icon: string }>
 * }>} */
export async function fetchDashboardStats() {
  const today = new Date()
  const todayValue = toDateValue(today)
  const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long' }).format(today)

  const last7Days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(date.getDate() - (6 - index))
    return date
  })

  const [
    transactionsRaw,
    todayBookingsRaw,
    activeUsersResult,
    pointsRaw,
    vouchersRaw,
    ...last7BookingsRaw
  ] = await Promise.all([
    fetchTransactions(),
    fetchBookingsByDate(toApiTargetDate(todayValue)),
    fetchUsers({ page: 1, pageSize: 1, status: 'Active' }),
    fetchPointsHistory(),
    fetchVouchers(),
    ...last7Days.map((date) => fetchBookingsByDate(toApiTargetDate(toDateValue(date)))),
  ])

  const transactions = Array.isArray(transactionsRaw)
    ? transactionsRaw.map(normalizeTransaction)
    : []
  const todayBookings = Array.isArray(todayBookingsRaw)
    ? todayBookingsRaw.map(normalizeAdminBooking)
    : []
  const pointsHistory = Array.isArray(pointsRaw) ? pointsRaw.map(normalizePointsEntry) : []
  const vouchers = Array.isArray(vouchersRaw) ? vouchersRaw : []

  const last7Bookings = last7BookingsRaw.flatMap((day) =>
    Array.isArray(day) ? day.map(normalizeAdminBooking) : [],
  )

  const revenueToday = transactions
    .filter((tx) => tx.status === 'Success' && isSameDay(tx.createdAt, today))
    .reduce((sum, tx) => sum + tx.amount, 0)

  const revenueMonth = transactions
    .filter((tx) => tx.status === 'Success' && isInCurrentMonth(tx.createdAt, today))
    .reduce((sum, tx) => sum + tx.amount, 0)

  const pendingCount = todayBookings.filter((b) =>
    ['Pending', 'Checked-in'].includes(b.status),
  ).length

  const pointsEarnedMonth = pointsHistory
    .filter((entry) => entry.type === 'Earn' && isInCurrentMonth(entry.createdAt, today))
    .reduce((sum, entry) => sum + Math.max(entry.points, 0), 0)

  const vouchersUsedMonth = vouchers.reduce(
    (sum, voucher) => sum + Number(voucher.redeemedCount ?? 0),
    0,
  )

  const bookingsLast7Days = last7Days.map((date, index) => {
    const dayBookings = Array.isArray(last7BookingsRaw[index]) ? last7BookingsRaw[index] : []
    return {
      date: formatChartDate(date),
      count: dayBookings.length,
    }
  })

  const kpiCards = [
    { id: 'revenue-today', label: 'Doanh thu hôm nay', value: revenueToday, format: 'vnd', icon: 'payments' },
    { id: 'revenue-month', label: `Doanh thu ${monthLabel}`, value: revenueMonth, format: 'vnd', icon: 'trending_up' },
    { id: 'bookings-today', label: 'Booking hôm nay', value: todayBookings.length, format: 'number', icon: 'calendar_month' },
    { id: 'pending', label: 'Đang chờ (Pending)', value: pendingCount, format: 'number', icon: 'hourglass_top' },
    {
      id: 'active-customers',
      label: 'Khách Active',
      value: activeUsersResult?.totalItems ?? 0,
      format: 'number',
      icon: 'group',
    },
    {
      id: 'completion-rate',
      label: 'Tỷ lệ hoàn thành',
      value: computeCompletionRate(last7Bookings),
      format: 'percent',
      icon: 'check_circle',
    },
    {
      id: 'vouchers-used',
      label: 'Voucher đã dùng',
      value: vouchersUsedMonth,
      format: 'number',
      icon: 'confirmation_number',
    },
    {
      id: 'points-earned',
      label: `Điểm đã cộng (${monthLabel})`,
      value: pointsEarnedMonth,
      format: 'number',
      icon: 'stars',
    },
  ]

  return {
    kpiCards,
    bookingsLast7Days,
    topServices: buildTopServices(last7Bookings),
    recentActivities: buildRecentActivities(last7Bookings, transactions, pointsHistory),
  }
}
