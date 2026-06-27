import { apiRequest, API_BASE_URL } from './client'
import { fetchBranches } from './admin.branches.api'
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
    branchId: item.branchId != null ? Number(item.branchId) : null,
    branchName:
      item.branchName != null && String(item.branchName).trim()
        ? String(item.branchName)
        : item.branch?.name != null && String(item.branch.name).trim()
          ? String(item.branch.name)
          : '',
    scheduledTime: item.scheduledTime ?? item.targetDate ?? item.createdAt,
    finalAmount: item.finalAmount != null ? Number(item.finalAmount) : undefined,
  }
}

/** BE list/detail thường không trả branchName — map từ GET /branches */
export function applyBusinessBranchNames(bookings, branches) {
  const list = Array.isArray(bookings) ? bookings : []
  const branchList = Array.isArray(branches) ? branches : []
  const branchMap = new Map(branchList.map((b) => [b.id, b.name]))
  const singleBranch = branchList.length === 1 ? branchList[0] : null

  return list.map((booking) => {
    if (booking.branchName?.trim()) return booking

    const fromId =
      booking.branchId != null ? branchMap.get(booking.branchId) : undefined
    if (fromId) {
      return { ...booking, branchName: fromId }
    }

    if (singleBranch) {
      return {
        ...booking,
        branchId: booking.branchId ?? singleBranch.id,
        branchName: singleBranch.name,
      }
    }

    return booking
  })
}

const BOOKING_BRANCH_CACHE_KEY = 'luxewash:business:bookingBranches'

