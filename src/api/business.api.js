import { apiRequest, API_BASE_URL } from './client'
import { ApiError } from './errors'

/** @param {unknown} data */
export function asBusinessCollection(data) {
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
export function normalizeBusinessVehicle(item) {
  return {
    fleetVehicleId: Number(item.fleetVehicleId ?? item.id),
    licensePlate: String(item.licensePlate ?? ''),
    vehicleType: String(item.vehicleType ?? item.vehicleTypeName ?? ''),
    vehicleTypeId: item.vehicleTypeId != null ? Number(item.vehicleTypeId) : null,
    brand: String(item.brand ?? ''),
    model: String(item.model ?? item.carModel ?? ''),
    driverName: item.driverName != null ? String(item.driverName) : '',
    employeeCode: item.employeeCode != null ? String(item.employeeCode) : '',
    status: String(item.status ?? 'Unknown'),
  }
}

/** @param {Record<string, unknown>} item */
export function normalizeBusinessBooking(item) {
  return {
    ...item,
    bookingId: Number(item.bookingId ?? item.id),
    licensePlate: item.licensePlate ?? item.fleetVehicle?.licensePlate ?? '',
    branchName: item.branchName ?? item.branch?.name ?? '',
    scheduledTime: item.scheduledTime ?? item.targetDate ?? item.createdAt,
  }
}

/** @param {Record<string, unknown>} item */
export function normalizeBusinessService(item) {
  const serviceId = Number(item.serviceId ?? item.id)
  const prices = Array.isArray(item.prices) ? item.prices : []
  return {
    serviceId,
    id: serviceId,
    name: String(item.serviceName ?? item.name ?? ''),
    description: item.description != null ? String(item.description) : '',
    isActive: item.isActive !== false,
    prices,
    price: prices[0]?.price != null ? Number(prices[0].price) : 0,
  }
}

/** @param {Record<string, unknown>} service @param {{ branchId?: number; vehicleTypeId?: number }} ctx */
export function getServicePriceForContext(service, ctx = {}) {
  const prices = Array.isArray(service.prices) ? service.prices : []
  if (!prices.length) return Number(service.price ?? 0)

  const { branchId, vehicleTypeId } = ctx
  const match =
    prices.find(
      (p) =>
        (branchId == null || Number(p.branchId) === Number(branchId)) &&
        (vehicleTypeId == null || Number(p.vehicleTypeId) === Number(vehicleTypeId)),
    ) ??
    prices.find((p) => branchId == null || Number(p.branchId) === Number(branchId)) ??
    prices[0]

  return Number(match?.price ?? 0)
}

/** @param {Record<string, unknown> | null | undefined} vehicle @param {Array<Record<string, unknown>>} [services] */
export function resolveVehicleTypeId(vehicle, services = []) {
  if (vehicle?.vehicleTypeId != null) return Number(vehicle.vehicleTypeId)

  const typeName = String(vehicle?.vehicleType ?? vehicle?.vehicleTypeName ?? '')
    .trim()
    .toLowerCase()
  if (!typeName) return null

  for (const svc of services) {
    for (const price of svc.prices ?? []) {
      const priceName = String(price.vehicleTypeName ?? '').trim().toLowerCase()
      if (!priceName) continue
      if (typeName.includes(priceName) || priceName.includes(typeName)) {
        return Number(price.vehicleTypeId)
      }
    }
  }

  if (typeName.includes('suv')) {
    const suv = services
      .flatMap((svc) => svc.prices ?? [])
      .find((p) => String(p.vehicleTypeName ?? '').toLowerCase().includes('suv'))
    if (suv) return Number(suv.vehicleTypeId)
  }
  if (typeName.includes('sedan')) {
    const sedan = services
      .flatMap((svc) => svc.prices ?? [])
      .find((p) => String(p.vehicleTypeName ?? '').toLowerCase().includes('sedan'))
    if (sedan) return Number(sedan.vehicleTypeId)
  }

  return null
}

/** @param {Record<string, unknown>} item */
export function normalizeBusinessSlot(item) {
  const timeRange = String(item.timeRange ?? '')
  const [start = '', end = ''] = timeRange.split(/\s*-\s*/)
  return {
    slotId: Number(item.slotId),
    timeRange,
    startTime: String(item.startTime ?? start).trim(),
    endTime: String(item.endTime ?? end).trim(),
    isAvailable: item.isAvailable === true,
    reason: item.reason != null ? String(item.reason) : '',
  }
}

// === Profile ===

export const fetchBusinessProfile = () => apiRequest('/business/my-profile')

/** BE chưa expose PUT /business/profile — giữ stub để tránh crash nếu gọi nhầm */
export async function updateBusinessProfile() {
  throw new ApiError('Cập nhật hồ sơ doanh nghiệp chưa được hỗ trợ trên API.', 405)
}

// === Dashboard ===

export const fetchBusinessDashboard = () => apiRequest('/business/dashboard')

/** @deprecated Dùng fetchBusinessDashboard — cùng schema trên BE */
export const fetchFleetDashboard = () => apiRequest('/fleet/dashboard')

// === Services (public — Business không truy cập /admin/services) ===

export async function fetchBusinessServices() {
  const data = await apiRequest('/services')
  return asBusinessCollection(data).map(normalizeBusinessService)
}

// === Fleet Vehicles ===

export async function fetchFleetVehicles() {
  const data = await apiRequest('/business/vehicles')
  return asBusinessCollection(data).map(normalizeBusinessVehicle)
}

export async function fetchFleetVehicleDetail(id) {
  const vehicles = await fetchFleetVehicles()
  const vehicle = vehicles.find((v) => String(v.fleetVehicleId) === String(id))
  if (!vehicle) {
    throw new ApiError('Không tìm thấy xe trong danh sách.', 404)
  }
  return vehicle
}

import {
  approveFleetVehicle,
  fetchBusinessPendingFleetVehicles,
  rejectFleetVehicle,
} from './fleet.api'

export const fetchPendingVehicles = fetchBusinessPendingFleetVehicles
export const approveVehicle = approveFleetVehicle
export const rejectVehicle = rejectFleetVehicle

/** @returns {Promise<{ fileName?: string; downloadUrl?: string }>} */
export async function fetchFleetTemplate() {
  return apiRequest('/fleet/template')
}

export async function importFleet(formData) {
  const payload = formData instanceof FormData ? formData : new FormData()
  if (formData instanceof FormData && formData.has('file') && !formData.has('File')) {
    const file = formData.get('file')
    if (file) {
      payload.delete('file')
      payload.append('File', file)
    }
  }
  return apiRequest('/fleet/import', {
    method: 'POST',
    body: payload,
  })
}

/**
 * BE chưa expose lịch sử nhập cho role Business (GET /fleet/staff/imports → 403).
 * Giữ hàm để trang không crash; trả lỗi rõ ràng khi gọi.
 */
export async function fetchImportHistory() {
  try {
    const data = await apiRequest('/fleet/staff/imports')
    return asBusinessCollection(data)
  } catch (err) {
    if (err instanceof ApiError && err.isForbidden) {
      throw new ApiError(
        'Lịch sử nhập xe chưa khả dụng cho tài khoản doanh nghiệp trên API hiện tại.',
        403,
      )
    }
    throw err
  }
}

export const fetchImportBatchDetail = (batchId) =>
  apiRequest(`/fleet/staff/imports/${batchId}`)

// === Bookings ===

export async function fetchBusinessBookings() {
  const data = await apiRequest('/business')
  return asBusinessCollection(data).map(normalizeBusinessBooking)
}

export const fetchBookingDetail = (id) => apiRequest(`/business/${id}`)

export const createBusinessBooking = (dto) =>
  apiRequest('/business/bookings', {
    method: 'POST',
    body: JSON.stringify({
      ...dto,
      scheduledTime: dto.scheduledTime?.includes('T')
        ? dto.scheduledTime
        : `${dto.scheduledTime}T00:00:00.000Z`,
    }),
  })

export const cancelBooking = (id) =>
  apiRequest(`/business/${id}/cancel`, { method: 'POST' })

/**
 * GET /business/available-slots — không yêu cầu hạng thành viên
 * @param {{ branchId: number; fleetVehicleId: number; targetDate: string; serviceIds: number[] }} params
 */
export async function getBusinessAvailableSlots({
  branchId,
  fleetVehicleId,
  targetDate,
  serviceIds,
}) {
  const params = new URLSearchParams()
  params.set('BranchId', String(branchId))
  params.set('FleetVehicleId', String(fleetVehicleId))
  const dateIso = targetDate.includes('T') ? targetDate : `${targetDate}T00:00:00.000Z`
  params.set('TargetDate', dateIso)
  for (const id of serviceIds) {
    params.append('ServiceIds', String(id))
  }

  const data = await apiRequest(`/business/available-slots?${params}`)
  return asBusinessCollection(data).map(normalizeBusinessSlot)
}

/** @deprecated Dùng getBusinessAvailableSlots */
export const getAvailableSlots = getBusinessAvailableSlots

// === Walk-in / Fleet Queue (Staff-only trên BE — Business dùng fallback từ bookings) ===

export const createWalkIn = (dto) =>
  apiRequest('/fleet/walk-in', {
    method: 'POST',
    body: JSON.stringify(dto),
  })

export async function fetchFleetQueue(branchId) {
  try {
    const data = await apiRequest(
      `/fleet/queue${branchId ? `?branchId=${branchId}` : ''}`,
    )
    return asBusinessCollection(data)
  } catch (err) {
    if (err instanceof ApiError && err.isForbidden) {
      return fetchBusinessBookings().then((bookings) =>
        bookings.filter((b) => ['Pending', 'Confirmed', 'CheckedIn'].includes(String(b.status))),
      )
    }
    throw err
  }
}

export async function fetchCurrentVehicles(branchId) {
  try {
    const data = await apiRequest(
      `/fleet/current${branchId ? `?branchId=${branchId}` : ''}`,
    )
    return asBusinessCollection(data)
  } catch (err) {
    if (err instanceof ApiError && err.isForbidden) {
      return fetchBusinessBookings().then((bookings) =>
        bookings.filter((b) => ['Processing', 'CheckedIn'].includes(String(b.status))),
      )
    }
    throw err
  }
}

// === History ===

export function fetchBusinessHistory(filter = {}) {
  const params = new URLSearchParams()
  if (filter.page) params.set('Page', String(filter.page))
  if (filter.pageSize) params.set('PageSize', String(filter.pageSize))
  if (filter.fleetVehicleId) params.set('FleetVehicleId', String(filter.fleetVehicleId))
  if (filter.fromDate) params.set('FromDate', filter.fromDate)
  if (filter.toDate) params.set('ToDate', filter.toDate)
  if (filter.branchId) params.set('BranchId', String(filter.branchId))
  if (filter.status) params.set('Status', filter.status)

  const qs = params.toString()
  return apiRequest(`/business/history${qs ? `?${qs}` : ''}`).then((data) => {
    if (Array.isArray(data)) {
      return { items: data, totalPages: 1 }
    }
    if (data && typeof data === 'object') {
      const obj = /** @type {Record<string, unknown>} */ (data)
      return {
        items: asBusinessCollection(obj.items ?? obj),
        totalPages: Number(obj.totalPages ?? 1),
        totalItems: Number(obj.totalItems ?? asBusinessCollection(obj.items ?? obj).length),
      }
    }
    return { items: [], totalPages: 1 }
  })
}

// === Invoices ===

export async function fetchBusinessInvoices(filter = {}) {
  const params = new URLSearchParams()
  if (filter.page) params.set('page', String(filter.page))
  if (filter.pageSize) params.set('pageSize', String(filter.pageSize))
  if (filter.status) params.set('status', filter.status)
  const qs = params.toString()
  const data = await apiRequest(`/invoice/invoices${qs ? `?${qs}` : ''}`)
  return asBusinessCollection(data)
}

export const fetchInvoiceDetail = (id) => apiRequest(`/invoice/invoices/${id}`)

export const exportInvoice = (id) => apiRequest(`/business/invoices/${id}/export`)

export const downloadInvoicePdf = (id) => {
  window.open(`${API_BASE_URL}/invoice/invoices/${id}/pdf`, '_blank')
}

export const fetchBookingInvoice = (bookingId) =>
  apiRequest(`/business/invoice/${bookingId}`)

// === Statements ===

export const fetchMonthlyStatement = (year, month) =>
  apiRequest(`/business/statements/monthly?year=${year}&month=${month}`)

// === Business Registration ===

export const registerBusinessProfile = (formData) =>
  apiRequest('/business/register', {
    method: 'POST',
    body: formData,
  })

// === Business Applications (Admin/Manager) — Swagger: /business/admin/* ===

export async function fetchPendingApplications() {
  const data = await apiRequest('/business/admin/pending-applications')
  return asBusinessCollection(data)
}

export const fetchApplicationDetail = (id) =>
  apiRequest(`/business/admin/application/${id}`)

export const reviewApplication = (dto) =>
  apiRequest('/business/admin/review-application', {
    method: 'POST',
    body: JSON.stringify(dto),
  })
