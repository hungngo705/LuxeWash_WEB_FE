import { apiRequest } from './client'

/**
 * @typedef {{
 *   slotId: number
 *   startTime: string
 *   endTime: string
 *   maxCapacity: number
 *   isVipOnly: boolean
 * }} TimeSlot
 *
 * @typedef {{
 *   startTime: string
 *   endTime: string
 *   maxCapacity: number
 *   isVipOnly: boolean
 * }} TimeSlotPayload
 */

/** @returns {Promise<TimeSlot[]>} */
export function fetchTimeSlots() {
  return apiRequest('/admin/time-slots')
}

/** @param {TimeSlotPayload} payload @returns {Promise<TimeSlot>} */
export function createTimeSlot(payload) {
  return apiRequest('/admin/time-slots', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** @param {number} id @param {TimeSlotPayload} payload */
export function updateTimeSlot(id, payload) {
  return apiRequest(`/admin/time-slots/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** @param {number} id */
export function deleteTimeSlot(id) {
  return apiRequest(`/admin/time-slots/${id}`, {
    method: 'DELETE',
  })
}

/** @param {string} value e.g. "08:00" from `<input type="time">` */
export function toApiTimeValue(value) {
  if (!value) return value
  return value.length === 5 ? `${value}:00` : value
}

/** @param {string} value e.g. "08:00:00" from API */
export function toTimeInputValue(value) {
  if (!value) return ''
  return value.slice(0, 5)
}
