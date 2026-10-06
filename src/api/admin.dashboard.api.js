import { fetchBookingsByDate } from './admin.bookings.api'
import { fetchAdminTransactions, nextDate, transactionTypes } from './admin.customer-transactions.api'
import { fetchUsers } from './admin.users.api'
import { fetchVouchers } from './admin.vouchers.api'

const vnDate = (value = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(value)

function dateKey(value) {
  if (!value) return ''
  if (!/Z$|[+-]\d{2}:\d{2}$/.test(value)) return String(value).slice(0, 10)
  return vnDate(new Date(value))
}

function collection(value) {
  if (!Array.isArray(value)) throw new Error('API không trả về danh sách hợp lệ.')
  return value
}

async function monthlyTransactions(from, to, signal) {
  const items = new Map()
  let page = 1
  let totalPages
  do {
    const result = await fetchAdminTransactions({ from, to, page, pageSize: 100 }, signal)
    collection(result?.items).forEach((item) => items.set(item.transactionId, item))
    totalPages = Number(result.totalPages)
    if (!Number.isFinite(totalPages)) throw new Error('API giao dịch thiếu thông tin phân trang.')
    page += 1
  } while (page <= totalPages)
  return [...items.values()]
}

export function summarizeDashboard({ today, days, dayBookings, transactions, customerCount, vouchers, errors = [] }) {
  const todayBookings = dayBookings.at(-1)
  const weekComplete = dayBookings.every((items) => items !== null)
  const bookings = dayBookings.flatMap((items) => items ?? [])
  const paid = (transactions ?? []).filter((item) => ['Completed', 'Success'].includes(item.status))
  const receiptTypes = ['Payment', 'BookingPayment', 'WalkInPayment', 'InvoicePayment']
  const netReceipts = (items) => items.reduce((sum, item) => {
    const amount = Math.abs(Number(item.amount) || 0)
    return sum + (receiptTypes.includes(item.transactionType) ? amount : item.transactionType === 'Refund' ? -amount : 0)
  }, 0)
  const completed = bookings.filter((item) => item.status === 'Completed')
  const closed = bookings.filter((item) => ['Completed', 'Cancelled', 'CancelledBySystem', 'NoShow', 'No-show'].includes(item.status))
  const services = new Map()
  completed.forEach((booking) => {
    new Set((booking.serviceNames ?? []).filter(Boolean)).forEach((name) => services.set(name, (services.get(name) ?? 0) + 1))
  })
  const activities = paid.filter((item) => item.createdAt).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 8).map((item) => ({
    id: 'tx-' + item.transactionId,
    message: (transactionTypes[item.transactionType] ?? item.transactionType) + ' #' + item.transactionId + ' — ' + (item.customerName || 'Khách tại quầy'),
    icon: item.transactionType === 'Refund' ? 'undo' : 'payments',
    time: new Date(/Z$|[+-]\d{2}:\d{2}$/.test(item.createdAt) ? item.createdAt : item.createdAt + '+07:00').toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  }))
  return {
    errors,
    kpiCards: [
      { id: 'revenue-today', label: 'Thu dịch vụ ròng hôm nay', value: transactions === null ? null : netReceipts(paid.filter((item) => dateKey(item.createdAt) === today)), format: 'vnd', icon: 'payments' },
      { id: 'revenue-month', label: 'Thu dịch vụ ròng tháng ' + today.slice(5, 7), value: transactions === null ? null : netReceipts(paid), format: 'vnd', icon: 'trending_up' },
      { id: 'bookings-today', label: 'Booking hôm nay', value: todayBookings?.length ?? null, icon: 'calendar_month' },
      { id: 'pending', label: 'Chờ / đã check-in hôm nay', value: todayBookings?.filter((item) => ['Pending', 'Confirmed', 'CheckedIn', 'Checked-in'].includes(item.status)).length ?? null, icon: 'hourglass_top' },
      { id: 'customers', label: 'Tổng khách hàng cá nhân', value: customerCount, icon: 'group' },
      { id: 'completion', label: 'Hoàn thành / đã kết thúc (7 ngày)', value: weekComplete && closed.length ? Math.round(completed.length / closed.length * 1000) / 10 : null, format: 'percent', icon: 'check_circle' },
      { id: 'vouchers', label: 'Lượt dùng voucher (lũy kế)', value: vouchers === null ? null : vouchers.reduce((sum, item) => sum + Number(item.currentUsageCount ?? 0), 0), icon: 'confirmation_number' },
      { id: 'processing', label: 'Đang rửa (booking hôm nay)', value: todayBookings?.filter((item) => item.status === 'Processing').length ?? null, icon: 'local_car_wash' },
    ],
    bookingsLast7Days: days.map((date, index) => ({ date, label: date.slice(8, 10) + '/' + date.slice(5, 7), count: dayBookings[index]?.length ?? null })),
    topServices: weekComplete ? [...services].map(([serviceName, count]) => ({ serviceName, count })).sort((a, b) => b.count - a.count).slice(0, 5) : [],
    servicesUnavailable: !weekComplete,
    transactionsUnavailable: transactions === null,
    recentActivities: activities,
  }
}

export async function fetchDashboardStats({ signal } = {}) {
  const today = vnDate()
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today + 'T00:00:00Z')
    date.setUTCDate(date.getUTCDate() - 6 + index)
    return date.toISOString().slice(0, 10)
  })
  const results = await Promise.allSettled([
    monthlyTransactions(today.slice(0, 7) + '-01', nextDate(today), signal),
    fetchUsers({ page: 1, pageSize: 1, role: 'Customer', signal }),
    fetchVouchers().then(collection),
    ...days.map((date) => fetchBookingsByDate(date + 'T00:00:00', { signal }).then(collection)),
  ])
  const names = ['Giao dịch toàn hệ thống', 'Khách hàng', 'Voucher', ...days.map((date) => 'Booking ' + date)]
  const errors = results.flatMap((result, index) => result.status === 'rejected' ? [names[index] + ': ' + (result.reason?.message || 'Không tải được dữ liệu')] : [])
  const values = results.map((result) => result.status === 'fulfilled' ? result.value : null)
  return summarizeDashboard({ today, days, transactions: values[0], customerCount: values[1]?.totalItems ?? null, vouchers: values[2], dayBookings: values.slice(3), errors })
}
