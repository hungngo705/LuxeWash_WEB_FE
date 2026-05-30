import { apiRequest } from './client'

/**
 * @typedef {{ id: number; name: string; description?: string }} VehicleType
 * @typedef {{ name: string; description?: string }} VehicleTypePayload
 */

/** @returns {Promise<VehicleType[]>} */
export function fetchVehicleTypes() {
  return apiRequest('/admin/vehicle-types')
}

/** @param {VehicleTypePayload} payload @returns {Promise<VehicleType>} */
export function createVehicleType(payload) {
  return apiRequest('/admin/vehicle-types', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** @param {number} id @param {VehicleTypePayload} payload */
export function updateVehicleType(id, payload) {
  return apiRequest(`/admin/vehicle-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** @param {number} id */
export function deleteVehicleType(id) {
  return apiRequest(`/admin/vehicle-types/${id}`, {
    method: 'DELETE',
  })
}
