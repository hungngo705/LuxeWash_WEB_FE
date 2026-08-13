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

const VIETNAMESE_API_ERRORS = new Map([
  [
    'INSUFFICIENT_WALLET_BALANCE',
    'Số dư ví không đủ để thanh toán hóa đơn.',
  ],
  [
    'BUSINESS_CREDIT_LIMIT_EXCEEDED',
    'Doanh nghiệp không còn đủ hạn mức tín dụng để tạo đặt lịch này.',
  ],
  [
    'NO_UNINVOICED_COMPLETED_WASHES',
    'Không có lượt rửa đã hoàn thành nào chưa được xuất hóa đơn trong kỳ đã chọn.',
  ],
  [
    'No uninvoiced completed washes found in this time period.',
    'Không có lượt rửa đã hoàn thành nào chưa được xuất hóa đơn trong kỳ đã chọn.',
  ],
])

/**
 * Converts known backend error codes/messages to user-facing Vietnamese text.
 * Keeps the backend message for unknown errors so diagnostics are not hidden.
 *
 * @param {unknown} error
 * @param {string} fallback
 */
export function getVietnameseApiErrorMessage(error, fallback) {
  const err = error && typeof error === 'object' ? error : null
  const payload = err?.payload && typeof err.payload === 'object' ? err.payload : null
  const candidates = [
    payload?.errorCode,
    payload?.code,
    payload?.message,
    err?.message,
  ]

  for (const candidate of candidates) {
    const normalized = String(candidate ?? '').trim()
    if (!normalized) continue
    const translated = VIETNAMESE_API_ERRORS.get(normalized)
    if (translated) return translated
  }

  return String(err?.message ?? '').trim() || fallback
}
