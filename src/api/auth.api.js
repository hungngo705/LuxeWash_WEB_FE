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
