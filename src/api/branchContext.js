import { getAccessToken } from './session'

/**
 * @param {string | null | undefined} token
 * @returns {Record<string, unknown> | null}
 */
function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

/**
 * @param {unknown} raw
 * @returns {number | undefined}
 */
function normalizeBranchId(raw) {
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

/**
 * Đọc branchId từ JWT của user đang đăng nhập. Dùng như fallback cuối cùng
 * khi session không có field branchId (vd. Manager vừa đăng nhập trước khi
 * AuthContext kịp merge branchId từ profile).
 *
 * BE nhúng `branchId` (hoặc `BranchId`) vào JWT cho role Manager/Staff/Admin.
 *
 * @returns {number | undefined}
 */
export function getBranchIdFromToken() {
  const payload = decodeJwtPayload(getAccessToken())
  if (!payload) return undefined
  return normalizeBranchId(payload.BranchId ?? payload.branchId)
}

/**
 * Lấy branchId từ session, fallback về JWT nếu session không có.
 * Trả về undefined khi cả 2 đều không xác định được branch hợp lệ (>0).
 *
 * @param {{ branchId?: number | string | null } | null | undefined} session
 * @returns {number | undefined}
 */
export function getBranchId(session) {
  return normalizeBranchId(session?.branchId) ?? getBranchIdFromToken()
}