import {
  API_BASE_URL,
  API_DEFAULT_TIMEOUT_MS,
} from './config'
import { ApiError } from './errors'
import { getAccessToken } from './session'

/** @type {(() => void) | null} */
let onUnauthorized = null

/** Register handler for 401 — wired in auth layer (commit 2). */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler ?? null
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

/**
 * SmartWash API wrapper — response shape: { statusCode, message, data }
 *
 * @param {string} path e.g. `/admin/services`
 * @param {RequestInit & { auth?: boolean; timeoutMs?: number }} [options]
 * @param {boolean} [options.auth=true] Attach Bearer token when present
 * @returns {Promise<unknown>} `data` field from API wrapper
 */
export async function apiRequest(path, options = {}) {
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

  let response
  try {
    response = await fetch(buildUrl(path), {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Request timed out. Backend may be waking up — try again.', 408)
    }
    throw new ApiError(
      err instanceof Error ? err.message : 'Network error',
      0,
    )
  } finally {
    clearTimeout(timeoutId)
  }

  const body = await parseResponseBody(response)

  if (response.status === 401) {
    onUnauthorized?.()
    throw new ApiError(
      (body && typeof body === 'object' && 'message' in body && body.message) ||
        'Unauthorized',
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
      if (wrapper.statusCode === 401) {
        onUnauthorized?.()
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
