import { apiRequest } from './client'

export function fetchAdminTransactions(params, signal) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value != null) query.set(key, String(value))
  })
  return apiRequest(`/admin/transactions?${query}`, { signal })
}

export function nextDate(date) {
  if (!date) return ''
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + 1)
  return value.toISOString().slice(0, 10)
}

export const transactionTypes = {
  Topup: 'Nạp ví', Payment: 'Thanh toán dịch vụ', BookingPayment: 'Thanh toán lịch hẹn',
  WalkInPayment: 'Thanh toán tại quầy', Refund: 'Hoàn tiền', InvoicePayment: 'Thanh toán hóa đơn',
}
export const transactionStatuses = {
  Completed: 'Thành công', Pending: 'Đang chờ', Failed: 'Thất bại',
  Cancelled: 'Đã hủy', Expired: 'Hết hạn', Refunded: 'Đã hoàn tiền', Success: 'Thành công',
}
