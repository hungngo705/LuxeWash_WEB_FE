import { apiRequest } from './client'
import { normalizeVoucher } from './admin.vouchers.api'

/** @param {unknown} data */
function asVoucherCollection(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const obj = /** @type {Record<string, unknown>} */ (data)
    if (Array.isArray(obj.value)) return obj.value
    if (Array.isArray(obj.items)) return obj.items
    if (Array.isArray(obj.data)) return obj.data
  }
  return []
}

/** GET /vouchers/me — voucher khả dụng của Customer */
export async function fetchMyVouchers() {
  const data = await apiRequest('/vouchers/me')
  return asVoucherCollection(data).map(normalizeVoucher)
}

/** POST /vouchers/redeem — đổi điểm lấy voucher */
export function redeemVoucher(voucherId) {
  return apiRequest('/vouchers/redeem', {
    method: 'POST',
    body: JSON.stringify({ voucherId: Number(voucherId) }),
  })
}
