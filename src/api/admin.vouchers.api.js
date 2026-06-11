import { apiRequest } from './client'

export const VOUCHER_TYPE = {
  Discount: 0,
  Gift: 1,
}

export const VOUCHER_TYPE_LABEL = {
  [VOUCHER_TYPE.Discount]: 'Giảm tiền',
  [VOUCHER_TYPE.Gift]: 'Quà tặng',
}

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

/** @param {Record<string, unknown>} item */
export function normalizeVoucher(item) {
  const used = Number(item.currentUsageCount ?? item.redeemedCount ?? 0)
  return {
    voucherId: Number(item.voucherId ?? item.id),
    code: String(item.code ?? ''),
    discountAmount: Number(item.discountAmount ?? 0),
    maxUsages: Number(item.maxUsages ?? 0),
    maxUsagePerUser: Number(item.maxUsagePerUser ?? 1),
    expiryDate: String(item.expiryDate ?? ''),
    startDate: item.startDate != null ? String(item.startDate) : null,
    pointsRequired: Number(item.pointsRequired ?? 0),
    redeemedCount: used,
    currentUsageCount: used,
    minOrderAmount: Number(item.minOrderAmount ?? 0),
    isActive: item.isActive !== false,
    campaignType: Number(item.campaignType ?? 0),
    voucherType: Number(item.voucherType ?? 0),
    expiryDays: item.expiryDays != null ? Number(item.expiryDays) : null,
    imageUrl: item.imageUrl != null ? String(item.imageUrl) : null,
    requiredTierId: item.requiredTierId != null ? Number(item.requiredTierId) : null,
    requiredTierName: item.requiredTierName != null ? String(item.requiredTierName) : null,
    validStartTime: item.validStartTime != null ? String(item.validStartTime) : null,
    validEndTime: item.validEndTime != null ? String(item.validEndTime) : null,
    vehicleTypeId: item.vehicleTypeId != null ? Number(item.vehicleTypeId) : null,
  }
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

/** @param {string} value e.g. "08:00" from `<input type="time">` */
export function toApiTimeValue(value) {
  if (!value) return null
  return value.length === 5 ? `${value}:00` : value
}

/** @param {string} value e.g. "08:00:00" from API */
export function toTimeInputValue(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

/** @param {Record<string, unknown>} voucher @param {Record<string, unknown>} [overrides] */
export function buildVoucherPayload(voucher, overrides = {}) {
  const merged = { ...voucher, ...overrides }
  return {
    code: String(merged.code ?? '').trim().toUpperCase(),
    discountAmount: Number(merged.discountAmount ?? 0),
    maxUsages: Number(merged.maxUsages ?? 0),
    maxUsagePerUser: Number(merged.maxUsagePerUser ?? 1),
    expiryDate: String(merged.expiryDate ?? '').includes('T')
      ? String(merged.expiryDate)
      : toApiExpiryDate(String(merged.expiryDate)),
    startDate: merged.startDate
      ? String(merged.startDate).includes('T')
        ? String(merged.startDate)
        : toApiExpiryDate(String(merged.startDate))
      : null,
    pointsRequired: Number(merged.pointsRequired ?? 0),
    voucherType: Number(merged.voucherType ?? 0),
    imageUrl: merged.imageUrl?.trim?.() ? String(merged.imageUrl).trim() : merged.imageUrl ?? null,
    minOrderAmount: Number(merged.minOrderAmount ?? 0),
    isActive: merged.isActive !== false,
    requiredTierId: merged.requiredTierId != null ? Number(merged.requiredTierId) : null,
    validStartTime: merged.validStartTime
      ? toApiTimeValue(toTimeInputValue(String(merged.validStartTime)))
      : null,
    validEndTime: merged.validEndTime
      ? toApiTimeValue(toTimeInputValue(String(merged.validEndTime)))
      : null,
    vehicleTypeId: merged.vehicleTypeId != null ? Number(merged.vehicleTypeId) : null,
  }
}

/** @returns {Promise<ReturnType<typeof normalizeVoucher>[]>} */
export async function fetchVouchers() {
  const data = await apiRequest('/admin/vouchers')
  return asVoucherCollection(data).map(normalizeVoucher)
}

/** @param {Record<string, unknown>} payload */
export function createVoucher(payload) {
  return apiRequest('/admin/vouchers', {
    method: 'POST',
    body: JSON.stringify(buildVoucherPayload(payload)),
  }).then(normalizeVoucher)
}

/** @param {number} id @param {Record<string, unknown>} payload */
export function updateVoucher(id, payload) {
  return apiRequest(`/admin/vouchers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(buildVoucherPayload(payload)),
  }).then(normalizeVoucher)
}

/** @param {number} id */
export function deleteVoucher(id) {
  return apiRequest(`/admin/vouchers/${id}`, {
    method: 'DELETE',
  })
}

/** POST /admin/vouchers/{id}/grant */
export function grantVoucherToUsers(voucherId, userIds) {
  return apiRequest(`/admin/vouchers/${voucherId}/grant`, {
    method: 'POST',
    body: JSON.stringify({
      userIds: userIds.map(Number),
    }),
  })
}

/** POST /admin/vouchers/process-campaigns */
export function processVoucherCampaigns() {
  return apiRequest('/admin/vouchers/process-campaigns', {
    method: 'POST',
  })
}
