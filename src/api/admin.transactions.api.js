import { apiRequest } from './client'

/**
 * @typedef {{
 *   transactionId: number
 *   bookingId: number | string
 *   customerName: string
 *   amount: number
 *   paymentMethod: string
 *   status: string
 *   createdAt: string | null
 * }} Transaction
 *
 * @typedef {{
 *   id: number | string
 *   userId?: number
 *   customerName: string
 *   points: number
 *   type: string
 *   reason: string
 *   bookingId: number | string
 *   createdAt: string | null
 *   expiryDate?: string | null
 * }} PointsHistoryEntry
 */

/** @returns {Promise<unknown[]>} */
export function fetchTransactions() {
  return apiRequest('/transactions')
}

/** @returns {Promise<unknown[]>} */
export function fetchPointsHistory() {
  return apiRequest('/points/history')
}

/** @param {Record<string, unknown>} item @returns {Transaction} */
export function normalizeTransaction(item) {
  return {
    transactionId: Number(item.transactionId ?? item.id),
    bookingId: item.bookingId ?? item.booking?.bookingId ?? '—',
    customerName: String(
      item.customerName ?? item.fullName ?? item.customer?.fullName ?? '—',
    ),
    amount: Number(item.amount ?? item.totalAmount ?? 0),
    paymentMethod: String(item.paymentMethod ?? item.method ?? '—'),
    status: String(item.status ?? item.transactionStatus ?? 'Success'),
    createdAt: item.createdAt ?? item.transactionDate ?? item.createdDate ?? null,
  }
}

function normalizePointsType(rawType, points) {
  const value = String(rawType ?? '')
  if (value === 'Earn' || value === 'Redeem') return value
  if (/earn|credit|add/i.test(value)) return 'Earn'
  if (/redeem|spend|deduct/i.test(value)) return 'Redeem'
  return points >= 0 ? 'Earn' : 'Redeem'
}

/** @param {Record<string, unknown>} item @param {number} index @returns {PointsHistoryEntry} */
export function normalizePointsEntry(item, index) {
  const points = Number(item.points ?? item.pointChange ?? item.amount ?? 0)

  return {
    id: item.id ?? item.historyId ?? item.pointsHistoryId ?? index,
    userId: item.userId,
    customerName: String(item.customerName ?? item.fullName ?? item.userName ?? '—'),
    points,
    type: normalizePointsType(item.type ?? item.pointType, points),
    reason: String(item.reason ?? item.description ?? '—'),
    bookingId: item.bookingId ?? '—',
    createdAt: item.createdAt ?? item.createdDate ?? null,
    expiryDate: item.expiryDate ?? item.expiresAt ?? null,
  }
}
