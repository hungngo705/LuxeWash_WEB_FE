import { apiRequest } from './client'
import {
  buildVoucherPayload,
  normalizeVoucher,
  toApiExpiryDate,
  toApiTimeValue,
} from './admin.vouchers.api'

export const CAMPAIGN_TYPE = {
  Manual: 0,
  Birthday: 1,
  Age: 2,
  Winback: 3,
  Vip: 4,
  Milestone: 5,
}

export const CAMPAIGN_TYPE_LABEL = {
  [CAMPAIGN_TYPE.Birthday]: 'Sinh Nhật',
  [CAMPAIGN_TYPE.Age]: 'Theo Tuổi',
  [CAMPAIGN_TYPE.Winback]: 'Winback',
  [CAMPAIGN_TYPE.Vip]: 'VIP',
  [CAMPAIGN_TYPE.Milestone]: 'Kỷ Niệm',
  [CAMPAIGN_TYPE.Manual]: 'Thủ Công',
}

/**
 * @typedef {{
 *   voucherId: number
 *   code: string
 *   discountAmount: number
 *   maxUsages: number
 *   currentUsageCount: number
 *   maxUsagePerUser: number
 *   expiryDays: number | null
 *   startDate: string | null
 *   endDate: string
 *   minOrderAmount: number
 *   imageUrl: string | null
 *   requiredTierId: number | null
 *   requiredTierName: string | null
 *   validStartTime: string | null
 *   validEndTime: string | null
 *   isActive: boolean
 *   campaignType: number
 *   voucherType: number
 *   targetAge: number | null
 *   inactiveDays: number | null
 *   resendAfterDays: number | null
 *   milestoneUsageCount: number | null
 * }} CampaignVoucher
 */

/** @param {CampaignVoucher} v @returns {CampaignVoucher} */
export function normalizeCampaignVoucher(v) {
  return {
    voucherId: Number(v.voucherId ?? v.VoucherId),
    code: String(v.code ?? v.Code ?? ''),
    discountAmount: Number(v.discountAmount ?? v.DiscountAmount),
    maxUsages: Number(v.maxUsages ?? v.MaxUsages),
    currentUsageCount: Number(v.currentUsageCount ?? v.CurrentUsageCount ?? 0),
    maxUsagePerUser: Number(v.maxUsagePerUser ?? v.MaxUsagePerUser ?? 1),
    expiryDays: v.expiryDays ?? v.ExpiryDays ?? null,
    startDate: v.startDate ?? v.StartDate ?? null,
    endDate: v.endDate ?? v.EndDate ?? '',
    minOrderAmount: Number(v.minOrderAmount ?? v.MinOrderAmount ?? 0),
    imageUrl: v.imageUrl ?? v.ImageUrl ?? null,
    requiredTierId: v.requiredTierId ?? v.RequiredTierId ?? null,
    requiredTierName: v.requiredTierName ?? v.RequiredTierName ?? null,
    validStartTime: v.validStartTime ?? v.ValidStartTime ?? null,
    validEndTime: v.validEndTime ?? v.ValidEndTime ?? null,
    isActive: v.isActive ?? v.IsActive ?? true,
    campaignType: Number(v.campaignType ?? v.CampaignType ?? 0),
    voucherType: Number(v.voucherType ?? v.VoucherType ?? 0),
    targetAge: v.targetAge ?? v.TargetAge ?? null,
    inactiveDays: v.inactiveDays ?? v.InactiveDays ?? null,
    resendAfterDays: v.resendAfterDays ?? v.ResendAfterDays ?? null,
    milestoneUsageCount: v.milestoneUsageCount ?? v.MilestoneUsageCount ?? null,
  }
}

/** @param {string} value e.g. "08:00:00" from API */
export function toTimeInputValue(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

/**
 * Build base payload shared by all campaign types.
 * @param {Record<string,any>} form
 */
function buildBasePayload(form) {
  return {
    code: form.code.trim().toUpperCase(),
    discountAmount: Number(form.discountAmount),
    maxUsages: Number(form.maxUsages),
    maxUsagePerUser: Number(form.maxUsagePerUser),
    expiryDays: Number(form.expiryDays),
    startDate: form.startDate ? toApiExpiryDate(form.startDate) : null,
    endDate: form.endDate ? toApiExpiryDate(form.endDate) : null,
    minOrderAmount: Number(form.minOrderAmount) || 0,
    imageUrl: form.imageUrl?.trim() || null,
    requiredTierId: form.requiredTierId ? Number(form.requiredTierId) : null,
    validStartTime: toApiTimeValue(form.validStartTime),
    validEndTime: toApiTimeValue(form.validEndTime),
    isActive: Boolean(form.isActive),
  }
}

// ─── Birthday ────────────────────────────────────────────────────────────────

/**
 * @param {Record<string,any>} form
 * @returns {Promise<CampaignVoucher>}
 */
export function createBirthdayCampaign(form) {
  const payload = {
    ...buildBasePayload(form),
  }
  return apiRequest('/admin/vouchers/birthday', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ─── Age ─────────────────────────────────────────────────────────────────────

/**
 * @param {Record<string,any>} form
 * @returns {Promise<CampaignVoucher>}
 */
export function createAgeCampaign(form) {
  const payload = {
    ...buildBasePayload(form),
    targetAge: Number(form.targetAge),
  }
  return apiRequest('/admin/vouchers/age', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ─── Winback ─────────────────────────────────────────────────────────────────

/**
 * @param {Record<string,any>} form
 * @returns {Promise<CampaignVoucher>}
 */
export function createWinbackCampaign(form) {
  const payload = {
    ...buildBasePayload(form),
    inactiveDays: Number(form.inactiveDays),
    resendAfterDays: Number(form.resendAfterDays),
  }
  return apiRequest('/admin/vouchers/winback', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ─── VIP ─────────────────────────────────────────────────────────────────────

/**
 * @param {Record<string,any>} form
 * @returns {Promise<CampaignVoucher>}
 */
export function createVipCampaign(form) {
  const payload = {
    ...buildBasePayload(form),
    requiredTierId: form.requiredTierId ? Number(form.requiredTierId) : null,
  }
  return apiRequest('/admin/vouchers/vip', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ─── Milestone ────────────────────────────────────────────────────────────────

/**
 * @param {Record<string,any>} form
 * @returns {Promise<CampaignVoucher>}
 */
export function createMilestoneCampaign(form) {
  const payload = {
    ...buildBasePayload(form),
    milestoneUsageCount: Number(form.milestoneUsageCount),
  }
  return apiRequest('/admin/vouchers/milestone', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ─── Toggle active ───────────────────────────────────────────────────────────

/** @param {ReturnType<typeof normalizeCampaignVoucher>} voucher @param {boolean} isActive */
export function updateCampaignActive(voucher, isActive) {
  return apiRequest(`/admin/vouchers/${voucher.voucherId}`, {
    method: 'PUT',
    body: JSON.stringify(
      buildVoucherPayload(
        {
          ...normalizeVoucher(voucher),
          pointsRequired: 0,
          expiryDate: voucher.endDate || voucher.expiryDate,
          startDate: voucher.startDate,
        },
        { isActive },
      ),
    ),
  })
}

// ─── Delete ──────────────────────────────────────────────────────────────────

/** @param {number} id */
export function deleteCampaign(id) {
  return apiRequest(`/admin/vouchers/${id}`, {
    method: 'DELETE',
  })
}
