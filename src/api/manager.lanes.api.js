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
 *   assignedDate?: string
 * }} LaneAssignedStaff
 */

/** BE sometimes returns `{ value: T[] }` instead of a plain array. */
export function asManagerCollection(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray(data.value)) return data.value
  if (data && typeof data === 'object' && Array.isArray(data.items)) return data.items
  return []
}

/** @param {Record<string, unknown>} item @returns {ManagerLane} */
function normalize(item) {
  return {
    laneId: Number(item.laneId ?? item.id),
    name: String(item.name ?? ''),
    branchId: Number(item.branchId),
    isActive: item.isActive !== false,
  }
}

/** @param {Record<string, unknown>} item @returns {LaneAssignedStaff} */
export function normalizeLaneAssignedStaff(item) {
  return {
    userId: Number(item.userId ?? item.staffId ?? item.id),
    fullName: String(item.fullName ?? '—'),
    phoneNumber: String(item.phoneNumber ?? '—'),
    status: String(item.status ?? 'Active'),
    assignedDate: item.assignedDate != null ? String(item.assignedDate) : undefined,
  }
}

/**
 * GET /api/v1/manager/lanes
 * Returns all lanes in the Manager's branch.
 * @returns {Promise<ManagerLane[]>}
 */
export function fetchManagerLanes() {
  return apiRequest('/manager/lanes').then((data) => asManagerCollection(data).map(normalize))
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
 * Staff assigned to the lane for today (Swagger: Manager).
 * @param {number} laneId
 * @returns {Promise<LaneAssignedStaff[]>}
 */
export function fetchLaneAssignedStaff(laneId) {
  return apiRequest(`/manager/lanes/${laneId}/staff`).then((data) =>
    asManagerCollection(data).map(normalizeLaneAssignedStaff),
  )
}

/**
 * DELETE /api/v1/manager/lanes/{laneId}/staff/{staffId}
 * @param {number} laneId
 * @param {number} staffId
 */
export function unassignStaffFromLane(laneId, staffId) {
  return apiRequest(`/manager/lanes/${laneId}/staff/${staffId}`, { method: 'DELETE' })
}

/**
 * Load every lane with staff assigned today.
 * @returns {Promise<Array<{ lane: ManagerLane; staff: LaneAssignedStaff[] }>>}
 */
export async function fetchAllLaneStaffAssignments() {
  const lanes = await fetchManagerLanes()
  return Promise.all(
    lanes.map(async (lane) => {
      try {
        const staff = await fetchLaneAssignedStaff(lane.laneId)
        return { lane, staff }
      } catch {
        return { lane, staff: [] }
      }
    }),
  )
}
