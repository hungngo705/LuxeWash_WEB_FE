import { apiRequest } from './client'

/**
 * @typedef {{
 *   voucherId: number
 *   code: string
 *   discountAmount: number
 *   maxUsages: number
 *   expiryDate: string
 *   pointsRequired: number
 *   redeemedCount?: number
 * }} Voucher
 *
 * @typedef {{
 *   code: string
 *   discountAmount: number
 *   maxUsages: number
 *   expiryDate: string
 *   pointsRequired: number
 * }} VoucherPayload
 */

/** @returns {Promise<Voucher[]>} */
export function fetchVouchers() {
  return apiRequest('/admin/vouchers')
}

/** @param {VoucherPayload} payload @returns {Promise<Voucher>} */
export function createVoucher(payload) {
  return apiRequest('/admin/vouchers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** @param {number} id @param {VoucherPayload} payload */
export function updateVoucher(id, payload) {
  return apiRequest(`/admin/vouchers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** @param {number} id */
export function deleteVoucher(id) {
  return apiRequest(`/admin/vouchers/${id}`, {
    method: 'DELETE',
  })
}

/** @param {string} value from `<input type="datetime-local">` */
export function toApiExpiryDate(value) {
  if (!value) return value
  if (value.endsWith('Z')) return value
  const normalized = value.length === 16 ? `${value}:00` : value
  return `${normalized}Z`
}

/** @param {string} iso from API */
export function toDatetimeLocalValue(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
