import { apiRequest } from './client'

/**
 * @typedef {{
 *   id: number
 *   name: string
 *   address?: string
 *   isActive?: boolean
 * }} Branch
 *
 * @typedef {{ name: string; address?: string }} CreateBranchPayload
 * @typedef {{ name: string; address?: string; isActive?: boolean }} UpdateBranchPayload
 */

/** @param {Record<string, unknown>} item @returns {Branch} */
export function normalizeBranch(item) {
  return {
    id: Number(item.branchId ?? item.id),
    name: String(item.name ?? ''),
    address: item.address != null ? String(item.address) : '',
    isActive: item.isActive !== false,
  }
}

/** @returns {Promise<Branch[]>} */
export async function fetchBranches() {
  const data = await apiRequest('/branches')
  const list = Array.isArray(data) ? data : []
  return list.map(normalizeBranch)
}

/** @param {number} id @returns {Promise<Branch>} */
export async function fetchBranchById(id) {
  const data = await apiRequest(`/admin/branches/${id}`)
  return normalizeBranch(data)
}

/** @param {CreateBranchPayload} payload */
export function createBranch(payload) {
  return apiRequest('/admin/branches', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** @param {number} id @param {UpdateBranchPayload} payload */
export function updateBranch(id, payload) {
  return apiRequest(`/admin/branches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
