import { apiRequest } from './client'

/**
 * @typedef {{
 *   phoneNumber: string
 *   password: string
 *   fullName: string
 *   role: 'Manager' | 'Staff'
 *   branchId?: number | null
 * }} CreateEmployeePayload
 *
 * @typedef {{ branchId: number }} TransferEmployeePayload
 *
 * @typedef {{
 *   employeeId: number
 *   fullName: string
 *   phoneNumber: string
 *   role: string
 *   branchId: number
 *   branchName?: string
 *   isActive?: boolean
 *   assignedLaneId?: number
 *   assignedLaneName?: string
 * }} Employee
 */

/** @param {Record<string, unknown>} item @returns {Employee} */
function normalizeEmployee(item) {
  return {
    employeeId: Number(item.employeeId ?? item.id),
    fullName: String(item.fullName ?? ''),
    phoneNumber: String(item.phoneNumber ?? ''),
    role: String(item.role ?? ''),
    branchId: Number(item.branchId ?? 0),
    branchName: item.branchName != null ? String(item.branchName) : undefined,
    isActive: item.isActive !== false,
    assignedLaneId: item.assignedLaneId ?? undefined,
    assignedLaneName: item.assignedLaneName ?? undefined,
  }
}

/**
 * NOTE: The backend does NOT expose a GET endpoint for /admin/employees.
 * For Manager role, use fetchManagerStaffs() from manager.api.js instead.
 * For Admin role, there is no API to list all employees — this function is
 * kept as a no-op to avoid breaking existing callers.
 */
export async function fetchEmployees({ branchId } = {}) {
  // The backend does not expose a GET /admin/employees endpoint.
  // Manager role should use /manager/staff via fetchManagerStaffs().
  console.warn('fetchEmployees: backend has no GET /admin/employees — use manager.api fetchManagerStaffs() for Manager role.')
  return []
}

/** @param {CreateEmployeePayload} payload */
export function createEmployee(payload) {
  return apiRequest('/admin/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** @param {number} employeeId @param {TransferEmployeePayload} payload */
export function transferEmployee(employeeId, payload) {
  return apiRequest(`/admin/employees/${employeeId}/transfer`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
