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
 */

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
