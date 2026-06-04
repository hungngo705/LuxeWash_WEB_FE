import { apiRequest } from './client'
import { normalizeBookingStatus } from './admin.bookings.api'

/**
 * @typedef {{
 *   bookingId: number
 *   licensePlate: string
 *   customerName: string
 *   serviceName: string
 *   slotLabel: string
 *   scheduledTime: string
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
 * }} StaffTask
 */

/**
 * Normalize a raw booking response for Staff task view.
 * @param {Record<string, unknown>} item
 * @returns {StaffTask}
 */
export function normalizeStaffTask(item) {
  const details = item.details ?? item.bookingDetails ?? []
  const firstDetail = Array.isArray(details) ? details[0] : null

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
    scheduledTime: item.scheduledTime ?? item.scheduledDate ?? null,
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
 * GET /api/v1/operation-staff/tasks
 * Returns bookings assigned to the logged-in Staff member's lane (CheckedIn or Processing).
 * @returns {Promise<StaffTask[]>}
 */
export function fetchStaffTasks() {
  return apiRequest('/operation-staff/tasks').then((data) => {
    const list = Array.isArray(data) ? data : []
    return list.map(normalizeStaffTask)
  })
}

/**
 * PUT /api/v1/operation-staff/bookings/{bookingId}/status
 * Updates a booking status. Used by Staff to start (Processing) or complete (Completed) a wash.
 * @param {number} bookingId
 * @param {'Processing' | 'Completed'} status
 */
export function updateStaffBookingStatus(bookingId, status) {
  return apiRequest(`/operation-staff/bookings/${bookingId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}