/** @returns {Record<string, { branchId?: number; branchName?: string }>} */
function loadBookingBranchCache() {
  try {
    const raw = localStorage.getItem(BOOKING_BRANCH_CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** @param {number | string} bookingId @param {{ branchId?: number; branchName?: string }} meta */
function saveBookingBranchCache(bookingId, meta) {
  try {
    const cache = loadBookingBranchCache()
    cache[String(bookingId)] = meta
    localStorage.setItem(BOOKING_BRANCH_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage có thể không khả dụng
  }
}

/**
 * Suy luận chi nhánh từ giá dịch vụ + loại xe khi BE không trả branchId.
 * @param {ReturnType<typeof normalizeBusinessBooking>} booking
 * @param {ReturnType<typeof normalizeBusinessVehicle>[]} vehicles
 * @param {ReturnType<typeof normalizeBusinessService>[]} services
 * @param {Awaited<ReturnType<typeof fetchBranches>>} branches
 */
function inferBookingBranch(booking, vehicles, services, branches) {
  const amount = booking.finalAmount
  if (amount == null || !Number.isFinite(Number(amount))) return null

  const plate = String(booking.licensePlate ?? '').toLowerCase()
  const vehicle = vehicles.find(
    (v) => String(v.licensePlate ?? '').toLowerCase() === plate,
  )
  const vehicleTypeId = vehicle?.vehicleTypeId
  const vehicleTypeName = String(vehicle?.vehicleType || vehicle?.vehicleTypeName || '')
    .trim()
    .toLowerCase()

  /** @type {{ branchId: number; branchName: string } | null} */
  let match = null

  for (const service of services) {
    for (const priceRow of service.prices ?? []) {
      if (Number(priceRow.price) !== Number(amount)) continue

      const typeMatches =
        vehicleTypeId != null
          ? Number(priceRow.vehicleTypeId) === Number(vehicleTypeId)
          : vehicleTypeName &&
            String(priceRow.vehicleTypeName ?? '').trim().toLowerCase() === vehicleTypeName

      if (!typeMatches) continue

      const branchId = Number(priceRow.branchId)
      const branch = branches.find((b) => b.id === branchId)
      if (!branch) continue

      if (match && match.branchId !== branchId) {
        return null
      }
      match = { branchId, branchName: branch.name }
    }
  }

  return match
}

/**
 * @param {ReturnType<typeof normalizeBusinessBooking>[]} bookings
 */
async function enrichBusinessBookingsWithBranches(bookings) {
  try {
    const [branches, vehicles, services] = await Promise.all([
      fetchBranches(),
      fetchFleetVehicles().catch(() => []),
      fetchBusinessServices().catch(() => []),
    ])

    const cache = loadBookingBranchCache()

    const enriched = bookings.map((booking) => {
      if (booking.branchName?.trim()) return booking

      const bookingId = booking.bookingId ?? booking.id
      const cached = cache[String(bookingId)]
      if (cached?.branchName?.trim()) {
        return {
          ...booking,
          branchId: cached.branchId ?? booking.branchId,
          branchName: cached.branchName,
        }
      }

      if (booking.branchId != null) {
        const branch = branches.find((b) => b.id === booking.branchId)
        if (branch) {
          return { ...booking, branchName: branch.name }
        }
      }

      const inferred = inferBookingBranch(booking, vehicles, services, branches)
      if (inferred) {
        return {
          ...booking,
          branchId: inferred.branchId,
          branchName: inferred.branchName,
        }
      }

      return booking
    })

    return applyBusinessBranchNames(enriched, branches)
  } catch {
    return bookings
  }
}

/** @param {unknown} raw @param {number} total @param {number} count @param {number} index */
function normalizeBookingServiceLine(raw, total, count, index) {
  if (typeof raw === 'string') {
    if (count === 1) return { name: raw, price: total }
    if (total > 0 && count > 1) {
      const share = Math.round(total / count)
      const price = index === count - 1 ? total - share * (count - 1) : share
      return { name: raw, price }
    }
    return { name: raw, price: null }
  }

  if (raw && typeof raw === 'object') {
    const svc = /** @type {Record<string, unknown>} */ (raw)
    return {
      name: String(svc.serviceName ?? svc.name ?? '—'),
      price:
        svc.price != null
          ? Number(svc.price)
          : svc.amount != null
          ? Number(svc.amount)
          : null,
    }
  }

  return { name: '—', price: null }
}

/** Chuẩn hóa GET /business/{id} — BE trả services là string[] và không có branch/vehicleType */
export function normalizeBusinessBookingDetail(item) {
  const record = /** @type {Record<string, unknown>} */ (item)
  const finalAmount =
    record.finalAmount != null ? Number(record.finalAmount) : null
  const originalPrice =
    record.originalPrice != null ? Number(record.originalPrice) : null
  const total = finalAmount ?? originalPrice ?? 0
  const rawServices = Array.isArray(record.services) ? record.services : []

  const laneId =
    record.laneId != null
      ? Number(record.laneId)
      : record.lane?.id != null
        ? Number(record.lane.id)
        : null
  const laneName =
    record.laneName != null && String(record.laneName).trim()
      ? String(record.laneName)
      : record.lane?.name != null
        ? String(record.lane.name)
        : record.processingLaneName != null
          ? String(record.processingLaneName)
          : ''

  return {
    ...record,
    bookingId: Number(record.bookingId ?? record.id),
    licensePlate: String(
      record.licensePlate ?? record.fleetVehicle?.licensePlate ?? '',
    ),
    vehicleType: String(
      record.vehicleType ??
        record.vehicleTypeName ??
        record.fleetVehicle?.vehicleType ??
        record.fleetVehicle?.vehicleTypeName ??
        '',
    ),
    vehicleTypeId:
      record.vehicleTypeId != null
        ? Number(record.vehicleTypeId)
        : record.fleetVehicle?.vehicleTypeId != null
          ? Number(record.fleetVehicle.vehicleTypeId)
          : null,
    branchId: record.branchId != null ? Number(record.branchId) : null,
    branchName:
      record.branchName != null && String(record.branchName).trim()
        ? String(record.branchName)
        : record.branch?.name != null && String(record.branch.name).trim()
          ? String(/** @type {{ name?: string }} */ (record.branch).name)
          : '',
    laneId,
    laneName,
    isBusinessLane: record.isBusinessLane === true || record.IsBusinessLane === true,
    scheduledTime: record.scheduledTime ?? record.targetDate ?? record.createdAt,
    estimatedStart: record.estimatedStart ?? null,
    estimatedEnd: record.estimatedEnd ?? null,
    oldScheduledTime: record.oldScheduledTime ?? null,
    newScheduledTime: record.newScheduledTime ?? null,
    status: String(record.status ?? ''),
    paymentStatus: String(record.paymentStatus ?? 'Unpaid'),
    originalPrice,
    finalAmount,
    totalAmount: total,
    services: rawServices.map((svc, index) =>
      normalizeBookingServiceLine(svc, total, rawServices.length, index),
    ),
    startTime: record.startTime ?? record.slotStartTime ?? null,
    endTime: record.endTime ?? record.slotEndTime ?? null,
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
  // timeRange = "08:00 - 09:00" → extract start time for display
  const timeRange = String(item.timeRange ?? '')
  const match = timeRange.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/)
  const startTime = match ? match[1] : ''
  const endTime = match ? match[2] : ''

  return {
    slotId: Number(item.slotId),
    timeRange,
    startTime: String(item.startTime ?? startTime).trim(),
    endTime: String(item.endTime ?? endTime).trim(),
    isAvailable: item.isAvailable === true,
    reason: item.reason != null ? String(item.reason) : '',
    estimatedDurationMinutes:
      item.estimatedDurationMinutes != null
        ? Number(item.estimatedDurationMinutes)
        : item.estimatedWashMinutes != null
        ? Number(item.estimatedWashMinutes)
        : null,
    estimatedEndTime: item.estimatedEndTime != null ? String(item.estimatedEndTime) : null,
    estimatedLastEndMinutesIntoSlot: item.estimatedLastEndMinutesIntoSlot != null
      ? Number(item.estimatedLastEndMinutesIntoSlot)
      : null,
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
  const bookings = asBusinessCollection(data).map(normalizeBusinessBooking)
  return enrichBusinessBookingsWithBranches(bookings)
}

export async function fetchBookingDetail(id) {
  const data = await apiRequest(`/business/${id}`)
  const detail = normalizeBusinessBookingDetail(data)

  try {
    const [vehicles, enriched] = await Promise.all([
      fetchFleetVehicles(),
      enrichBusinessBookingsWithBranches([detail]),
    ])

    const withBranch = enriched[0] ?? detail

    if (!withBranch.vehicleType && withBranch.licensePlate) {
      const plate = withBranch.licensePlate.toLowerCase()
      const vehicle = vehicles.find(
        (v) => String(v.licensePlate ?? '').toLowerCase() === plate,
      )
      if (vehicle) {
        withBranch.vehicleType =
          vehicle.vehicleType || vehicle.vehicleTypeName || ''
        withBranch.fleetVehicleId = vehicle.fleetVehicleId
      }
    }

    return withBranch
  } catch {
    return detail
  }
}

export async function createBusinessBooking(dto) {
  // New bulk format: { vehicles: [{fleetVehicleId, serviceIds}], branchId, slotId, scheduledTime }
  const payload = {
    vehicles: dto.vehicles.map((v) => ({
      fleetVehicleId: v.fleetVehicleId,
      serviceIds: v.serviceIds,
    })),
    branchId: Number(dto.branchId),
    slotId: Number(dto.slotId ?? dto.slotId),
    scheduledTime: dto.scheduledTime?.includes('T')
      ? dto.scheduledTime
      : `${dto.scheduledTime}T00:00:00.000Z`,
  }

  const result = await apiRequest('/business/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  // Handle MultiVehicleBookingResponseDTO — bookingGroupId points to the first booking
  if (result && typeof result === 'object') {
    const groupId = Number(result.bookingGroupId ?? result.bookingId ?? result.id)
    if (Number.isFinite(groupId) && dto.branchId != null) {
      try {
        const branches = await fetchBranches()
        const branch = branches.find((b) => b.id === Number(dto.branchId))
        saveBookingBranchCache(groupId, {
          branchId: Number(dto.branchId),
          branchName: branch?.name ?? '',
        })
      } catch {
        saveBookingBranchCache(groupId, { branchId: Number(dto.branchId) })
      }
    }
  }

  return result
}

export const cancelBooking = (id) =>
  apiRequest(`/business/${id}/cancel`, { method: 'POST' })

export const rescheduleBusinessBooking = (id, { newScheduledDate, newSlotId }) =>
  apiRequest(`/business/reschedule/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      newScheduledDate,
      newSlotId: Number(newSlotId),
    }),
  })

/**
 * GET /business/available-slots — simulation endpoint for checking slot availability
 * @param {{ branchId: number; fleetVehicleId: number; targetDate: string; serviceIds: number[]; vehicleCount?: number }} params
 *   vehicleCount = number of vehicles to simulate (for bulk booking capacity planning)
 */
export async function getBusinessAvailableSlots({
  branchId,
  fleetVehicleId,
  targetDate,
  serviceIds,
  vehicleCount = 1,
}) {
  const params = new URLSearchParams()
  params.set('BranchId', String(branchId))
  params.set('FleetVehicleId', String(fleetVehicleId))
  const dateIso = targetDate.includes('T') ? targetDate : `${targetDate}T00:00:00.000Z`
  params.set('TargetDate', dateIso)
  for (const id of serviceIds) {
    params.append('ServiceIds', String(id))
  }
  params.set('VehicleCount', String(vehicleCount))

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
        bookings.filter((b) => ['Pending', 'CheckedIn'].includes(String(b.status))),
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

/** @param {Record<string, unknown>} item */
function normalizeBusinessHistoryItem(item) {
  const amount = item.totalAmount ?? item.cost ?? item.finalAmount

  return {
    fleetWashLogId: item.fleetWashLogId ?? item.id ?? item.bookingId,
    id: item.fleetWashLogId ?? item.id ?? item.bookingId,
    bookingId: item.bookingId != null ? Number(item.bookingId) : undefined,
    licensePlate: String(item.licensePlate ?? ''),
    vehicleType: String(item.vehicleType ?? item.vehicleTypeName ?? ''),
    branchName: String(item.branchName ?? ''),
    branchId: item.branchId != null ? Number(item.branchId) : null,
    fleetVehicleId: item.fleetVehicleId != null ? Number(item.fleetVehicleId) : null,
    checkInTime:
      item.checkInTime ?? item.checkedInAt ?? item.scheduledTime ?? item.createdAt ?? null,
    completedTime:
      item.completedTime ??
      item.completedAt ??
      (item.status === 'Completed' ? item.scheduledTime : null),
    createdAt: item.createdAt ?? item.scheduledTime ?? null,
    completedAt:
      item.completedAt ??
      item.completedTime ??
      (item.status === 'Completed' ? item.scheduledTime : null),
    status: String(item.status ?? ''),
    totalAmount: amount != null ? Number(amount) : 0,
    cost: amount != null ? Number(amount) : 0,
  }
}

/** @param {string | undefined} value @param {boolean} [endOfDay] */
function parseHistoryFilterDate(value, endOfDay = false) {
  if (!value) return null
  const iso = value.includes('T') ? value : `${value}T${endOfDay ? '23:59:59' : '00:00:00'}`
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/** @param {ReturnType<typeof normalizeBusinessHistoryItem>[]} items @param {Record<string, unknown>} filter @param {ReturnType<typeof normalizeBusinessVehicle>[]} [vehicles] */
function applyBusinessHistoryFilters(items, filter, vehicles = []) {
  let list = [...items]

  if (filter.fleetVehicleId) {
    const vehicle = vehicles.find(
      (v) => String(v.fleetVehicleId) === String(filter.fleetVehicleId),
    )
    if (vehicle?.licensePlate) {
      const plate = vehicle.licensePlate.toLowerCase()
      list = list.filter(
        (item) => String(item.licensePlate ?? '').toLowerCase() === plate,
      )
    } else {
      list = list.filter(
        (item) => String(item.fleetVehicleId) === String(filter.fleetVehicleId),
      )
    }
  }

  if (filter.branchId) {
    list = list.filter(
      (item) => item.branchId != null && String(item.branchId) === String(filter.branchId),
    )
  }

  if (filter.status) {
    list = list.filter((item) => String(item.status) === String(filter.status))
  }

  const from = parseHistoryFilterDate(
    typeof filter.fromDate === 'string' ? filter.fromDate : undefined,
  )
  const to = parseHistoryFilterDate(
    typeof filter.toDate === 'string' ? filter.toDate : undefined,
    true,
  )

  if (from || to) {
    list = list.filter((item) => {
      const raw = item.completedTime ?? item.checkInTime ?? item.createdAt
      if (!raw) return !from && !to
      const date = new Date(raw)
      if (Number.isNaN(date.getTime())) return false
      if (from && date < from) return false
      if (to && date > to) return false
      return true
    })
  }

  return list
}

/** @param {ReturnType<typeof normalizeBusinessHistoryItem>[]} items @param {Record<string, unknown>} filter */
function paginateBusinessHistory(items, filter) {
  const page = Math.max(1, Number(filter.page) || 1)
  const pageSize = Math.max(1, Number(filter.pageSize) || 20)
  const sorted = [...items].sort((a, b) => {
    const left = new Date(a.completedTime ?? a.checkInTime ?? 0).getTime()
    const right = new Date(b.completedTime ?? b.checkInTime ?? 0).getTime()
    return right - left
  })
  const totalItems = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const start = (page - 1) * pageSize

  return {
    items: sorted.slice(start, start + pageSize),
    totalPages,
    totalItems,
  }
}

/**
 * BE thường trả GET /business/history rỗng — dựng lịch sử từ GET /business (bookings).
 * @param {Record<string, unknown>} [filter]
 */
async function fetchBusinessHistoryFromBookings(filter = {}) {
  const [bookings, vehicles, branches] = await Promise.all([
    fetchBusinessBookings(),
    fetchFleetVehicles().catch(() => []),
    fetchBranches().catch(() => []),
  ])

  const vehicleByPlate = new Map(
    vehicles.map((vehicle) => [String(vehicle.licensePlate ?? '').toLowerCase(), vehicle]),
  )

  const historyStatuses = filter.status
    ? [String(filter.status)]
    : ['Completed', 'Processing', 'Cancelled']

  const items = bookings
    .filter((booking) => historyStatuses.includes(String(booking.status)))
    .map((booking) => {
      const plate = String(booking.licensePlate ?? '').toLowerCase()
      const vehicle = vehicleByPlate.get(plate)
      const [withBranch] = applyBusinessBranchNames([booking], branches)

      return normalizeBusinessHistoryItem({
        ...withBranch,
        bookingId: booking.bookingId,
        licensePlate: booking.licensePlate,
        vehicleType:
          vehicle?.vehicleType || vehicle?.vehicleTypeName || booking.vehicleType,
        fleetVehicleId: vehicle?.fleetVehicleId,
        scheduledTime: booking.scheduledTime,
        status: booking.status,
        finalAmount: booking.finalAmount,
      })
    })

  return paginateBusinessHistory(
    applyBusinessHistoryFilters(items, filter, vehicles),
    filter,
  )
}

/**
 * @param {Record<string, unknown>} [filter]
 * @returns {Promise<{ items: ReturnType<typeof normalizeBusinessHistoryItem>[]; totalPages: number; totalItems?: number }>}
 */
export async function fetchBusinessHistory(filter = {}) {
  const params = new URLSearchParams()
  if (filter.page) params.set('Page', String(filter.page))
  if (filter.pageSize) params.set('PageSize', String(filter.pageSize))
  if (filter.fleetVehicleId) params.set('FleetVehicleId', String(filter.fleetVehicleId))
  if (filter.fromDate) params.set('FromDate', String(filter.fromDate))
  if (filter.toDate) params.set('ToDate', String(filter.toDate))
  if (filter.branchId) params.set('BranchId', String(filter.branchId))
  if (filter.status) params.set('Status', String(filter.status))

  const qs = params.toString()

  try {
    const data = await apiRequest(`/business/history${qs ? `?${qs}` : ''}`)
    let items = []

    if (Array.isArray(data)) {
      items = data.map((item) =>
        normalizeBusinessHistoryItem(/** @type {Record<string, unknown>} */ (item)),
      )
    } else if (data && typeof data === 'object') {
      const obj = /** @type {Record<string, unknown>} */ (data)
      items = asBusinessCollection(obj.items ?? obj).map((item) =>
        normalizeBusinessHistoryItem(/** @type {Record<string, unknown>} */ (item)),
      )
    }

    if (items.length > 0) {
      const [vehicles] = await Promise.all([fetchFleetVehicles().catch(() => [])])
      return paginateBusinessHistory(
        applyBusinessHistoryFilters(items, filter, vehicles),
        filter,
      )
    }
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err
    }
  }

  return fetchBusinessHistoryFromBookings(filter)
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

/** POST /business/washlogs/{washLogId}/assign-lane */
export function assignWashLogLane(washLogId, { laneId, staffUserId }) {
  return apiRequest(`/business/washlogs/${washLogId}/assign-lane`, {
    method: 'POST',
    body: JSON.stringify({
      laneId: Number(laneId),
      staffUserId: staffUserId != null ? Number(staffUserId) : null,
    }),
  })
}
