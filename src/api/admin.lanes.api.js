import { apiRequest } from './client'

/**
 * @typedef {{
 *   id: number
 *   name: string
 *   branchId: number
 *   branchName?: string
 *   isActive?: boolean
 * }} Lane
 *
 * @typedef {{ name: string; branchId: number }} CreateLanePayload
 * @typedef {{ name: string; branchId: number; isActive?: boolean }} UpdateLanePayload
 */

/** @param {Record<string, unknown>} item @returns {Lane} */
export function normalizeLane(item) {
  return {
    id: Number(item.laneId ?? item.id),
    name: String(item.name ?? ''),
    branchId: Number(item.branchId),
    branchName: item.branchName != null ? String(item.branchName) : undefined,
    isActive: item.isActive !== false,
  }
}

/** @param {{ branchId?: number | string }} [options] @returns {Promise<Lane[]>} */
export async function fetchLanes({ branchId } = {}) {
  const params = branchId ? `?branchId=${branchId}` : ''
  const data = await apiRequest(`/admin/lanes${params}`)
  const list = Array.isArray(data) ? data : []
  return list.map(normalizeLane)
}

/** @param {number} id @returns {Promise<Lane>} */
export async function fetchLaneById(id) {
  const data = await apiRequest(`/admin/lanes/${id}`)
  return normalizeLane(data)
}

/** @param {CreateLanePayload} payload */
export function createLane(payload) {
  return apiRequest('/admin/lanes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** @param {number} id @param {UpdateLanePayload} payload */
export function updateLane(id, payload) {
  return apiRequest(`/admin/lanes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
