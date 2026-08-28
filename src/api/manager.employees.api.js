import { apiRequest } from './client'

/**
 * @typedef {{
 *   userId: number
 *   fullName: string
 *   phoneNumber: string
 *   status: string
 *   shiftId?: number
 *   shiftName?: string
 * }} ManagerStaffMember
 *
 * @typedef {{
 *   totalManagers: number
 *   totalStaff: number
 *   managers: Array<{
 *     userId: number
 *     phoneNumber: string
 *     fullName: string
 *     role: string
 *     status: string
 *     branchId: number
 *   }>
 *   staff: Array<{
 *     userId: number
 *     phoneNumber: string
 *     fullName: string
 *     role: string
 *     status: string
 *     branchId: number
 *   }>
 * }} BranchEmployeesSummary
 */

/** @param {Record<string, unknown>} item @returns {ManagerStaffMember} */
export function normalizeManagerStaff(item) {
  return {
    userId: Number(item.userId ?? item.staffId ?? item.id),
    fullName: String(item.fullName ?? '—'),
    phoneNumber: String(item.phoneNumber ?? '—'),
    status: String(item.status ?? 'Active'),
    shiftId: item.shiftId != null ? Number(item.shiftId) : undefined,
    shiftName: item.shiftName != null ? String(item.shiftName) : undefined,
  }
}

/**
 * GET /api/v1/admin/branches/{branchId}/employees
 * Returns a summary of all managers and staff at a specific branch.
 * @param {number} branchId
 * @returns {Promise<BranchEmployeesSummary>}
 */
export function fetchBranchEmployeesSummary(branchId) {
  return apiRequest(`/admin/branches/${branchId}/employees`)
}

/**
 * GET /api/v1/admin/branches/employees-summary
 * Returns a summary of all managers and staff for every branch in a single call,
 * avoiding one HTTP/DB round trip per branch.
 * @returns {Promise<Array<BranchEmployeesSummary & { branchId: number }>>}
 */
export function fetchAllBranchesEmployeesSummary() {
  return apiRequest('/admin/branches/employees-summary')
}

/**
 * POST /api/v1/admin/employees
 * Creates a new employee (Staff or Manager) — Admin-only operation.
 * @param {{ fullName: string; phoneNumber: string; password: string; role?: string }} payload
 */
export function createManagerStaff(payload) {
  return apiRequest('/admin/employees', {
    method: 'POST',
    body: JSON.stringify({
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      password: payload.password,
      role: payload.role ?? 'Staff',
    }),
  })
}
