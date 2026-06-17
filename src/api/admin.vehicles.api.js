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
  return {
    licensePlate: String(item.licensePlate ?? ''),
    vehicleTypeId: item.vehicleTypeId != null ? Number(item.vehicleTypeId) : null,
    vehicleTypeName: String(item.vehicleTypeName ?? item.requestedTypeName ?? '—'),
    ownerName: String(item.ownerName ?? item.customerName ?? item.fullName ?? '—'),
    ownerPhone: item.ownerPhone ?? item.phoneNumber ?? null,
    registrationPhotoUrl: item.registrationPhotoUrl ?? null,
    userNote: String(item.userNote ?? item.carModel ?? ''),
    carModel: String(item.carModel ?? ''),
    userId: item.userId != null ? Number(item.userId) : null,
    submittedAt: item.createdAt ?? item.submittedAt ?? null,
    status: String(item.status ?? 'Pending'),
  }
}
