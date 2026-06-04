import { apiRequest } from './client'

/**
 * @typedef {{
 *   laneId: number
 *   name: string
 *   branchId: number
 *   isActive?: boolean
 * }} ManagerLane
 *
 * @typedef {{
 *   userId: number
 *   fullName: string
 *   phoneNumber: string
 *   status: string
 * }} LaneAssignedStaff
 */

/** @param {Record<string, unknown>} item @returns {ManagerLane} */
function normalize(item) {
  return {
    laneId: Number(item.laneId ?? item.id),
    name: String(item.name ?? ''),
    branchId: Number(item.branchId),
    isActive: item.isActive !== false,
  }
}

/**
 * GET /api/v1/manager/lanes
 * Returns all lanes in the Manager's branch.
 * @returns {Promise<ManagerLane[]>}
 */
export function fetchManagerLanes() {
  return apiRequest('/manager/lanes').then((data) => {
    const list = Array.isArray(data) ? data : []
    return list.map(normalize)
  })
}

/**
 * POST /api/v1/manager/lanes
 * Creates a new lane in the Manager's branch.
 * @param {{ name: string }} payload
 */
export function createManagerLane(payload) {
  return apiRequest('/manager/lanes', {
    method: 'POST',
    body: JSON.stringify({ name: payload.name }),
  })
}

/**
 * GET /api/v1/manager/lanes/{laneId}/staff
 * Returns staff assigned to a specific lane for today.
 * @param {number} laneId
 * @returns {Promise<LaneAssignedStaff[]>}
 */
export function fetchLaneAssignedStaff(laneId) {
  return apiRequest(`/manager/lanes/${laneId}/staff`)
}
