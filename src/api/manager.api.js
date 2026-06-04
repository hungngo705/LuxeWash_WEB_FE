import { apiRequest } from './client'
import { normalizeBookingStatus } from './admin.bookings.api'

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
 *   details: Array<{
 *     detailId?: number
 *     licensePlate: string
 *     serviceName: string
 *     vehicleCondition: string
 *   }>
 * }} ManagerBooking
 */

/**
 * Normalize a raw booking response for Manager view.
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

  const normalizeCondition = (cond) => {
    if (cond == null || cond === '') return '—'
    if (typeof cond === 'number') {
      return ({ 1: 'Sạch', 2: 'Bẩn', 3: 'Rất bẩn' })[cond] ?? String(cond)
    }
    return String(cond)
  }

  return {
    bookingId: Number(item.bookingId ?? item.id),
    licensePlate: String(item.licensePlate ?? firstDetail?.licensePlate ?? '—'),
    customerName: String(item.customerName ?? item.fullName ?? '—'),
    serviceName: String(item.serviceName ?? firstDetail?.serviceName ?? '—'),
    slotLabel: String(
      item.slotLabel ?? item.timeSlotLabel ?? formatSlotLabel(item.startTime, item.endTime),
    ),
    scheduledDate,
    status: normalizeBookingStatus(item.status ?? item.bookingStatus),
    finalAmount: Number(item.finalAmount ?? 0),
    processingLaneId: item.processingLaneId ?? item.laneId ?? undefined,
    processingLaneName: item.processingLaneName ?? item.laneName ?? undefined,
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
  return apiRequest('/manager/bookings').then((data) => {
    const list = Array.isArray(data) ? data : []
    return list.map(normalizeManagerBooking)
  })
}

/**
 * GET /api/v1/manager/staff
 * Returns all Staff members at the Manager's branch.
 * @returns {Promise<StaffMember[]>}
 */
export function fetchManagerStaffs() {
  return apiRequest('/manager/staff')
}

/**
 * POST /api/v1/manager/lanes/assign-staff
 * Assigns a Staff member to a Lane for a specific date.
 * @param {{ staffId: number; laneId: number; assignedDate: string }} payload
 */
export function assignStaffToLane({ staffId, laneId, assignedDate }) {
  return apiRequest('/manager/lanes/assign-staff', {
    method: 'POST',
    body: JSON.stringify({ staffId, laneId, assignedDate }),
  })
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
