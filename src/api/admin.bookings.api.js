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
 *   paymentStatus?: string
 *   finalAmount: number
 *   fallbackQrCode: string
 *   slotId?: number
 *   branchId?: number
 *   branchName?: string
 *   processingLaneId?: number
 *   processingLaneName?: string
 *   details: Array<{
 *     detailId?: number
 *     licensePlate: string
 *     serviceName: string
 *     vehicleCondition: string
 *   }>
 * }} AdminBooking
 *
 * @typedef {{
 *   branchId: number
 *   timeSlotId?: number | null
 *   affectedDate?: string | null
 *   reason: string
 * }} ForceCancelPayload
 */

const UI_STATUS_MAP = {
  Pending: 'Pending',
  CheckedIn: 'Checked-in',
  'Checked-in': 'Checked-in',
  Processing: 'Processing',
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

function formatScheduledSlotLabel(scheduledTime) {
  if (!scheduledTime) return '—'
  const d = new Date(String(scheduledTime))
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function normalizeServiceNames(value) {
  if (Array.isArray(value)) {
    const names = value.map((v) => String(v ?? '').trim()).filter(Boolean)
    return names.length ? names.join(', ') : undefined
  }
  if (value == null || value === '') return undefined
  return String(value)
}

/** @param {string} plate */
export function normalizePlateQuery(plate) {
  return String(plate ?? '').trim().toUpperCase()
}

/** @param {string} plate */
export function plateSearchVariants(plate) {
  const raw = normalizePlateQuery(plate)
  if (!raw) return []

  const compact = raw.replace(/[\s.-]/g, '')
  const dotted = raw.replace(/-/g, '.').replace(/\s/g, '')
  const dashed = raw.replace(/\./g, '-').replace(/\s/g, '')

  return [...new Set([raw, compact, dotted, dashed, raw.replace(/\s/g, '')])].filter(Boolean)
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

  const serviceName =
    normalizeServiceNames(item.serviceNames) ??
    normalizeServiceNames(item.serviceName) ??
    firstDetail?.serviceName ??
    '—'

  let slotLabel =
    item.slotLabel ??
    item.timeSlotLabel ??
    formatSlotLabel(item.startTime, item.endTime)
  if (!slotLabel || slotLabel === '—') {
    slotLabel = formatScheduledSlotLabel(scheduledDateRaw)
  }

  return {
    bookingId: Number(item.bookingId ?? item.id),
    licensePlate: String(item.licensePlate ?? firstDetail?.licensePlate ?? '—'),
    customerName: String(
      item.customerName ?? item.fullName ?? item.ownerName ?? item.customerPhone ?? '—',
    ),
    userId: item.userId != null ? Number(item.userId) : undefined,
    phoneNumber: String(item.customerPhone ?? item.phoneNumber ?? ''),
    bookingType: String(item.bookingType ?? item.BookingType ?? ''),
    businessProfileId:
      item.businessProfileId != null ? Number(item.businessProfileId) : undefined,
    fleetVehicleId:
      item.fleetVehicleId != null ? Number(item.fleetVehicleId) : undefined,
    serviceName: String(serviceName),
    slotLabel: String(slotLabel),
    scheduledDate,
    scheduledTime: scheduledDateRaw ? String(scheduledDateRaw) : null,
    rankName: String(
      item.customerTierName ??
        item.CustomerTierName ??
        item.rankName ??
        item.tierName ??
        '—',
    ),
    customerTierPoints:
      item.customerTierPoints != null
        ? Number(item.customerTierPoints)
        : item.CustomerTierPoints != null
          ? Number(item.CustomerTierPoints)
          : undefined,
    isVip: item.isVip === true || item.IsVip === true,
    status: normalizeBookingStatus(item.status ?? item.bookingStatus),
    paymentStatus: String(item.paymentStatus ?? item.PaymentStatus ?? 'Unpaid'),
    paymentMethod: String(item.paymentMethod ?? item.PaymentMethod ?? ''),
    finalAmount: Number(item.finalAmount ?? item.totalAmount ?? item.amount ?? 0),
    originalAmount: Number(item.originalPrice ?? item.originalAmount ?? item.finalAmount ?? 0),
    fallbackQrCode: String(item.fallbackQrCode ?? item.qrCode ?? '—'),
    slotId: item.slotId ?? item.timeSlotId ?? undefined,
    branchId: item.branchId != null ? Number(item.branchId) : undefined,
    branchName: item.branchName != null ? String(item.branchName) : undefined,
    processingLaneId: item.processingLaneId ?? item.laneId ?? undefined,
    processingLaneName:
      item.processingLaneName != null
        ? String(item.processingLaneName)
        : item.laneName != null
          ? String(item.laneName)
          : undefined,
    processingStartTime:
      item.processingStartTime != null
        ? String(item.processingStartTime)
        : item.ProcessingStartTime != null
          ? String(item.ProcessingStartTime)
          : null,
    completedTime:
      item.completedTime != null
        ? String(item.completedTime)
        : item.CompletedTime != null
          ? String(item.CompletedTime)
          : null,
    actualDurationMinutes:
      item.actualDurationMinutes != null
        ? Number(item.actualDurationMinutes)
        : item.ActualDurationMinutes != null
          ? Number(item.ActualDurationMinutes)
          : null,
    details: Array.isArray(details) ? details.map(normalizeBookingDetail) : [],
  }
}

/**
 * GET /api/v1/admin/bookings?targetDate= — Swagger chỉ có targetDate.
 * Lọc theo chi nhánh thực hiện ở FE qua {@link filterBookingsByBranch}.
 * @param {string} targetDate ISO date-time
 * @param {{ signal?: AbortSignal }} [options]
 */
export function fetchBookingsByDate(targetDate, options = {}) {
  const params = new URLSearchParams({ targetDate })
  return apiRequest(`/admin/bookings?${params}`, options)
}

/** @param {AdminBooking[]} bookings @param {number | string} branchId */
export function filterBookingsByBranch(bookings, branchId) {
  const bid = Number(branchId)
  if (!bid) return []
  return bookings.filter((b) => b.branchId == null || Number(b.branchId) === bid)
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

/**
 * PUT /api/v1/admin/bookings/{detailId}/report-mismatch
 * Reports a mismatch between registered and actual vehicle condition/type.
 * @param {number} detailId
 * @param {{ condition: number; actualTypeId?: number }} params
 */
export function reportBookingMismatch(detailId, { condition, actualTypeId }) {
  const search = new URLSearchParams({ condition: String(condition) })
  if (actualTypeId != null) search.set('actualTypeId', String(actualTypeId))
  return apiRequest(`/admin/bookings/${detailId}/report-mismatch?${search}`, {
    method: 'PUT',
  })
}

/** @param {unknown} data */
export function asBookingList(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') return [data]
  return []
}

/** @param {number} bookingId */
export function fetchBookingById(bookingId) {
  return apiRequest(`/bookings/${bookingId}`)
}

/**
 * GET /api/v1/bookings/user/{userId}
 * Admin/Manager/Staff lookup for a customer's bookings.
 * @param {number} userId
 */
export function fetchBookingsByUserId(userId) {
  return apiRequest(`/bookings/user/${Number(userId)}`).then((data) =>
    asBookingList(data).map(normalizeAdminBooking),
  )
}

/** @param {unknown} raw */
export function normalizeSmartLicensePlateLookup(raw) {
  const item = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
  const customerType = String(item.customerType ?? item.CustomerType ?? 'WalkIn')
  const data = item.data ?? item.Data ?? null
  const customerTierName =
    item.customerTierName ?? item.CustomerTierName ?? null
  const customerTierPointsRaw =
    item.customerTierPoints ?? item.CustomerTierPoints
  const customerTierPoints =
    customerTierPointsRaw != null ? Number(customerTierPointsRaw) : undefined
  const isVip = item.isVip === true || item.IsVip === true
  const walkInData =
    customerType === 'WalkIn' && data && typeof data === 'object'
      ? /** @type {Record<string, unknown>} */ (data)
      : null
  return {
    customerType,
    data,
    customerTierName:
      customerTierName != null ? String(customerTierName) : null,
    customerTierPoints,
    isVip,
    booking: customerType === 'PreBooked' && data && typeof data === 'object'
      ? normalizeAdminBooking({
          .../** @type {Record<string, unknown>} */ (data),
          customerTierName,
          customerTierPoints,
          isVip,
        })
      : null,
    fleetVehicle: customerType === 'Fleet' && data && typeof data === 'object'
      ? /** @type {Record<string, unknown>} */ (data)
      : null,
    walkInCustomer: walkInData
      ? {
          userId: walkInData.userId != null ? Number(walkInData.userId) : 0,
          customerName: walkInData.customerName != null ? String(walkInData.customerName) : '',
          phoneNumber: walkInData.phoneNumber != null ? String(walkInData.phoneNumber) : '',
          vehicleId: walkInData.vehicleId != null ? Number(walkInData.vehicleId) : undefined,
          vehicleTypeId: walkInData.vehicleTypeId != null ? Number(walkInData.vehicleTypeId) : undefined,
          customerTierName:
            customerTierName != null ? String(customerTierName) : null,
          customerTierPoints,
          isVip,
        }
      : null,
  }
}

/**
 * GET /api/v1/admin/bookings/by-license-plate/{licensePlate}
 * Smart lookup returns { customerType: PreBooked | Fleet | WalkIn, data }.
 * Requires backend token BranchId claim.
 */
export function smartLookupLicensePlate(licensePlate) {
  return apiRequest(`/admin/bookings/by-license-plate/${encodeURIComponent(licensePlate.trim())}`).then(
    normalizeSmartLicensePlateLookup,
  )
}

/**
 * GET /api/v1/admin/bookings/by-license-plate/{licensePlate}
 * Backward-compatible helper: returns only PreBooked booking data as an array.
 */
export function fetchBookingsByLicensePlate(licensePlate) {
  return smartLookupLicensePlate(licensePlate).then((lookup) =>
    lookup.booking ? [lookup.booking] : [],
  )
}

/**
 * Tra cứu biển số — thử nhiều format (BE chuẩn hóa biển số, Swagger: StaffBookings).
 * @param {string} licensePlate
 */
export async function searchBookingsByLicensePlate(licensePlate) {
  const variants = plateSearchVariants(licensePlate)
  for (const variant of variants) {
    const list = await fetchBookingsByLicensePlate(variant)
    if (list.length) return list
  }
  return []
}

/**
 * PUT /api/v1/admin/bookings/status-by-license-plate
 * Updates the status of the most-recent valid booking for the given plate today.
 * @param {string} licensePlate
 * @param {string} newStatus UI status (e.g. 'Checked-in', 'Completed')
 */
export function updateBookingStatusByLicensePlate(licensePlate, newStatus) {
  return apiRequest('/admin/bookings/status-by-license-plate', {
    method: 'PUT',
    body: JSON.stringify({
      licensePlate,
      newStatus: toApiBookingStatus(newStatus),
    }),
  })
}

/**
 * PUT /api/v1/bookings/{bookingId}/condition
 * Updates the vehicle condition (for surcharge assessment).
 * @param {number} bookingId
 * @param {1 | 2 | 3} condition 1=Clean, 2=Dirty, 3=VeryDirty
 */
export function updateBookingCondition(bookingId, condition) {
  return apiRequest(`/bookings/${bookingId}/condition`, {
    method: 'PUT',
    body: JSON.stringify({ condition }),
  })
}
