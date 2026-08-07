import {
  ESP32_BARRIER_BASE_URL,
  ESP32_BARRIER_DEVICE_KEY,
} from '../api/config'

export const BARRIER_DEVICE_SETTINGS_KEY = 'luxewash:barrier-device:settings'

export const BARRIER_GATES = Object.freeze({
  ENTRY_REGULAR: 'entryRegular',
  ENTRY_VIP: 'entryVip',
  EXIT: 'exit',
})

const BARRIER_GATE_PATHS = Object.freeze({
  [BARRIER_GATES.ENTRY_REGULAR]: 'entry-regular',
  [BARRIER_GATES.ENTRY_VIP]: 'entry-vip',
  [BARRIER_GATES.EXIT]: 'exit',
})

export function gateFromBarrierId(barrierId) {
  switch (String(barrierId ?? '').trim().toUpperCase()) {
    case 'ENTRY_VIP_GATE':
      return BARRIER_GATES.ENTRY_VIP
    case 'ENTRY_REGULAR_GATE':
    case 'ENTRY_GATE':
      return BARRIER_GATES.ENTRY_REGULAR
    case 'EXIT_GATE':
      return BARRIER_GATES.EXIT
    default:
      return null
  }
}

export function gateFromQueueLaneType(queueLaneType) {
  return String(queueLaneType ?? '').trim().toLowerCase() === 'vip'
    ? BARRIER_GATES.ENTRY_VIP
    : BARRIER_GATES.ENTRY_REGULAR
}

export function getBarrierGateLabel(gate) {
  return {
    [BARRIER_GATES.ENTRY_REGULAR]: 'cổng vào làn thường',
    [BARRIER_GATES.ENTRY_VIP]: 'cổng vào làn VIP',
    [BARRIER_GATES.EXIT]: 'cổng ra',
  }[gate] ?? 'không xác định'
}

function normalizeBarrierGate(gate) {
  if (gate === 'entry') return BARRIER_GATES.ENTRY_REGULAR
  return Object.values(BARRIER_GATES).includes(gate) ? gate : null
}

function getBarrierGatePath(gate) {
  const normalizedGate = normalizeBarrierGate(gate)
  if (!normalizedGate) throw new Error('Không xác định được barie cần điều khiển.')
  return BARRIER_GATE_PATHS[normalizedGate]
}

function normalizeBaseUrl(value) {
  return String(value ?? '').trim().replace(/\/$/, '')
}

export function getDefaultBarrierDeviceSettings() {
  return {
    enabled: true,
    baseUrl: normalizeBaseUrl(ESP32_BARRIER_BASE_URL),
    deviceKey: String(ESP32_BARRIER_DEVICE_KEY ?? '').trim(),
  }
}

export function loadBarrierDeviceSettings() {
  const defaults = getDefaultBarrierDeviceSettings()
  if (typeof window === 'undefined') return defaults
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(BARRIER_DEVICE_SETTINGS_KEY) || '{}',
    )
    return {
      enabled: stored.enabled !== false,
      baseUrl: normalizeBaseUrl(stored.baseUrl || defaults.baseUrl),
      deviceKey: String(stored.deviceKey ?? defaults.deviceKey).trim(),
    }
  } catch {
    return defaults
  }
}

export function saveBarrierDeviceSettings(settings) {
  const normalized = {
    enabled: settings?.enabled !== false,
    baseUrl: normalizeBaseUrl(settings?.baseUrl),
    deviceKey: String(settings?.deviceKey ?? '').trim(),
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      BARRIER_DEVICE_SETTINGS_KEY,
      JSON.stringify(normalized),
    )
  }
  return normalized
}

async function requestDevice(settings, path, options = {}) {
  const baseUrl = normalizeBaseUrl(settings?.baseUrl)
  if (!baseUrl) throw new Error('Chưa cấu hình địa chỉ ESP32.')

  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    baseUrl.startsWith('http://')
  ) {
    throw new Error('Trình duyệt HTTPS không thể gọi ESP32 qua HTTP. Hãy dùng frontend local hoặc HTTPS gateway.')
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeoutMs ?? 4_000)
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (settings?.deviceKey) headers.set('X-Device-Key', settings.deviceKey)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    const text = await response.text()
    let body = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = text ? { message: text } : null
    }
    if (!response.ok) {
      throw new Error(body?.message || `ESP32 trả về HTTP ${response.status}.`)
    }
    return body
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('ESP32 không phản hồi trong thời gian cho phép.', {
        cause: error,
      })
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export function fetchBarrierDeviceStatus(settings) {
  return requestDevice(settings, '/api/status', { method: 'GET' })
}

export function openBarrierDevice(settings, gate, command = {}) {
  const gatePath = getBarrierGatePath(gate)
  return requestDevice(settings, `/api/barriers/${gatePath}/open`, {
    method: 'POST',
    body: JSON.stringify({
      commandId: String(command.commandId ?? '').trim() || undefined,
      licensePlate: String(command.licensePlate ?? '').trim() || undefined,
      source: String(command.source ?? '').trim() || undefined,
    }),
  })
}

export function closeBarrierDevice(settings, gate, { force = false } = {}) {
  const gatePath = getBarrierGatePath(gate)
  return requestDevice(settings, `/api/barriers/${gatePath}/close`, {
    method: 'POST',
    body: JSON.stringify({ force }),
  })
}
