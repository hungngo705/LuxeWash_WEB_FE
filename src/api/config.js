function requireUrl(name, value) {
  const normalized = String(value ?? '').trim().replace(/\/$/, '')
  if (!normalized) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  try {
    new URL(normalized)
  } catch {
    throw new Error(`Invalid URL in environment variable: ${name}`)
  }
  return normalized
}

export const API_BASE_URL = requireUrl(
  'VITE_API_BASE_URL',
  import.meta.env.VITE_API_BASE_URL,
)

function deriveBackendBaseUrl(apiBaseUrl) {
  const suffixPattern = /\/api\/v1$/i
  if (!suffixPattern.test(apiBaseUrl)) {
    throw new Error('VITE_API_BASE_URL must end with /api/v1')
  }
  return apiBaseUrl.replace(suffixPattern, '')
}

export const BACKEND_BASE_URL = deriveBackendBaseUrl(API_BASE_URL)

export const LANE_DISPLAY_HUB_URL = `${BACKEND_BASE_URL}/hubs/lane-display`

export const CAMERA_AI_BASE_URL = requireUrl(
  'VITE_CAMERA_AI_BASE_URL',
  import.meta.env.VITE_CAMERA_AI_BASE_URL,
)

export const AI_API_BASE_URL = requireUrl(
  'VITE_AI_API_BASE_URL',
  import.meta.env.VITE_AI_API_BASE_URL,
)

export const ESP32_BARRIER_BASE_URL = requireUrl(
  'VITE_ESP32_BARRIER_BASE_URL',
  import.meta.env.VITE_ESP32_BARRIER_BASE_URL,
)

export const ESP32_BARRIER_DEVICE_KEY =
  import.meta.env.VITE_ESP32_BARRIER_DEVICE_KEY ?? ''

export const SESSION_STORAGE_KEY = 'luxewash_session'
export const LEGACY_SESSION_STORAGE_KEY = 'luxewash_staff_session'

/** Render free tier cold start — requests may take 15–30s first call */
export const API_DEFAULT_TIMEOUT_MS = 60_000
