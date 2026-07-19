import {
  API_BASE_URL,
  API_DEFAULT_TIMEOUT_MS,
} from './config'
import { ApiError } from './errors'
import { getAccessToken, getStoredSession, saveSession } from './session'

/** @type {(() => void) | null} */
let onUnauthorized = null
/** @type {((session: Record<string, unknown>) => void) | null} */
let onSessionRefreshed = null
/** @type {Promise<Record<string, unknown>> | null} */
let refreshPromise = null

/** Register handler for 401 — wired in auth layer (commit 2). */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler ?? null
}

export function setSessionRefreshedHandler(handler) {
  onSessionRefreshed = handler ?? null
}

function buildUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL.replace(/\/$/, '')}${normalized}`
}

/**
 * @param {Response} response
 * @returns {Promise<unknown>}
 */
async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  const text = await response.text()
  return text ? { message: text } : null
}

function getErrorMessage(body) {
  if (body && typeof body === 'object' && 'message' in body) {
    return String(body.message ?? '')
  }
  return ''
}

function shouldLogoutOnUnauthorized(body) {
  const message = getErrorMessage(body).toLowerCase()
  if (message.includes('branchid') || message.includes('chi nhánh')) {
    return false
  }
  return true
}

async function refreshStoredSession(timeoutMs) {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const session = getStoredSession()
    if (!session?.token || !session?.refreshToken) {
      throw new ApiError('Missing refresh token', 401)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    let response
    try {
      response = await fetch(buildUrl('/auth/refresh-token'), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: session.token,
          refreshToken: session.refreshToken,
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const body = await parseResponseBody(response)
    if (!response.ok) {
      throw new ApiError(
        getErrorMessage(body) || `HTTP ${response.status}`,
        response.status,
        body,
      )
    }

    const data =
      body && typeof body === 'object' && 'statusCode' in body
        ? body.data
        : body

    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid refresh token response', 401, body)
    }

    const token = data.token ?? data.accessToken
    if (typeof token !== 'string' || !token) {
      throw new ApiError('Refresh response did not include an access token', 401, body)
    }

    const nextSession = {
      ...session,
      userId: data.userId ?? session.userId,
      phoneNumber: data.phoneNumber ?? session.phoneNumber,
      fullName: data.fullName ?? session.fullName,
      role: data.role ?? session.role,
      token,
      refreshToken: data.refreshToken ?? session.refreshToken,
    }

    saveSession(nextSession)
    onSessionRefreshed?.(nextSession)
    return nextSession
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

/**
 * SmartWash API wrapper — response shape: { statusCode, message, data }
 *
 * @param {string} path e.g. `/admin/services`
 * @param {RequestInit & { auth?: boolean; timeoutMs?: number }} [options]
 * @param {boolean} [options.auth=true] Attach Bearer token when present
 * @returns {Promise<unknown>} `data` field from API wrapper
 */
export async function apiRequest(path, options = {}) {
  return apiRequestInternal(path, options, false)
}

async function apiRequestInternal(path, options = {}, hasRetriedAfterRefresh) {
  const {
    auth = true,
    timeoutMs = API_DEFAULT_TIMEOUT_MS,
    headers: customHeaders,
    ...fetchOptions
  } = options

  const headers = new Headers(customHeaders)

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  const hasBody = fetchOptions.body != null && fetchOptions.body !== ''
  const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData

  if (hasBody && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (auth) {
    const token = getAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  // Chain caller's signal (so React effect cleanup can cancel in-flight requests).
  const externalSignal = fetchOptions.signal
  const onExternalAbort = () => controller.abort()
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true })
  }

  let response
  try {
    response = await fetch(buildUrl(path), {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })
  } catch (err) {
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort)
    if (err instanceof Error && err.name === 'AbortError') {
      if (externalSignal?.aborted) {
        const abortErr = new Error('Aborted')
        abortErr.name = 'AbortError'
        throw abortErr
      }
      throw new ApiError('Request timed out. Backend may be waking up — try again.', 408)
    }
    throw new ApiError(
      err instanceof Error ? err.message : 'Network error',
      0,
    )
  } finally {
    clearTimeout(timeoutId)
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort)
  }

  const body = await parseResponseBody(response)

  if (response.status === 401) {
    if (auth && !hasRetriedAfterRefresh && shouldLogoutOnUnauthorized(body)) {
      try {
        const refreshedSession = await refreshStoredSession(timeoutMs)
        const retryOptions = {
          ...options,
          headers: new Headers(options.headers),
        }
        retryOptions.headers.set('Authorization', `Bearer ${refreshedSession.token}`)
        return apiRequestInternal(path, retryOptions, true)
      } catch {
        onUnauthorized?.()
      }
    } else if (shouldLogoutOnUnauthorized(body)) {
      onUnauthorized?.()
    }

    throw new ApiError(
      getErrorMessage(body) || 'Unauthorized',
      401,
      body,
    )
  }

  if (!response.ok) {
    throw new ApiError(
      (body && typeof body === 'object' && 'message' in body && body.message) ||
        `HTTP ${response.status}`,
      response.status,
      body,
    )
  }

  if (body && typeof body === 'object' && 'statusCode' in body) {
    const wrapper = /** @type {{ statusCode: number; message?: string; data?: unknown }} */ (
      body
    )

    if (wrapper.statusCode >= 400) {
      if (wrapper.statusCode === 401 && shouldLogoutOnUnauthorized(body)) {
        if (auth && !hasRetriedAfterRefresh) {
          try {
            const refreshedSession = await refreshStoredSession(timeoutMs)
            const retryOptions = {
              ...options,
              headers: new Headers(options.headers),
            }
            retryOptions.headers.set('Authorization', `Bearer ${refreshedSession.token}`)
            return apiRequestInternal(path, retryOptions, true)
          } catch {
            onUnauthorized?.()
          }
        } else {
          onUnauthorized?.()
        }
      }
      throw new ApiError(wrapper.message ?? 'Request failed', wrapper.statusCode, body)
    }

    return wrapper.data
  }

  return body
}

export { API_BASE_URL } from './config'
export { ApiError } from './errors'
export { clearSession, getAccessToken, getStoredSession, saveSession } from './session'
