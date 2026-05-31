import { apiRequest } from './client'

/**
 * @typedef {{
 *   licensePlate: string
 *   customerName: string
 *   phoneMasked: string
 *   requestedTypeName: string
 *   userNote: string
 *   submittedAt: string | null
 *   status: string
 * }} PendingVehicleApproval
 *
 * @typedef {{
 *   customizedTypeName?: string
 *   description?: string
 * }} ApproveVehicleTypePayload
 */

/** @returns {Promise<unknown[]>} */
export function fetchPendingVehicleApprovals() {
  return apiRequest('/admin/vehicles/other-types')
}

/**
 * @param {string} licensePlate
 * @param {ApproveVehicleTypePayload} [payload]
 */
export function approveNewVehicleType(licensePlate, payload = {}) {
  return apiRequest(
    `/admin/vehicles/${encodeURIComponent(licensePlate)}/approve-new-type`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

/** @param {string} licensePlate */
export function rejectNewVehicleType(licensePlate) {
  return apiRequest(
    `/admin/vehicles/${encodeURIComponent(licensePlate)}/reject-new-type`,
    {
      method: 'POST',
    },
  )
}

/** @param {Record<string, unknown>} item @returns {PendingVehicleApproval} */
export function normalizePendingApproval(item) {
  const phone = item.phoneMasked ?? item.phoneNumber
  const requestedType =
    item.requestedTypeName ?? item.customizedTypeName ?? item.customTypeName
  const note = item.userNote ?? item.description

  return {
    licensePlate: String(item.licensePlate ?? ''),
    customerName: String(item.customerName ?? item.fullName ?? item.ownerName ?? '—'),
    phoneMasked: phone ? String(phone) : '—',
    requestedTypeName: requestedType ? String(requestedType) : '—',
    userNote: note ? String(note) : '—',
    submittedAt: item.submittedAt ?? item.createdAt ?? null,
    status: String(item.status ?? 'Pending'),
  }
}
