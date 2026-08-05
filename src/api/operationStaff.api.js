import { apiRequest, getAccessToken } from './client'
import {
  asBookingList,
  fetchBookingsByDate,
  normalizeBookingStatus,
  toApiTargetDate,
} from './admin.bookings.api'
import { fetchTransactions, normalizeTransaction } from './admin.transactions.api'
import { fetchUserById } from './admin.users.api'
import { findUserByLicensePlate, maskPhoneNumber } from './staff.customers.api'

// Customer identity data changes rarely; keep it across dashboard polls/routes so
// the same Staff session does not reload every user detail every 30 seconds.
const staffUserDetailCache = new Map()

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function getBranchIdFromToken() {
  const payload = decodeJwtPayload(getAccessToken())
  const raw = payload?.BranchId ?? payload?.branchId
  const branchId = Number(raw)
  return Number.isFinite(branchId) && branchId > 0 ? branchId : undefined
}

/**
 * @typedef {{
 *   laneId?: number
 *   laneName?: string
 *   branchId?: number
 *   branchName?: string
 *   assignedDate?: string
 *   staffId?: number
 * }} StaffLaneAssignment
 */

/** @param {string | undefined | null} method */
export function formatPaymentMethodLabel(method) {
  const raw = String(method ?? '').trim()
  if (!raw || raw === '—') return 'Chưa xác định'
  const map = {
    Wallet: 'Ví LuxeWash',
    Card: 'Thẻ ngân hàng',
    Cash: 'Tiền mặt',
    PayOS: 'PayOS',
    QR: 'PayOS',
    Points: 'Điểm thưởng',
    Point: 'Điểm thưởng',
    COD: 'Thanh toán tại quầy',
    Pending: 'Chưa thanh toán',
  }
  return map[raw] ?? raw
}

function formatSlotLabel(start, end) {
  const fmt = (v) => (v ? String(v).slice(0, 5) : '')
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  return fmt(start) || fmt(end) || '—'
}

function normalizeVehicleCondition(condition) {
  if (condition == null || condition === '') return '—'
  if (typeof condition === 'number') {
    return ({ 1: 'Sạch', 2: 'Bẩn', 3: 'Rất bẩn' })[condition] ?? String(condition)
  }
  const text = String(condition)
  const map = { Clean: 'Sạch', Dirty: 'Bẩn', VeryDirty: 'Rất bẩn' }
  return map[text] ?? text
}

