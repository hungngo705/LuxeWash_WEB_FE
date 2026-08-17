import { apiRequest } from './client'

/**
 * @typedef {{
 *   laneId: number
 *   name: string
 *   branchId: number
 *   isActive?: boolean
 *   isVipLane?: boolean
 * }} ManagerLane
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
  return {
    laneId: Number(item.laneId ?? item.id),
    name: String(item.name ?? ''),
    branchId: Number(item.branchId),
    isActive: item.isActive !== false,
    isBusinessLane: item.isBusinessLane === true || item.IsBusinessLane === true,
    isVipLane: item.isVipLane === true || item.IsVipLane === true,
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
