import { apiRequest } from './client'
import { normalizeBookingStatus, toApiTargetDate } from './admin.bookings.api'
import { asManagerCollection } from './manager.lanes.api'
import { normalizeManagerStaff } from './manager.employees.api'

/**
 * @typedef {{
 *   staffId: number
 *   fullName: string
 *   phoneNumber: string
 *   role: string
 *   branchId: number
 *   branchName?: string
 *   isActive?: boolean
 * }} StaffMember
 *
 * @typedef {{
 *   laneId: number
 *   laneName: string
 *   assignedDate: string
 *   assignedAt?: string
 * }} LaneAssignment
 *
 * @typedef {{
 *   bookingId: number
 *   licensePlate: string
 *   customerName: string
 *   serviceName: string
 *   slotLabel: string
 *   scheduledDate: string
 *   status: string
 *   finalAmount: number
 *   processingLaneId?: number
 *   processingLaneName?: string
 *   isBusinessLane?: boolean
 *   details: Array<{
 *     detailId?: number
 *     licensePlate: string
 *     serviceName: string
 *     vehicleCondition: string
 *   }>
 * }} ManagerBooking
 */

function normalizeServiceNames(value) {
  if (Array.isArray(value)) {
    const names = value.map((v) => String(v ?? '').trim()).filter(Boolean)
    return names.length ? names.join(', ') : undefined
  }
  if (value == null || value === '') return undefined
  return String(value)
}

/** @param {Record<string, unknown>} item */
export { normalizeManagerStaff } from './manager.employees.api'

/**
 * @param {Record<string, unknown>} item
 * @returns {ManagerBooking}
 */
export function normalizeManagerBooking(item) {
  const details = item.details ?? item.bookingDetails ?? []
  const firstDetail = Array.isArray(details) ? details[0] : null

  const scheduledDateRaw = item.scheduledDate ?? item.scheduledTime ?? item.affectedDate
  const scheduledDate =
    scheduledDateRaw && typeof scheduledDateRaw === 'string'
      ? scheduledDateRaw.slice(0, 10)
      : ''

  const formatSlotLabel = (start, end) => {
    const fmt = (v) => (v ? String(v).slice(0, 5) : '')
    if (start && end) return `${fmt(start)} – ${fmt(end)}`
    return fmt(start) || fmt(end) || '—'
  }

  const formatScheduledSlotLabel = (scheduledTime) => {
    if (!scheduledTime) return '—'
    const d = new Date(String(scheduledTime))
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  const normalizeCondition = (cond) => {
    if (cond == null || cond === '') return '—'
    if (typeof cond === 'number') {
      return ({ 1: 'Sạch', 2: 'Bẩn', 3: 'Rất bẩn' })[cond] ?? String(cond)
    }
    return String(cond)
  }

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
    customerName: String(item.customerName ?? item.fullName ?? item.customerPhone ?? '—'),
    customerPhone: String(item.customerPhone ?? item.phoneNumber ?? '—'),
    serviceName: String(serviceName),
    slotLabel: String(slotLabel),
    scheduledDate,
    scheduledTime: scheduledDateRaw ? String(scheduledDateRaw) : null,
    status: normalizeBookingStatus(item.status ?? item.bookingStatus),
    bookingType: String(item.bookingType ?? ''),
    finalAmount: Number(item.finalAmount ?? item.totalAmount ?? item.amount ?? 0),
    processingLaneId: item.processingLaneId ?? item.laneId ?? undefined,
    processingLaneName: item.processingLaneName ?? item.laneName ?? undefined,
    isWaitingForLane:
      item.isWaitingForLane === true ||
      (normalizeBookingStatus(item.status ?? item.bookingStatus) === 'Checked-in' &&
        item.processingLaneId == null &&
        item.laneId == null),
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
    isBusinessLane: item.isBusinessLane === true || item.IsBusinessLane === true,
    details: Array.isArray(details)
      ? details.map((d, i) => ({
          detailId: d.detailId ?? d.id ?? i + 1,
          licensePlate: d.licensePlate ?? '—',
          serviceName: d.serviceName ?? '—',
          vehicleCondition: normalizeCondition(
            d.vehicleCondition ?? d.condition ?? d.conditionName,
          ),
        }))
      : [],
  }
}

/**
 * GET /api/v1/manager/bookings
 * Returns all Pending/CheckedIn/Processing bookings at the Manager's branch.
 * @returns {Promise<ManagerBooking[]>}
 */
export function fetchManagerBookings() {
  return apiRequest('/manager/bookings').then((data) =>
    asManagerCollection(data).map(normalizeManagerBooking),
  )
}

/**
 * GET /api/v1/manager/staff
 * Returns all Staff members at the Manager's branch.
 * @returns {Promise<Array<{ userId: number; fullName: string; phoneNumber: string; status: string }>>}
 */
export function fetchManagerStaffs() {
  return apiRequest('/manager/staff').then((data) => asManagerCollection(data).map(normalizeManagerStaff))
}

/**
 * POST /api/v1/manager/bookings/{bookingId}/checkin-assign
 * Assigns a booking to a Lane and Staff (vehicle check-in at the station).
 * @param {number} bookingId
 * @param {{ laneId: number; staffId?: number }} payload
 */
export function checkinAssignBooking(bookingId, { laneId, staffId }) {
  return apiRequest(`/manager/bookings/${bookingId}/checkin-assign`, {
    method: 'POST',
    body: JSON.stringify({ bookingId, laneId, staffId }),
  })
}

/**
 * PUT /api/v1/manager/bookings/{bookingId}/no-show
 * Marks a booking as no-show. Manager can access this endpoint.
 * @param {number} bookingId
 */
export function markManagerBookingNoShow(bookingId) {
  return apiRequest(`/manager/bookings/${bookingId}/no-show`, {
    method: 'PUT',
  })
}
