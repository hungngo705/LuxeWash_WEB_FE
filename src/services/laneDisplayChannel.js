const CHANNEL_NAME = 'luxewash-lane-display-v1'
const EVENT_STORAGE_KEY = 'luxewash:lane-display:last-event'
const HEARTBEAT_STORAGE_KEY = 'luxewash:lane-display:heartbeat'
const MAX_RESTORED_EVENT_AGE_MS = 5 * 60 * 1000

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function safeParse(value) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function sendMessage(message) {
  if (typeof window === 'undefined') return
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.postMessage(message)
    channel.close()
  }
}

export function publishLaneDisplayEvent(event) {
  if (typeof window === 'undefined') return null
  const timestamp = Date.now()
  const payload = {
    kind: 'event',
    eventId: event?.eventId || createId(),
    timestamp,
    type: event?.type || 'idle',
    plate: String(event?.plate ?? '').trim().toUpperCase(),
    laneId: Number(event?.laneId) || null,
    laneName: String(event?.laneName ?? '').trim() || null,
    title: String(event?.title ?? '').trim() || null,
    message: String(event?.message ?? '').trim() || null,
    bookingId: Number(event?.bookingId) || null,
  }
  window.localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(payload))
  window.localStorage.setItem(HEARTBEAT_STORAGE_KEY, String(timestamp))
  sendMessage(payload)
  return payload
}

export function publishLaneDisplayHeartbeat() {
  if (typeof window === 'undefined') return
  const payload = { kind: 'heartbeat', timestamp: Date.now() }
  window.localStorage.setItem(HEARTBEAT_STORAGE_KEY, String(payload.timestamp))
  sendMessage(payload)
}

export function getLatestLaneDisplayEvent() {
  if (typeof window === 'undefined') return null
  const event = safeParse(window.localStorage.getItem(EVENT_STORAGE_KEY))
  if (!event || Date.now() - Number(event.timestamp || 0) > MAX_RESTORED_EVENT_AGE_MS) {
    return null
  }
  return event
}

export function getLastLaneDisplayHeartbeat() {
  if (typeof window === 'undefined') return 0
  return Number(window.localStorage.getItem(HEARTBEAT_STORAGE_KEY)) || 0
}

export function subscribeLaneDisplay(callback) {
  if (typeof window === 'undefined') return () => {}
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null
  const handleMessage = (message) => callback(message)
  const handleStorage = (event) => {
    if (event.key === EVENT_STORAGE_KEY) handleMessage(safeParse(event.newValue))
    if (event.key === HEARTBEAT_STORAGE_KEY) {
      handleMessage({ kind: 'heartbeat', timestamp: Number(event.newValue) || Date.now() })
    }
  }

  if (channel) channel.onmessage = (event) => handleMessage(event.data)
  window.addEventListener('storage', handleStorage)
  return () => {
    channel?.close()
    window.removeEventListener('storage', handleStorage)
  }
}
