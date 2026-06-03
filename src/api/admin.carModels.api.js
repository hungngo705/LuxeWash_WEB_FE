import { apiRequest } from './client'

/**
 * @typedef {{
 *   id: number
 *   brand?: string
 *   name?: string
 *   isActive?: boolean
 * }} CarModel
 *
 * @typedef {{ brand?: string; name?: string }} CreateCarModelPayload
 * @typedef {{ brand?: string; name?: string; isActive?: boolean }} UpdateCarModelPayload
 */

/** @param {Record<string, unknown>} item @returns {CarModel} */
export function normalizeCarModel(item) {
  return {
    id: Number(item.carModelId ?? item.id),
    brand: item.brand != null ? String(item.brand) : '',
    name: item.name != null ? String(item.name) : '',
    isActive: item.isActive !== false,
  }
}

/** @returns {Promise<CarModel[]>} */
export async function fetchCarModels() {
  const data = await apiRequest('/CarModels')
  const list = Array.isArray(data) ? data : []
  return list.map(normalizeCarModel)
}

/** @param {CreateCarModelPayload} payload */
export function createCarModel(payload) {
  return apiRequest('/CarModels', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** @param {number} id @param {UpdateCarModelPayload} payload */
export function updateCarModel(id, payload) {
  return apiRequest(`/CarModels/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** @param {number} id */
export function deleteCarModel(id) {
  return apiRequest(`/CarModels/${id}`, {
    method: 'DELETE',
  })
}
