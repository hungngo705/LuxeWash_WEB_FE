export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://smartwash-be.onrender.com/api/v1'

export const SESSION_STORAGE_KEY = 'luxewash_session'
export const LEGACY_SESSION_STORAGE_KEY = 'luxewash_staff_session'

/** Render free tier cold start — requests may take 15–30s first call */
export const API_DEFAULT_TIMEOUT_MS = 60_000
