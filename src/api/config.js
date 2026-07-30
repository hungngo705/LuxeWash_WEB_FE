export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://smartwash-be.onrender.com/api/v1'

export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL ??
  API_BASE_URL.replace(/\/api\/v1\/?$/i, '')

export const LANE_DISPLAY_HUB_URL =
  import.meta.env.VITE_LANE_DISPLAY_HUB_URL ??
  `${BACKEND_BASE_URL.replace(/\/$/, '')}/hubs/lane-display`

export const CAMERA_AI_BASE_URL =
  import.meta.env.VITE_CAMERA_AI_BASE_URL ?? 'https://localhost:7063'

export const AI_API_BASE_URL =
  import.meta.env.VITE_AI_API_BASE_URL ??
  `${CAMERA_AI_BASE_URL.replace(/\/$/, '')}/api/v1`

export const SESSION_STORAGE_KEY = 'luxewash_session'
export const LEGACY_SESSION_STORAGE_KEY = 'luxewash_staff_session'

/** Render free tier cold start — requests may take 15–30s first call */
export const API_DEFAULT_TIMEOUT_MS = 60_000