function formatScheduledSlotLabel(scheduledTime) {
  if (!scheduledTime) return undefined
  const d = new Date(String(scheduledTime))
  if (Number.isNaN(d.getTime())) return undefined
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function getLocalDateKey() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function normalizeServiceNames(value) {
  if (Array.isArray(value)) {
    const names = value.map((v) => String(v ?? '').trim()).filter(Boolean)
    return names.length ? names.join(', ') : undefined
  }
  if (value == null || value === '') return undefined
  return String(value)
}

function sumDiscounts(item) {
  const point = Number(item.pointDiscountAmount ?? item.pointDiscount ?? 0)
  const voucher = Number(item.voucherDiscountAmount ?? item.voucherDiscount ?? 0)
  const generic = Number(item.discountAmount ?? item.discount ?? 0)
  return point + voucher + generic
}

/** Flatten nested booking payloads from various BE DTO shapes. */
function flattenBookingSource(item) {
  if (!item || typeof item !== 'object') return {}

  const customer = /** @type {Record<string, unknown>} */ (
    item.customer ?? item.customerProfile ?? item.customerInfo ?? item.user ?? item.owner ?? {}
  )
  const vehicle = /** @type {Record<string, unknown>} */ (
    item.vehicle ?? item.registeredVehicle ?? {}
  )
  const payment = /** @type {Record<string, unknown>} */ (
    item.payment ?? item.transaction ?? item.paymentInfo ?? {}
  )
  const timeSlot = /** @type {Record<string, unknown>} */ (item.timeSlot ?? item.slot ?? {})
  const services = item.services ?? item.serviceList ?? item.bookingServices ?? []
  const firstService = Array.isArray(services) ? services[0] : null
  const details = item.details ?? item.bookingDetails ?? item.bookingDetailList ?? []
  const firstDetail = Array.isArray(details) ? details[0] : null
  const nestedService = /** @type {Record<string, unknown>} */ (firstDetail?.service ?? {})

  const serviceName =
    normalizeServiceNames(item.serviceNames) ??
    normalizeServiceNames(item.serviceName) ??
    normalizeServiceNames(firstService?.name ?? firstService?.serviceName) ??
    normalizeServiceNames(nestedService.name ?? nestedService.serviceName) ??
    normalizeServiceNames(firstDetail?.serviceName)

  const scheduledTime =
    item.scheduledTime ??
    item.scheduleTime ??
    item.ScheduledTime ??
    item.scheduledDate ??
    item.affectedDate

  return {
    ...item,
    details,
    customerName:
      item.customerName ??
      item.fullName ??
      item.ownerName ??
      customer.fullName ??
      customer.customerName ??
      customer.name,
    phoneNumber:
      item.customerPhone ??
      item.phoneNumber ??
      item.customerPhoneNumber ??
      item.ownerPhone ??
      customer.phoneNumber ??
      customer.phone,
    userId: item.userId ?? item.customerId ?? customer.userId ?? customer.id ?? customer.customerId,
    tierName:
      item.customerTierName ??
      item.tierName ??
      item.rankName ??
      customer.tierName ??
      customer.rankName ??
      customer.membershipTier,
    // Alias so consumers reading `rankName` (StaffQueuePage, DashboardPage) get the tier too.
    rankName:
      item.customerTierName ??
      item.tierName ??
      item.rankName ??
      customer.tierName ??
      customer.rankName ??
      customer.membershipTier,
    rankId: item.rankId ?? item.tierId ?? customer.rankId ?? customer.tierId,
    customerTierPoints:
      item.customerTierPoints ??
      item.tierPoints ??
      customer.customerTierPoints ??
      customer.tierPoints,
    paymentMethod:
      item.paymentMethod ??
      item.payMethod ??
      payment.paymentMethod ??
      payment.method ??
      item.paymentType,
    paymentStatus:
      item.paymentStatus ?? payment.status ?? payment.paymentStatus ?? item.transactionStatus,
    licensePlate:
      item.licensePlate ?? vehicle.licensePlate ?? firstDetail?.licensePlate,
    vehicleType:
      item.vehicleType ??
      item.vehicleTypeName ??
      vehicle.vehicleTypeName ??
      vehicle.vehicleType ??
      vehicle.type ??
      firstDetail?.vehicleTypeName ??
      firstDetail?.vehicleType,
    vehicleDisplayName:
      item.vehicleDisplayName ??
      item.displayName ??
      vehicle.displayName ??
      vehicle.carModelName ??
      vehicle.modelName ??
      vehicle.carModel ??
      firstDetail?.displayName,
    serviceName,
    originalAmount: item.originalPrice ?? item.originalAmount ?? item.subtotal,
    discountAmount: sumDiscounts(item),
    startTime: item.startTime ?? timeSlot.startTime ?? item.slotStartTime,
    endTime: item.endTime ?? timeSlot.endTime ?? item.slotEndTime,
    slotLabel:
      item.slotLabel ??
      item.timeSlotLabel ??
      timeSlot.label ??
      formatScheduledSlotLabel(scheduledTime) ??
      (item.startTime && item.endTime ? formatSlotLabel(item.startTime, item.endTime) : undefined),
    scheduledTime,
  }
}

function needsCustomerLookup(task) {
  return !task.customerName || task.customerName === '—' || !task.userId
}

function isMissingCustomerName(task) {
  return !task.customerName || task.customerName === '—'
}

async function attachPaymentFromTransactions(
  booking,
  txIndex,
  fetchOpts = {},
  { allowFallbackFetch = true } = {},
) {
  if (booking.paymentMethod && booking.paymentMethod !== '—') return booking

  const hasKnownPaymentStatus =
    booking.paymentStatus &&
    booking.paymentStatus !== '—'

  let tx = txIndex.get(Number(booking.bookingId))
  if (!tx && txIndex.size === 0 && allowFallbackFetch) {
    try {
      const txs = await fetchTransactions(fetchOpts)
      const list = (Array.isArray(txs) ? txs : []).map(normalizeTransaction)
      tx = list.find((t) => Number(t.bookingId) === Number(booking.bookingId))
    } catch {
      // optional
    }
  }
  if (tx) {
    return {
      ...booking,
      paymentMethod: tx.paymentMethod,
      paymentStatus: tx.status,
      customerName: booking.customerName === '—' ? tx.customerName : booking.customerName,
    }
  }

  // Do not replace an explicit status from the booking/lookup API merely because
  // the optional transactions lookup is unavailable or does not return a row.
  if (booking.status === 'Pending' && !hasKnownPaymentStatus) {
    return {
      ...booking,
      paymentMethod: 'Pending',
      paymentStatus: 'Chưa thanh toán',
    }
  }

  return booking
}

function attachDetailsFromSummary(task) {
  if (task.details?.length || !task.serviceName || task.serviceName === '—') return task
  return {
    ...task,
    details: [
      {
        detailId: task.bookingId,
        licensePlate: task.licensePlate,
        serviceName: task.serviceName,
        vehicleCondition: '—',
      },
    ],
  }
}

/**
 * Load full booking detail for Staff UI.
 * StaffBookings summary DTO lacks customer — resolved via /admin/users vehicle garage.
 * @param {StaffTask} booking
 * @param {{
 *   bookingsByDate?: ReturnType<typeof asBookingList>,
 *   txIndex?: Map<number, ReturnType<typeof normalizeTransaction>>,
 *   userByPlate?: Map<string, Awaited<ReturnType<typeof findUserByLicensePlate>>>,
 *   signal?: AbortSignal,
 * }} [context] optional shared batch-loaded data (built by enrichStaffTasks)
 * @returns {Promise<StaffTask>}
 */
export async function enrichStaffBooking(booking, context = {}) {
  if (!booking?.bookingId) return booking

  let merged = normalizeStaffTask(booking)

  const { bookingsByDate, txIndex, userById, userByPlate, signal } = context
  const fetchOpts = signal ? { signal } : {}

  if (bookingsByDate) {
    const match = bookingsByDate.find(
      (b) => Number(b.bookingId ?? b.id) === Number(booking.bookingId),
    )
    if (match) {
      // The operation-staff task is the authoritative source for live status/lane
      // fields. Admin booking data is only enrichment and can lag immediately
      // after check-in, so it must not overwrite a freshly assigned lane.
      merged = normalizeStaffTask({ ...match, ...merged, bookingId: booking.bookingId })
    }
  } else if (signal !== undefined || context.allowStandaloneFetch) {
    // Fallback: when called outside the batched enrichStaffTasks context.
    try {
      const dateKey =
        merged.scheduledTime?.slice(0, 10) ??
        getLocalDateKey()
      const data = await fetchBookingsByDate(toApiTargetDate(dateKey), fetchOpts)
      const match = asBookingList(data).find(
        (b) => Number(b.bookingId ?? b.id) === Number(booking.bookingId),
      )
      if (match) {
        merged = normalizeStaffTask({ ...match, ...merged, bookingId: booking.bookingId })
      }
    } catch {
      // continue
    }
  }

  const userDetail = userById?.get(Number(merged.userId))
  if (userDetail && isMissingCustomerName(merged)) {
    merged = normalizeStaffTask({
      ...merged,
      customerName: userDetail.fullName,
      phoneNumber: userDetail.phoneNumber,
      tierName: userDetail.tierName ?? userDetail.rankName,
    })
  }

  if (
    !merged.userId &&
    isMissingCustomerName(merged) &&
    merged.licensePlate &&
    merged.licensePlate !== '—'
  ) {
    let lookup = userByPlate?.get(merged.licensePlate)
    if (!lookup && userByPlate === undefined) {
      lookup = await findUserByLicensePlate(merged.licensePlate, fetchOpts).catch(
        () => null,
      )
    }
    if (lookup) {
      const { customer, vehicle } = lookup
      merged = normalizeStaffTask({
        ...merged,
        customerName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        userId: customer.userId,
        tierName: customer.rankName,
        vehicleType: vehicle.vehicleType ?? vehicle.vehicleTypeName ?? merged.vehicleType,
        vehicleDisplayName:
          vehicle.displayName ??
          vehicle.carModel ??
          vehicle.vehicleDisplayName ??
          merged.vehicleDisplayName,
      })
    }
  }

  merged = await attachPaymentFromTransactions(
    merged,
    txIndex ?? new Map(),
    fetchOpts,
    { allowFallbackFetch: !(txIndex instanceof Map) },
  )
  merged = attachDetailsFromSummary(merged)

  return merged
}

/**
 * Enrich a list of staff tasks/bookings.
 * Batches shared lookups: 1x fetchBookingsByDate (if not pre-loaded) + 1x fetchTransactions + deduped plate lookups
 * instead of 3N sequential calls per task.
 * @param {StaffTask[]} tasks
 * @param {{ signal?: AbortSignal, bookingsByDate?: unknown[] }} [options]
 */
export async function enrichStaffTasks(tasks, options = {}) {
  const list = Array.isArray(tasks) ? tasks : []
  if (!list.length) return []

  const { signal, bookingsByDate: preloadedBookings } = options
  const fetchOpts = signal ? { signal } : {}

  const dates = new Set()
  const userIdsToLookup = new Set()
  const platesToLookup = new Set()

  for (const t of list) {
    const dateKey =
      t.scheduledTime?.slice(0, 10) ?? getLocalDateKey()
    dates.add(dateKey)

    const normalized = normalizeStaffTask(t)
    if (isMissingCustomerName(normalized) && Number(normalized.userId) > 0) {
      userIdsToLookup.add(Number(normalized.userId))
    } else if (
      needsCustomerLookup(normalized) &&
      normalized.licensePlate &&
      normalized.licensePlate !== '—'
    ) {
      platesToLookup.add(normalized.licensePlate)
    }
  }

  const bookingsByDatePromise = preloadedBookings
    ? asBookingList(preloadedBookings)
    : (async () => {
        if (dates.size !== 1) return null
        const [dateKey] = dates
        try {
          const data = await fetchBookingsByDate(toApiTargetDate(dateKey), fetchOpts)
          return asBookingList(data)
        } catch {
          return null
        }
      })()

  const txIndexPromise = (async () => {
    try {
      const txs = await fetchTransactions(fetchOpts)
      const list = Array.isArray(txs) ? txs : []
      const map = new Map()
      for (const raw of list) {
        const tx = normalizeTransaction(raw)
        if (tx.bookingId != null) map.set(Number(tx.bookingId), tx)
      }
      return map
    } catch {
      return new Map()
    }
  })()

  const userByIdPromise = (async () => {
    if (!userIdsToLookup.size) return new Map()
    const cached = new Map(
      [...userIdsToLookup]
        .filter((userId) => staffUserDetailCache.has(userId))
        .map((userId) => [userId, staffUserDetailCache.get(userId)]),
    )
    const missingUserIds = [...userIdsToLookup].filter(
      (userId) => !staffUserDetailCache.has(userId),
    )
    const results = await Promise.all(
      missingUserIds.map(async (userId) => {
        try {
          const detail = await fetchUserById(userId, fetchOpts)
          staffUserDetailCache.set(userId, detail)
          return [userId, detail]
        } catch {
          return [userId, null]
        }
      }),
    )
    return new Map([
      ...cached,
      ...results.filter(([, value]) => value != null),
    ])
  })()

  const userByPlatePromise = (async () => {
    if (!platesToLookup.size) return new Map()
    const results = await Promise.all(
      [...platesToLookup].map(async (plate) => {
        try {
          const lookup = await findUserByLicensePlate(plate, fetchOpts)
          return [plate, lookup]
        } catch {
          return [plate, null]
        }
      }),
    )
    return new Map(results.filter(([, v]) => v != null))
  })()

  // These lookups are independent. Running them together prevents their network
  // latency from accumulating on every dashboard refresh.
  const [bookingsByDate, txIndex, userById, userByPlate] = await Promise.all([
    bookingsByDatePromise,
    txIndexPromise,
    userByIdPromise,
    userByPlatePromise,
  ])

  const context = { bookingsByDate, txIndex, userById, userByPlate }

  return Promise.all(
    list.map(async (task) => {
      try {
        return await enrichStaffBooking(task, context)
      } catch {
        return normalizeStaffTask(task)
      }
    }),
  )
}

const STAFF_HISTORY_STATUSES = new Set(['Completed', 'Cancelled', 'No-show'])

/**
 * Staff service history — GET /admin/bookings?targetDate= (Swagger: StaffBookings).
 * @param {string} targetDate ISO date-time from {@link toApiTargetDate}
 * @param {{ laneId?: number | null, signal?: AbortSignal }} [options]
 */
export async function fetchStaffServiceHistory(targetDate, options = {}) {
  const { laneId, signal } = options
  const fetchOpts = signal ? { signal } : {}

  const data = await fetchBookingsByDate(targetDate, fetchOpts)
  const allBookings = asBookingList(data)

  const filtered = allBookings
    .map((item) => normalizeStaffTask(item))
    .filter((b) => STAFF_HISTORY_STATUSES.has(b.status))
    .filter((b) => {
      if (!laneId) return true
      if (b.processingLaneId == null) return true
      return Number(b.processingLaneId) === Number(laneId)
    })

  return enrichStaffTasks(filtered, { signal, bookingsByDate: allBookings })
}

/**
 * @typedef {{
 *   bookingId: number
 *   licensePlate: string
 *   customerName: string
 *   userId?: number
 *   phoneNumber: string
 *   phoneMasked: string
 *   rankName: string
 *   rankId?: number
 *   customerTierPoints?: number
 *   isVip?: boolean
 *   serviceName: string
 *   slotLabel: string
 *   scheduledTime: string | null
 *   status: string
 *   finalAmount: number
 *   originalAmount?: number
 *   discountAmount?: number
 *   paymentMethod: string
 *   paymentStatus: string
 *   fallbackQrCode: string
 *   branchId?: number
 *   branchName?: string
 *   processingLaneId?: number
 *   processingLaneName?: string
 *   isWaitingForLane: boolean
 *   processingStartTime?: string | null
 *   completedTime?: string | null
 *   actualDurationMinutes?: number | null
 *   vehicleType: string
 *   vehicleDisplayName: string
 *   lastVisitDate?: string | null
 *   details: Array<{
 *     detailId?: number
 *     licensePlate: string
 *     serviceName: string
 *     vehicleCondition: string
 *   }>
 * }} StaffTask
 */

/**
 * Normalize booking/task payload from operation-staff, admin bookings, or recognize API.
 * @param {Record<string, unknown>} item
 * @returns {StaffTask}
 */
export function normalizeStaffTask(item) {
  const flat = flattenBookingSource(item)
  const details = flat.details ?? []
  const firstDetail = Array.isArray(details) ? details[0] : null
  const phoneRaw = flat.phoneNumber ?? ''

  const scheduledRaw =
    flat.scheduledTime ??
    flat.scheduleTime ??
    flat.ScheduledTime ??
    flat.scheduledDate ??
    flat.affectedDate ??
    null

  let slotLabel =
    flat.slotLabel ??
    flat.timeSlotLabel ??
    formatSlotLabel(flat.startTime, flat.endTime)
  if (!slotLabel || slotLabel === '—') {
    slotLabel = formatScheduledSlotLabel(scheduledRaw) ?? '—'
  }

  return {
    bookingId: Number(flat.bookingId ?? flat.id ?? 0),
    licensePlate: String(flat.licensePlate ?? firstDetail?.licensePlate ?? '—'),
    customerName: String(flat.customerName ?? '—'),
    userId: flat.userId != null ? Number(flat.userId) : undefined,
    phoneNumber: String(phoneRaw || '—'),
    phoneMasked: maskPhoneNumber(String(phoneRaw || '')),
    rankName: String(flat.rankName ?? flat.tierName ?? flat.membershipTier ?? '—'),
    rankId: flat.rankId != null ? Number(flat.rankId) : flat.tierId != null ? Number(flat.tierId) : undefined,
    customerTierPoints:
      flat.customerTierPoints != null ? Number(flat.customerTierPoints) : undefined,
    isVip: flat.isVip === true || flat.IsVip === true,
    barrierCommandId:
      String(flat.barrierCommandId ?? flat.BarrierCommandId ?? '').trim() || undefined,
    exitBarrierCommandId:
      String(flat.exitBarrierCommandId ?? flat.ExitBarrierCommandId ?? '').trim() || undefined,
    barrierCommandCreated:
      flat.barrierCommandCreated === true || flat.BarrierCommandCreated === true,
    barrierId:
      String(flat.barrierId ?? flat.BarrierId ?? '').trim() || undefined,
    barrierCommandExpiresAt:
      flat.barrierCommandExpiresAt ??
      flat.BarrierCommandExpiresAt ??
      flat.expiresAt ??
      flat.ExpiresAt ??
      null,
    serviceName: String(flat.serviceName ?? firstDetail?.serviceName ?? '—'),
    slotLabel: String(slotLabel),
    scheduledTime: scheduledRaw ? String(scheduledRaw) : null,
    status: normalizeBookingStatus(flat.status ?? flat.bookingStatus),
    finalAmount: Number(flat.finalAmount ?? flat.totalAmount ?? flat.amount ?? 0),
    originalAmount: Number(flat.originalAmount ?? flat.originalPrice ?? flat.finalAmount ?? 0),
    discountAmount: Number(flat.discountAmount ?? 0),
    paymentMethod: String(flat.paymentMethod ?? '—'),
    paymentStatus: String(flat.paymentStatus ?? '—'),
    fallbackQrCode: String(flat.fallbackQrCode ?? flat.qrCode ?? '—'),
    branchId: flat.branchId != null ? Number(flat.branchId) : undefined,
    branchName: flat.branchName != null ? String(flat.branchName) : undefined,
    processingLaneId:
      flat.processingLaneId != null
        ? Number(flat.processingLaneId)
        : flat.laneId != null
          ? Number(flat.laneId)
          : undefined,
    processingLaneName:
      flat.processingLaneName != null
        ? String(flat.processingLaneName)
        : flat.laneName != null
          ? String(flat.laneName)
          : undefined,
    isWaitingForLane:
      flat.isWaitingForLane === true ||
      flat.IsWaitingForLane === true ||
      (normalizeBookingStatus(flat.status ?? flat.bookingStatus) === 'Checked-in' &&
        flat.processingLaneId == null &&
        flat.laneId == null),
    processingStartTime:
      flat.processingStartTime != null
        ? String(flat.processingStartTime)
        : flat.ProcessingStartTime != null
          ? String(flat.ProcessingStartTime)
          : null,
    completedTime:
      flat.completedTime != null
        ? String(flat.completedTime)
        : flat.CompletedTime != null
          ? String(flat.CompletedTime)
          : null,
    actualDurationMinutes:
      flat.actualDurationMinutes != null
        ? Number(flat.actualDurationMinutes)
        : flat.ActualDurationMinutes != null
          ? Number(flat.ActualDurationMinutes)
          : null,
    vehicleType: String(
      flat.vehicleType ??
        flat.vehicleTypeName ??
        firstDetail?.vehicleType ??
        firstDetail?.vehicleTypeName ??
        '—',
    ),
    vehicleDisplayName: String(
      flat.vehicleDisplayName ??
        flat.displayName ??
        flat.carModel ??
        flat.carModelName ??
        firstDetail?.displayName ??
        '—',
    ),
    lastVisitDate:
      flat.lastVisitDate != null
        ? String(flat.lastVisitDate)
        : flat.lastVisit != null
          ? String(flat.lastVisit)
          : null,
    details: Array.isArray(details)
      ? details.map((d, i) => ({
          detailId: d.detailId ?? d.id ?? i + 1,
          licensePlate: String(d.licensePlate ?? '—'),
          serviceName: String(d.serviceName ?? d.service?.serviceName ?? d.service?.name ?? '—'),
          vehicleCondition: normalizeVehicleCondition(
            d.vehicleCondition ?? d.condition ?? d.conditionName,
          ),
        }))
      : [],
  }
}

/**
 * Map vehicle recognize API response to StaffTask when possible.
 * @param {Record<string, unknown>} data
 * @returns {StaffTask | null}
 */
export function normalizeVehicleRecognition(data) {
  if (!data || typeof data !== 'object') return null

  const booking = /** @type {Record<string, unknown>} */ (
    data.activeBooking ?? data.booking ?? data.currentBooking ?? {}
  )
  const customer = /** @type {Record<string, unknown>} */ (
    data.customer ?? data.owner ?? data.user ?? {}
  )
  const vehicle = /** @type {Record<string, unknown>} */ (data.vehicle ?? {})

  if (!booking.bookingId && !data.licensePlate && !vehicle.licensePlate) return null

  return normalizeStaffTask({
    ...data,
    ...booking,
    ...customer,
    licensePlate: data.licensePlate ?? vehicle.licensePlate ?? booking.licensePlate,
    vehicleType: vehicle.vehicleType ?? vehicle.vehicleTypeName ?? data.vehicleType,
    vehicleDisplayName:
      vehicle.displayName ?? vehicle.carModelName ?? vehicle.carModel ?? data.vehicleDisplayName,
    customerName: customer.fullName ?? data.ownerName ?? data.customerName,
    phoneNumber: customer.phoneNumber ?? data.phoneNumber,
    rankName: customer.tierName ?? customer.rankName ?? data.tierName,
    userId: customer.userId ?? data.userId ?? data.ownerId,
  })
}

/** @param {Record<string, unknown>} item @returns {StaffLaneAssignment} */
export function normalizeStaffLaneAssignment(item) {
  if (!item || typeof item !== 'object') return {}
  const branchId = item.branchId ?? item.BranchId ?? getBranchIdFromToken()
  return {
    laneId: item.laneId != null ? Number(item.laneId) : undefined,
    laneName: item.laneName != null ? String(item.laneName) : undefined,
    branchId: branchId != null ? Number(branchId) : undefined,
    branchName: item.branchName != null ? String(item.branchName) : undefined,
    assignedDate: item.assignedDate != null ? String(item.assignedDate) : undefined,
    staffId: item.staffId != null ? Number(item.staffId) : undefined,
  }
}

export function formatStaffStationLabel(assignment) {
  if (!assignment) return 'Chưa phân công làn'
  if (Number(assignment.laneId) === 0) {
    const allLanes = assignment.laneName || 'Mọi làn rửa xe (All Lanes)'
    return assignment.branchName ? `${allLanes} · ${assignment.branchName}` : allLanes
  }
  if (assignment.laneName && assignment.branchName) {
    return `${assignment.laneName} · ${assignment.branchName}`
  }
  if (assignment.laneName) return assignment.laneName
  if (assignment.laneId) return `Làn #${assignment.laneId}`
  return 'Chưa phân công làn'
}

/**
 * GET /api/v1/operation-staff/lane-assignment
 * @returns {Promise<StaffLaneAssignment>}
 */
export function fetchStaffLaneAssignment(options = {}) {
  return apiRequest('/operation-staff/lane-assignment', options).then(normalizeStaffLaneAssignment)
}

/**
 * Physical/reserved lane occupancy is the authoritative source for vehicles in wash bays.
 * It includes both regular bookings and fleet wash logs.
 */
export function fetchStaffLaneOccupancies(options = {}) {
  return apiRequest('/operation-staff/lane-occupancies', options).then((data) =>
    (Array.isArray(data) ? data : []).map((item) => ({
      laneId: Number(item.laneId),
      laneName: String(item.laneName ?? ''),
      licensePlate: String(item.licensePlate ?? ''),
      bookingId: item.bookingId == null ? null : Number(item.bookingId),
      fleetWashLogId:
        item.fleetWashLogId == null ? null : Number(item.fleetWashLogId),
      occupiedAt: item.occupiedAt ?? null,
    })),
  )
}

/**
 * GET /api/v1/vehicles/recognize/{licensePlate}
 * @param {string} licensePlate
 * @returns {Promise<StaffTask | null>}
 */
export function recognizeVehicleByPlate(licensePlate) {
  const plate = encodeURIComponent(licensePlate.trim())
  return apiRequest(`/vehicles/recognize/${plate}`).then(normalizeVehicleRecognition)
}

/**
 * POST /api/v1/staff/vouchers/consume
 * @param {{ userId: number; voucherCode: string }} payload
 */
export function consumeStaffVoucher(payload) {
  return apiRequest('/staff/vouchers/consume', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * GET /api/v1/operation-staff/tasks
 * Returns all CheckedIn/Processing bookings in the Staff member's branch.
 * @param {{ date?: string, signal?: AbortSignal }} [options]
 * @returns {Promise<StaffTask[]>}
 */
export function fetchStaffTasks(options = {}) {
  const { date, ...requestOptions } = options
  const params = new URLSearchParams()
  if (date) params.set('date', String(date).slice(0, 10))

  return apiRequest(`/operation-staff/tasks${params.toString() ? `?${params}` : ''}`, requestOptions).then((data) => {
    const list = Array.isArray(data) ? data : []
    return list.map(normalizeStaffTask)
  })
}

/**
 * POST /api/v1/operation-staff/lanes/swap
 * Swaps today's or a selected day's lane assignment with another staff member by phone number.
 * @param {{ targetPhoneNumber: string, date?: string }} payload
 */
export function swapStaffLaneByPhone(payload) {
  return apiRequest('/operation-staff/lanes/swap', {
    method: 'POST',
    body: JSON.stringify({
      targetPhoneNumber: payload.targetPhoneNumber,
      date: payload.date || null,
    }),
  })
}

/**
 * PUT /api/v1/operation-staff/bookings/{bookingId}/status
 * Updates a booking status. Used by Staff to start (Processing) or complete (Completed) a wash.
 * @param {number} bookingId
 * @param {'Processing' | 'Completed'} status
 */
export function updateStaffBookingStatus(bookingId, status) {
  return apiRequest(`/operation-staff/bookings/${bookingId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

/**
 * Normalize the structured gate-admission response returned after check-in.
 * @param {Record<string, unknown>} item
 */
export function normalizeStaffCheckInResult(item) {
  const source =
    item?.data && typeof item.data === 'object'
      ? item.data
      : item && typeof item === 'object'
        ? item
        : {}
  const status = String(source.status ?? '').trim()
  const admissionStatus = String(source.admissionStatus ?? '').trim()
  const normalizedStatus = status.toLowerCase()
  const normalizedAdmissionStatus = admissionStatus.toLowerCase()
  const laneId = source.laneId != null ? Number(source.laneId) : undefined
  const laneName = String(source.laneName ?? '').trim() || undefined
  const hasLane = Number.isFinite(laneId) || Boolean(laneName)
  const isWaiting =
    source.isWaiting === true ||
    normalizedStatus === 'waiting' ||
    normalizedAdmissionStatus === 'denied_queueing'
  const isAssigned =
    normalizedStatus === 'assigned' ||
    normalizedAdmissionStatus === 'granted' ||
    (!isWaiting && hasLane)

  return {
    bookingId: source.bookingId != null ? Number(source.bookingId) : undefined,
    licensePlate: String(source.licensePlate ?? '').trim().toUpperCase(),
    status,
    admissionStatus,
    isWaiting,
    isAssigned,
    hasAdmissionDecision: isWaiting || isAssigned,
    bookingStatus: isWaiting ? 'Checked-in' : isAssigned ? 'Processing' : undefined,
    laneId: Number.isFinite(laneId) ? laneId : undefined,
    laneName,
    barrierCommandId:
      String(source.barrierCommandId ?? source.BarrierCommandId ?? '').trim() || undefined,
    barrierCommandCreated:
      source.barrierCommandCreated === true || source.BarrierCommandCreated === true,
    barrierId:
      String(source.barrierId ?? source.BarrierId ?? '').trim() || undefined,
    barrierCommandExpiresAt:
      source.barrierCommandExpiresAt ?? source.BarrierCommandExpiresAt ?? null,
  }
}

/**
 * POST /api/v1/operation-staff/bookings/{bookingId}/checkin
 * Checks in a Pending booking and returns either Assigned or Waiting.
 * @param {number} bookingId
 */
export async function staffCheckinBooking(bookingId) {
  const result = await apiRequest(`/operation-staff/bookings/${bookingId}/checkin`, {
    method: 'POST',
    body: JSON.stringify({ bookingId }),
  })
  return normalizeStaffCheckInResult(result)
}
