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

/** Normalize VoucherResponseDTO from GET /vouchers/me — includes user-specific expiry + receivedDate. */
function normalizeUserVoucher(item) {
  const used = Number(item.usageCount ?? item.usedCount ?? 0)
  const max = Number(item.maxUsagePerUser ?? 1)
  return {
    voucherId: Number(item.voucherId ?? item.id),
    code: String(item.code ?? ''),
    discountAmount: Number(item.discountAmount ?? 0),
    discountPercent: item.discountPercent != null ? Number(item.discountPercent) : null,
    maxDiscountAmount: item.maxDiscountAmount != null ? Number(item.maxDiscountAmount) : null,
    // User-specific expiry anchor
    receivedDate: item.receivedDate != null ? String(item.receivedDate) : null,
    expiryDate: item.expiryDate != null ? String(item.expiryDate) : null,
    campaignExpiryDate: item.campaignExpiryDate != null ? String(item.campaignExpiryDate) : null,
    // Usage tracking
    isUsed: item.isUsed === true || item.isUsed === 'true',
    usageCount: used,
    remainingUsage: item.remainingUsage != null ? Number(item.remainingUsage) : Math.max(max - used, 0),
    maxUsagePerUser: max,
    pointsRequired: Number(item.pointsRequired ?? 0),
    minOrderAmount: Number(item.minOrderAmount ?? 0),
    isActive: item.isActive !== false,
    campaignType: Number(item.campaignType ?? 0),
    voucherType: Number(item.voucherType ?? 0),
    imageUrl: item.imageUrl != null ? String(item.imageUrl) : null,
    requiredTierId: item.requiredTierId != null ? Number(item.requiredTierId) : null,
    requiredTierName: item.requiredTierName != null ? String(item.requiredTierName) : null,
    validStartTime: item.validStartTime != null ? String(item.validStartTime) : null,
    validEndTime: item.validEndTime != null ? String(item.validEndTime) : null,
    vehicleTypeId: item.vehicleTypeId != null ? Number(item.vehicleTypeId) : null,
    // Normalize legacy fields for compatibility
    startDate: item.startDate != null ? String(item.startDate) : null,
    maxUsages: Number(item.maxUsages ?? max),
    redeemedCount: used,
    currentUsageCount: used,
  }
}

/** GET /vouchers/me — voucher khả dụng của Customer */
export async function fetchMyVouchers() {
  const data = await apiRequest('/vouchers/me')
  return asVoucherCollection(data).map(normalizeUserVoucher)
}

/** POST /vouchers/redeem — đổi điểm lấy voucher */
export function redeemVoucher(voucherId) {
  return apiRequest('/vouchers/redeem', {
    method: 'POST',
    body: JSON.stringify({ voucherId: Number(voucherId) }),
  })
}
