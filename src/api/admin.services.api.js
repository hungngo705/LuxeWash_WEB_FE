import { apiRequest } from './client'

/**
 * @typedef {{
 *   vehicleTypeId: number
 *   vehicleTypeName?: string
 *   price: number
 *   estimatedDurationMinutes: number
 * }} ServicePrice
 *
 * @typedef {{
 *   serviceId: number
 *   serviceName: string
 *   description?: string
 *   isActive?: boolean
 *   prices: ServicePrice[]
 * }} Service
 *
 * @typedef {{
 *   serviceName: string
 *   description?: string
 *   prices: Array<{
 *     vehicleTypeId: number
 *     price: number
 *     estimatedDurationMinutes: number
 *   }>
 * }} ServicePayload
 */

/** @returns {Promise<Service[]>} */
export function fetchServices() {
  return apiRequest('/admin/services')
}

/** @param {ServicePayload} payload @returns {Promise<Service>} */
export function createService(payload) {
  return apiRequest('/admin/services', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** @param {number} id @param {ServicePayload} payload */
export function updateService(id, payload) {
  return apiRequest(`/admin/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** @param {number} id — backend soft-deactivates (isActive: false) */
export function deleteService(id) {
  return apiRequest(`/admin/services/${id}`, {
    method: 'DELETE',
  })
}
