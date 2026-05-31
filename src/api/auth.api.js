import { apiRequest } from './client'

/**
 * @param {string} phoneOrEmail
 * @param {string} password
 * @returns {Promise<{
 *   userId: number
 *   phoneNumber: string
 *   fullName: string
 *   token: string
 *   refreshToken: string
 *   role: string
 * }>}
 */
export function loginWithCredentials(phoneOrEmail, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ phoneOrEmail, password }),
  })
}

/**
 * @param {string} accessToken
 * @param {string} refreshToken
 */
export function refreshAccessToken(accessToken, refreshToken) {
  return apiRequest('/auth/refresh-token', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ accessToken, refreshToken }),
  })
}

/** @returns {Promise<Record<string, unknown>>} */
export function fetchCurrentUser() {
  return apiRequest('/users/me')
}

/**
 * @param {{ fullName?: string; phoneNumber?: string; email?: string | null }} payload
 * @returns {Promise<Record<string, unknown>>}
 */
export function updateCurrentUserProfile(payload) {
  return apiRequest('/users/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** @param {string} oldPassword @param {string} newPassword */
export function changePassword(oldPassword, newPassword) {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  })
}
