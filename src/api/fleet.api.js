import { apiRequest } from './client'

/** @param {unknown} data */
function asFleetCollection(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const obj = /** @type {Record<string, unknown>} */ (data)
    if (Array.isArray(obj.items)) return obj.items
    if (Array.isArray(obj.value)) return obj.value
    if (Array.isArray(obj.data)) return obj.data
  }
  return []
}

/** @param {Record<string, unknown>} item */
export function normalizeFleetPendingVehicle(item) {
  return {
    fleetVehicleId: Number(item.fleetVehicleId ?? item.id),
    licensePlate: String(item.licensePlate ?? ''),
    vehicleType: String(item.vehicleType ?? item.vehicleTypeName ?? ''),
    vehicleTypeId: item.vehicleTypeId != null ? Number(item.vehicleTypeId) : null,
    brand: String(item.brand ?? ''),
    model: String(item.model ?? item.carModel ?? ''),
    driverName: item.driverName != null ? String(item.driverName) : '',
    employeeCode: String(item.employeeCode ?? item.employeeId ?? ''),
    status: String(item.status ?? 'PendingApproval'),
    companyName: item.companyName ?? item.businessName ?? item.businessProfile?.companyName ?? '',
    createdAt: item.createdAt ?? null,
  }
}

/** GET /fleet/pending — xe chờ duyệt của doanh nghiệp đang đăng nhập */
export async function fetchBusinessPendingFleetVehicles() {
  const data = await apiRequest('/fleet/pending')
  return asFleetCollection(data).map(normalizeFleetPendingVehicle)
}

/** GET /fleet/staff/pending/all — Admin reviews pending fleet vehicles; backend route name is still staff. */
export async function fetchStaffPendingFleetVehicles(businessProfileId) {
  const qs =
    businessProfileId != null ? `?businessProfileId=${Number(businessProfileId)}` : ''
  const data = await apiRequest(`/fleet/staff/pending/all${qs}`)
  return asFleetCollection(data).map(normalizeFleetPendingVehicle)
}

/** @deprecated Dùng fetchBusinessPendingFleetVehicles hoặc fetchStaffPendingFleetVehicles */
export const fetchPendingFleetVehicles = fetchBusinessPendingFleetVehicles
export const fetchAdminPendingFleetVehicles = fetchStaffPendingFleetVehicles

/** POST /fleet/staff/approve/{id} */
export function approveFleetVehicle(fleetVehicleId) {
  return apiRequest(`/fleet/staff/approve/${fleetVehicleId}`, { method: 'POST' })
}

/** POST /fleet/staff/reject/{id} */
export function rejectFleetVehicle(fleetVehicleId, rejectionReason) {
  return apiRequest(`/fleet/staff/reject/${fleetVehicleId}`, {
    method: 'POST',
    body: JSON.stringify({ rejectionReason }),
  })
}

export const approveAdminFleetVehicle = approveFleetVehicle
export const rejectAdminFleetVehicle = rejectFleetVehicle

/** GET /fleet/staff/imports — lịch sử nhập (Staff/Manager) */
export async function fetchFleetImportBatches() {
  const data = await apiRequest('/fleet/staff/imports')
  return asFleetCollection(data)
}

/** GET /fleet/staff/imports/{batchId} */
export function fetchFleetImportBatchDetail(batchId) {
  return apiRequest(`/fleet/staff/imports/${batchId}`)
}

/** POST /fleet/check-in */
export function fleetCheckIn(bookingId) {
  return apiRequest('/fleet/check-in', {
    method: 'POST',
    body: JSON.stringify({ bookingId: Number(bookingId) }),
  })
}

/** POST /fleet/walk-out/{washLogId} */
export function fleetWalkOut(washLogId) {
  return apiRequest(`/fleet/walk-out/${washLogId}`, { method: 'POST' })
}

/** POST /fleet/{washLogId}/start-processing */
export function fleetStartProcessing(washLogId, laneId) {
  return apiRequest(`/fleet/${washLogId}/start-processing`, {
    method: 'POST',
    body: JSON.stringify(laneId != null ? { laneId: Number(laneId) } : {}),
  })
}

/** POST /fleet/checkout/{washLogId} */
export function fleetCheckout(washLogId) {
  return apiRequest(`/fleet/checkout/${washLogId}`, { method: 'POST' })
}

/** GET /fleet/queue */
export async function fetchFleetQueue(branchId) {
  const qs = branchId != null ? `?branchId=${Number(branchId)}` : ''
  const data = await apiRequest(`/fleet/queue${qs}`)
  return asFleetCollection(data)
}

/** GET /fleet/current */
export async function fetchFleetCurrent(branchId) {
  const qs = branchId != null ? `?branchId=${Number(branchId)}` : ''
  const data = await apiRequest(`/fleet/current${qs}`)
  return asFleetCollection(data)
}

/** GET /fleet/history */
export async function fetchFleetHistory(filter = {}) {
  const params = new URLSearchParams()
  if (filter.page) params.set('Page', String(filter.page))
  if (filter.pageSize) params.set('PageSize', String(filter.pageSize))
  if (filter.fromDate) params.set('FromDate', filter.fromDate)
  if (filter.toDate) params.set('ToDate', filter.toDate)
  if (filter.branchId) params.set('BranchId', String(filter.branchId))
  const qs = params.toString()
  const data = await apiRequest(`/fleet/history${qs ? `?${qs}` : ''}`)
  return asFleetCollection(data)
}

/** GET /fleet/dashboard */
export function fetchFleetOperationsDashboard() {
  return apiRequest('/fleet/dashboard')
}
