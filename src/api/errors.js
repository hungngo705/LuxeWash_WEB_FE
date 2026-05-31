export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode HTTP or app statusCode from wrapper
   * @param {unknown} [payload] Full response body when available
   */
  constructor(message, statusCode, payload = null) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.payload = payload
  }

  get isUnauthorized() {
    return this.statusCode === 401
  }

  get isForbidden() {
    return this.statusCode === 403
  }
}
