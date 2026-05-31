import { apiRequest } from './client'

/**
 * @typedef {{
 *   bookingId: number
 *   licensePlate: string
 *   customerName: string
 *   serviceName: string
 *   slotLabel: string
 *   scheduledDate: string
 *   rankName: string
 *   status: string
 *   finalAmount: number
 *   fallbackQrCode: string
 *   slotId?: number
 *   details: Array<{
 *     detailId?: number
 *     licensePlate: string
 *     serviceName: string
 *     vehicleCondition: string
 *   }>
 * }} AdminBooking
 *
 * @typedef {{
 *   timeSlotId?: number | null
 *   affectedDate?: string | null
 *   reason: string
 * }} ForceCancelPayload
 */

const UI_STATUS_MAP = {
  Pending: 'Pending',
  CheckedIn: 'Checked-in',
  'Checked-in': 'Checked-in',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
  NoShow: 'No-show',
  'No-show': 'No-show',
}

const API_STATUS_MAP = {
  'Checked-in': 'CheckedIn',
  'No-show': 'NoShow',
}

/** @param {string | undefined | null} raw */
export function normalizeBookingStatus(raw) {
  if (!raw) return 'Pending'
  return UI_STATUS_MAP[raw] ?? raw
}

/** @param {string} uiStatus */
export function toApiBookingStatus(uiStatus) {
  return API_STATUS_MAP[uiStatus] ?? uiStatus
}

/** @param {string} dateValue `yyyy-MM-dd` from `<input type="date">` */
export function toApiTargetDate(dateValue) {
  if (!dateValue) return null
  return `${dateValue}T00:00:00Z`
}

function formatSlotLabel(start, end) {
  const fmt = (value) => (value ? String(value).slice(0, 5) : '')
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  return fmt(start) || fmt(end) || '—'
}

function normalizeVehicleCondition(condition) {
  if (condition == null || condition === '') return '—'
  if (typeof condition === 'number') {
    return ({ 1: 'Clean', 2: 'Dirty', 3: 'VeryDirty' })[condition] ?? String(condition)
  }
  return String(condition)
}

function normalizeBookingDetail(detail, index) {
  return {
    detailId: detail.detailId ?? detail.id ?? index + 1,
    licensePlate: detail.licensePlate ?? '—',
    serviceName: detail.serviceName ?? '—',
    vehicleCondition: normalizeVehicleCondition(
      detail.vehicleCondition ?? detail.condition ?? detail.conditionName,
    ),
  }
}

/** @param {Record<string, unknown>} item @returns {AdminBooking} */
export function normalizeAdminBooking(item) {
  const details = item.details ?? item.bookingDetails ?? []
  const firstDetail = Array.isArray(details) ? details[0] : null

  const scheduledDateRaw = item.scheduledDate ?? item.scheduledTime ?? item.affectedDate
  const scheduledDate =
    scheduledDateRaw && typeof scheduledDateRaw === 'string'
      ? scheduledDateRaw.slice(0, 10)
      : ''

  return {
    bookingId: Number(item.bookingId ?? item.id),
    licensePlate: String(item.licensePlate ?? firstDetail?.licensePlate ?? '—'),
    customerName: String(item.customerName ?? item.fullName ?? item.ownerName ?? '—'),
    serviceName: String(item.serviceName ?? firstDetail?.serviceName ?? '—'),
    slotLabel: String(
      item.slotLabel ?? item.timeSlotLabel ?? formatSlotLabel(item.startTime, item.endTime),
    ),
    scheduledDate,
    rankName: String(item.rankName ?? item.tierName ?? '—'),
    status: normalizeBookingStatus(item.status ?? item.bookingStatus),
    finalAmount: Number(item.finalAmount ?? item.totalAmount ?? item.amount ?? 0),
    fallbackQrCode: String(item.fallbackQrCode ?? item.qrCode ?? '—'),
    slotId: item.slotId ?? item.timeSlotId ?? undefined,
    details: Array.isArray(details) ? details.map(normalizeBookingDetail) : [],
  }
}

/** @param {string} targetDate ISO date-time */
export function fetchBookingsByDate(targetDate) {
  const params = new URLSearchParams({ targetDate })
  return apiRequest(`/admin/bookings?${params}`)
}

/** @param {number} bookingId @param {string} newStatus */
export function updateBookingStatus(bookingId, newStatus) {
  const params = new URLSearchParams({ newStatus: toApiBookingStatus(newStatus) })
  return apiRequest(`/admin/bookings/${bookingId}/status?${params}`, {
    method: 'PUT',
  })
}

/** @param {number} bookingId */
export function markBookingNoShow(bookingId) {
  return apiRequest(`/admin/bookings/${bookingId}/no-show`, {
    method: 'PUT',
  })
}

/** @param {ForceCancelPayload} payload */
export function forceCancelBookings(payload) {
  return apiRequest('/admin/bookings/force-cancel', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
