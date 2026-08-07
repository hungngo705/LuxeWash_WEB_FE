import { apiRequest } from './client'
import { toApiTimeValue } from './admin.timeSlots.api'

/**
 * @typedef {{
 *   slotId: number
 *   branchId: number
 *   startTime: string
 *   endTime: string
 *   maxCapacity: number
 * }} ManagerTimeSlot
 */

/** @param {Record<string, unknown>} item @returns {ManagerTimeSlot} */
function normalize(item) {
  return {
    slotId: Number(item.slotId ?? item.id),
    branchId: Number(item.branchId ?? 0),
    startTime: String(item.startTime ?? ''),
    endTime: String(item.endTime ?? ''),
    maxCapacity: Number(item.maxCapacity ?? 1),
  }
}

/**
 * GET /api/v1/manager/timeslots
 * Returns all time slots in the Manager's branch.
 * @returns {Promise<ManagerTimeSlot[]>}
 */
export function fetchManagerTimeSlots() {
  return apiRequest('/manager/timeslots').then((data) => {
    const list = Array.isArray(data) ? data : []
    return list.map(normalize)
  })
}

/**
 * POST /api/v1/manager/timeslots
 * Creates a new time slot in the Manager's branch.
 * @param {{ startTime: string; endTime: string; maxCapacity: number }} payload
 */
export function createManagerTimeSlot(payload) {
  return apiRequest('/manager/timeslots', {
    method: 'POST',
    body: JSON.stringify({
      startTime: toApiTimeValue(payload.startTime),
      endTime: toApiTimeValue(payload.endTime),
      maxCapacity: Number(payload.maxCapacity),
    }),
  })
}

/**
 * PUT /api/v1/manager/timeslots/{slotId}
 * Updates a time slot in the Manager's branch.
 * @param {number} slotId
 * @param {{ startTime: string; endTime: string; maxCapacity: number }} payload
 */
export function updateManagerTimeSlot(slotId, payload) {
  return apiRequest(`/manager/timeslots/${slotId}`, {
    method: 'PUT',
    body: JSON.stringify({
      startTime: toApiTimeValue(payload.startTime),
      endTime: toApiTimeValue(payload.endTime),
      maxCapacity: Number(payload.maxCapacity),
    }),
  })
}

/**
 * DELETE /api/v1/manager/timeslots/{slotId}
 * Deletes a time slot in the Manager's branch.
 * @param {number} slotId
 */
export function deleteManagerTimeSlot(slotId) {
  return apiRequest(`/manager/timeslots/${slotId}`, {
    method: 'DELETE',
  })
}
