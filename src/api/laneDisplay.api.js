import { apiRequest, getAccessToken } from './client'

const DISPLAY_TYPES = new Set([
  'reading',
  'assigned',
  'processing',
  'waiting',
  'payment',
  'assistance',
  'error',
  'cleared',
])

const DISPLAY_TYPE_ALIASES = new Map([
  ['admission_granted', 'assigned'],
  ['vehicle_waiting', 'waiting'],
  ['lane_cleared', 'cleared'],
])

function firstDefined(object, camelName, pascalName) {
  return object?.[camelName] ?? object?.[pascalName]
}

function nullableNumber(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function nullableString(value) {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}

function toTimestamp(value, fallback = Date.now()) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const timestamp = Date.parse(String(value ?? ''))
  return Number.isFinite(timestamp) ? timestamp : fallback
}

export function decodeJwtPayload(token) {
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

export function getLaneDisplayBranchId() {
  const payload = decodeJwtPayload(getAccessToken())
  const raw = payload?.BranchId ?? payload?.branchId
  const branchId = Number(raw)
  return Number.isInteger(branchId) && branchId > 0 ? branchId : null
}

export function normalizeLaneDisplayEvent(rawEvent, source = 'backend') {
  if (!rawEvent || typeof rawEvent !== 'object') return null

  const rawType = nullableString(firstDefined(rawEvent, 'type', 'Type'))
  const normalizedRawType = rawType?.toLowerCase()
  const type =
    DISPLAY_TYPE_ALIASES.get(normalizedRawType) ?? normalizedRawType
  if (!DISPLAY_TYPES.has(type)) return null

  const occurredAt = firstDefined(rawEvent, 'occurredAt', 'OccurredAt')
  const displayUntil = firstDefined(rawEvent, 'displayUntil', 'DisplayUntil')
  const eventId =
    nullableString(firstDefined(rawEvent, 'eventId', 'EventId')) ??
    `${source}:${type}:${toTimestamp(occurredAt)}`

  return {
    kind: 'event',
    source,
    eventId,
    receivedAt: Date.now(),
    timestamp: toTimestamp(occurredAt),
    occurredAt: nullableString(occurredAt),
    displayUntil: nullableString(displayUntil),
    type,
    branchId: nullableNumber(firstDefined(rawEvent, 'branchId', 'BranchId')),
    bookingId: nullableNumber(firstDefined(rawEvent, 'bookingId', 'BookingId')),
    plate:
      nullableString(firstDefined(rawEvent, 'licensePlate', 'LicensePlate'))?.toUpperCase() ??
      '',
    laneId: nullableNumber(firstDefined(rawEvent, 'laneId', 'LaneId')),
    laneName: nullableString(firstDefined(rawEvent, 'laneName', 'LaneName')),
    barrierCommandId: nullableString(
      firstDefined(rawEvent, 'barrierCommandId', 'BarrierCommandId'),
    ),
    barrierStatus: nullableString(
      firstDefined(rawEvent, 'barrierStatus', 'BarrierStatus'),
    ),
    title: nullableString(firstDefined(rawEvent, 'title', 'Title')),
    message: nullableString(firstDefined(rawEvent, 'message', 'Message')),
    reasonCode: nullableString(firstDefined(rawEvent, 'reasonCode', 'ReasonCode')),
  }
}

export function isLaneDisplayEventExpired(event, now = Date.now()) {
  if (!event || event.type === 'cleared') return true
  if (!event.displayUntil) return false
  const displayUntil = Date.parse(event.displayUntil)
  return Number.isFinite(displayUntil) && displayUntil <= now
}

export function normalizeLaneDisplayState(rawState) {
  if (!rawState || typeof rawState !== 'object') {
    return { branchId: null, serverTime: null, latestEvent: null, lanes: [] }
  }

  const rawLatestEvent = firstDefined(rawState, 'latestEvent', 'LatestEvent')
  const latestEvent = normalizeLaneDisplayEvent(rawLatestEvent)
  const rawLanes = firstDefined(rawState, 'lanes', 'Lanes')
  const lanes = Array.isArray(rawLanes)
    ? rawLanes.map((rawLane) => ({
        laneId: nullableNumber(firstDefined(rawLane, 'laneId', 'LaneId')),
        laneName: nullableString(firstDefined(rawLane, 'laneName', 'LaneName')),
        latestEvent: normalizeLaneDisplayEvent(
          firstDefined(rawLane, 'latestEvent', 'LatestEvent'),
        ),
      }))
    : []

  return {
    branchId: nullableNumber(firstDefined(rawState, 'branchId', 'BranchId')),
    serverTime: nullableString(firstDefined(rawState, 'serverTime', 'ServerTime')),
    latestEvent:
      latestEvent && !isLaneDisplayEventExpired(latestEvent) ? latestEvent : null,
    lanes,
  }
}

export function fetchLatestLaneDisplayState(branchId, options = {}) {
  const normalizedBranchId = Number(branchId)
  if (!Number.isInteger(normalizedBranchId) || normalizedBranchId <= 0) {
    return Promise.reject(new Error('Không xác định được chi nhánh cho màn hình phân làn.'))
  }

  return apiRequest(
    `/operations/branches/${normalizedBranchId}/lane-display/latest`,
    options,
  ).then(normalizeLaneDisplayState)
}
