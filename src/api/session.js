import { LEGACY_SESSION_STORAGE_KEY, SESSION_STORAGE_KEY } from './config'

/**
 * @returns {Record<string, unknown> | null}
 */
export function getStoredSession() {
  try {
    const raw =
      localStorage.getItem(SESSION_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_SESSION_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** @returns {string | null} JWT access token from login (commit 2+) */
export function getAccessToken() {
  const session = getStoredSession()
  const token = session?.token
  return typeof token === 'string' && token.length > 0 ? token : null
}

/**
 * @param {{ token?: string; refreshToken?: string } & Record<string, unknown>} session
 */
export function saveSession(session) {
  localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY)
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY)
  localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY)
}
