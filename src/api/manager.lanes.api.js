import { apiRequest } from './client'

/**
 * @typedef {{
 *   laneId: number
 *   name: string
 *   branchId: number
 *   isActive?: boolean
 *   isBusinessLane?: boolean
 *   assignedStaff?: LaneAssignedStaff[]
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

/** BE sometimes returns `{ value: T[] }` or nested `data` instead of a plain array. */
export function asManagerCollection(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const obj = /** @type {Record<string, unknown>} */ (data)
    if (Array.isArray(obj.value)) return obj.value
    if (Array.isArray(obj.items)) return obj.items
    if (Array.isArray(obj.data)) return obj.data
  }
  return []
}

function toDateTimeQueryValue(date) {
  if (!date) return ''
  const value = String(date)
  return value.includes('T') ? value : `${value.slice(0, 10)}T00:00:00`
}

/** @param {Record<string, unknown>} item @returns {ManagerLane} */
function normalize(item) {
  const assignedStaff = Array.isArray(item.assignedStaff)
    ? item.assignedStaff.map(normalizeLaneAssignedStaff)
    : []

  return {
    laneId: Number(item.laneId ?? item.id),
    name: String(item.name ?? ''),
    branchId: Number(item.branchId),
    isActive: item.isActive !== false,
    isBusinessLane: item.isBusinessLane === true || item.IsBusinessLane === true,
    assignedStaff,
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
 * GET /api/v1/manager/lanes?date=
 * Returns all lanes in the Manager's branch with staff assigned for the requested date.
 * @param {{ date?: string }} [options] `date` is yyyy-MM-dd or full ISO; BE accepts DateTime?.
 * @returns {Promise<ManagerLane[]>}
 */
export function fetchManagerLanes(options = {}) {
  const date = toDateTimeQueryValue(options.date)
  const params = date ? `?date=${encodeURIComponent(date)}` : ''
  return apiRequest(`/manager/lanes${params}`).then((data) => asManagerCollection(data).map(normalize))
}

/**
 * POST /api/v1/manager/lanes
 * Creates a new lane in the Manager's branch.
 * @param {{ name: string, isBusinessLane?: boolean }} payload
 */
export function createManagerLane(payload) {
  return apiRequest('/manager/lanes', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      isBusinessLane: payload.isBusinessLane === true,
    }),
  })
}

/**
 * GET /api/v1/manager/lanes/{laneId}/staff
 * Staff assigned to the lane for the given date (defaults to today on BE side).
 * @param {number} laneId
 * @param {{ date?: string }} [options] `date` is yyyy-MM-dd or full ISO; BE accepts DateTime?.
 * @returns {Promise<LaneAssignedStaff[]>}
 */
export function fetchLaneAssignedStaff(laneId, options = {}) {
  const { date } = options
  const dateValue = toDateTimeQueryValue(date)
  const params = dateValue ? `?date=${encodeURIComponent(dateValue)}` : ''
  return apiRequest(`/manager/lanes/${laneId}/staff${params}`).then((data) =>
    asManagerCollection(data).map(normalizeLaneAssignedStaff),
  )
}

/**
 * DELETE /api/v1/manager/lanes/{laneId}/staff/{staffId}
 * @param {number} laneId
 * @param {number} staffId
 * @param {{ date?: string }} [options] `date` is yyyy-MM-dd or full ISO.
 */
export function unassignStaffFromLane(laneId, staffId, options = {}) {
  const { date } = options
  const dateValue = toDateTimeQueryValue(date)
  const params = dateValue ? `?date=${encodeURIComponent(dateValue)}` : ''
  return apiRequest(`/manager/lanes/${laneId}/staff/${staffId}${params}`, { method: 'DELETE' })
}

/**
 * Load every lane with staff assigned today.
 * @param {{ date?: string }} [options]
 * @returns {Promise<Array<{ lane: ManagerLane; staff: LaneAssignedStaff[] }>>}
 */
export async function fetchAllLaneStaffAssignments(options = {}) {
  const lanes = await fetchManagerLanes(options)
  if (!lanes.length) return []

  return lanes.map((lane) => ({
    lane,
    staff: Array.isArray(lane.assignedStaff) ? lane.assignedStaff : [],
  }))
}
