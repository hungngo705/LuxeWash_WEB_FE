import { formatDateTime, formatVnd } from './format'

/** @param {string | null | undefined} value */
function clipTime(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

/** @param {string | null | undefined} start @param {string | null | undefined} end */
export function formatVoucherTimeRange(start, end) {
  const from = clipTime(start)
  const to = clipTime(end)
  if (from && to) return `${from} – ${to}`
  if (from) return `${from} – …`
  if (to) return `… – ${to}`
  return 'Cả ngày'
}

/** @param {{ discountAmount?: number; discountPercent?: number | null; maxDiscountAmount?: number | null }} voucher */
export function formatVoucherDiscount(voucher) {
  const percent = Number(voucher.discountPercent ?? 0)
  if (percent > 0) {
    const cap = Number(voucher.maxDiscountAmount ?? voucher.discountAmount ?? 0)
    return `${percent}% (tối đa ${formatVnd(cap)})`
  }
  return formatVnd(Number(voucher.discountAmount ?? 0))
}

/** @param {{ startDate?: string | null; expiryDate?: string | null; expiryDays?: number | null; campaignType?: number }} voucher */
export function formatVoucherValidityWindow(voucher) {
  const parts = []
  if (voucher.startDate) {
    parts.push(`Từ ${formatDateTime(voucher.startDate)}`)
  }
  if (voucher.expiryDate) {
    parts.push(`đến ${formatDateTime(voucher.expiryDate)}`)
  }
  if (!parts.length && voucher.expiryDays) {
    parts.push(`${voucher.expiryDays} ngày kể từ lúc cấp`)
  }
  return parts.length ? parts.join(' ') : '—'
}

/** @param {{ receivedDate?: string | null; expiryDate?: string | null; expiryDays?: number | null; startDate?: string | null }} voucher
 *  Format user-specific voucher window — when the voucher was received and when it expires for this user.
 *  Used for VoucherResponseDTO (from /vouchers/me).
 */
export function formatUserVoucherWindow(voucher) {
  const parts = []
  if (voucher.receivedDate) {
    parts.push(`Nhận lúc ${formatDateTime(voucher.receivedDate)}`)
  }
  if (voucher.expiryDate) {
    parts.push(`Hết hạn ${formatDateTime(voucher.expiryDate)}`)
  }
  if (!parts.length && voucher.expiryDays) {
    parts.push(`Có hiệu lực ${voucher.expiryDays} ngày từ lúc nhận`)
  }
  return parts.length ? parts.join(' · ') : '—'
}

/** @param {{ validStartTime?: string | null; validEndTime?: string | null }} voucher */
export function formatVoucherDailyWindow(voucher) {
  return formatVoucherTimeRange(voucher.validStartTime, voucher.validEndTime)
}

/** @param {{ isActive?: boolean; startDate?: string | null; expiryDate?: string | null; validStartTime?: string | null; validEndTime?: string | null; currentUsageCount?: number; redeemedCount?: number; maxUsages?: number }} voucher */
export function describeVoucherUsability(voucher) {
  const now = new Date()
  if (voucher.isActive === false) return 'Chưa kích hoạt'

  if (voucher.startDate && new Date(voucher.startDate) > now) {
    return `Chưa đến hạn (bắt đầu ${formatDateTime(voucher.startDate)})`
  }
  if (voucher.expiryDate && new Date(voucher.expiryDate) < now) {
    return 'Đã hết hạn'
  }

  const used = Number(voucher.currentUsageCount ?? voucher.redeemedCount ?? 0)
  if (voucher.maxUsages != null && used >= Number(voucher.maxUsages)) {
    return 'Đã hết lượt dùng'
  }

  const from = clipTime(voucher.validStartTime)
  const to = clipTime(voucher.validEndTime)
  if (from || to) {
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const current = `${hh}:${mm}`
    if (from && current < from) return `Chưa đến giờ (từ ${from})`
    if (to && current > to) return `Ngoài khung giờ (đến ${to})`
  }

  return 'Có thể dùng'
}

/** @param {{ isUsed?: boolean; remainingUsage?: number; maxUsagePerUser?: number; expiryDate?: string | null; receivedDate?: string | null; validStartTime?: string | null; validEndTime?: string | null }} voucher
 *  Describe usability for UserVoucher (from /vouchers/me).
 *  Uses BE-provided IsUsed, RemainingUsage fields.
 */
export function describeUserVoucherUsability(voucher) {
  const now = new Date()

  if (voucher.isUsed) return 'Đã dùng'
  if (voucher.remainingUsage === 0) return 'Hết lượt dùng'

  if (voucher.expiryDate) {
    const expiry = new Date(voucher.expiryDate)
    if (expiry < now) return 'Đã hết hạn'
  }

  const from = clipTime(voucher.validStartTime)
  const to = clipTime(voucher.validEndTime)
  if (from || to) {
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const current = `${hh}:${mm}`
    if (from && current < from) return `Ngoài giờ (từ ${from})`
    if (to && current > to) return `Ngoài giờ (đến ${to})`
  }

  const left = voucher.remainingUsage ?? voucher.maxUsagePerUser
  return `Còn ${left} lượt`
}
