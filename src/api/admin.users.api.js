import { apiRequest } from './client'

/**
 * @typedef {{
 *   userId: number
 *   fullName: string
 *   phoneNumber: string
 *   tierName?: string
 *   status?: string
 *   lastVisitDate?: string | null
 *   role?: string
 * }} UserListItem
 *
 * @typedef {{
 *   userId: number
 *   fullName: string
 *   phoneNumber: string
 *   tierName?: string
 *   totalPoint?: number
 *   promotionPoint?: number
 *   churnScore?: number
 *   vehicles?: Array<{
 *     licensePlate?: string
 *     vehicleType?: string
 *     vehicleTypeName?: string
 *     displayName?: string
 *   }>
 * }} UserDetail
 *
 * @typedef {{
 *   items: UserListItem[]
 *   totalItems: number
 *   totalPages: number
 *   currentPage: number
 * }} UserListPage
 *
 * @typedef {{
 *   page?: number
 *   pageSize?: number
 *   keyword?: string
 *   status?: 'Active' | 'Blocked'
 * }} FetchUsersParams
 */

/** @param {FetchUsersParams & { signal?: AbortSignal }} [params] @returns {Promise<UserListPage>} */
export function fetchUsers(params = {}) {
  const { signal, ...rest } = params
  const searchParams = new URLSearchParams()

  if (rest.page) searchParams.set('page', String(rest.page))
  if (rest.pageSize) searchParams.set('pageSize', String(rest.pageSize))
  if (rest.keyword) searchParams.set('keyword', rest.keyword)
  if (rest.status) searchParams.set('status', rest.status)

  const query = searchParams.toString()
  return apiRequest(`/admin/users${query ? `?${query}` : ''}`, signal ? { signal } : undefined)
}

/** @param {Record<string, unknown>} vehicle */
export function normalizeUserVehicle(vehicle) {
  const typeLabel =
    vehicle.vehicleType ??
    vehicle.vehicleTypeName ??
    vehicle.typeName ??
    null

  return {
    licensePlate: String(vehicle.licensePlate ?? '').trim(),
    vehicleType: typeLabel ? String(typeLabel) : '',
    vehicleTypeName: typeLabel ? String(typeLabel) : '',
    displayName: String(vehicle.displayName ?? vehicle.vehicleDisplayName ?? '').trim(),
  }
}

/** @param {UserDetail} detail */
export function normalizeUserDetail(detail) {
  return {
    ...detail,
    vehicles: Array.isArray(detail.vehicles) ? detail.vehicles.map(normalizeUserVehicle) : [],
  }
}

/** @param {number} id @param {{ signal?: AbortSignal }} [options] @returns {Promise<UserDetail>} */
export function fetchUserById(id, options = {}) {
  return apiRequest(`/admin/users/${id}`, options).then(normalizeUserDetail)
}

/** @param {number} id @param {'Active' | 'Blocked'} status */
export function updateUserStatus(id, status) {
  return apiRequest(`/admin/users/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

/** POST /admin/users/sync-points */
export function syncUserPoints() {
  return apiRequest('/admin/users/sync-points', { method: 'POST' })
}

/** @param {UserListItem} item */
export function normalizeListUser(item) {
  return {
    ...item,
    role: item.role ?? 'Customer',
    userStatus: item.status ?? 'Active',
  }
}
