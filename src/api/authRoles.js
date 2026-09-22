import { decodeJwtPayload } from './laneDisplay.api'
import { getAccessToken } from './session'

/**
 * Trích role từ JWT của user đang đăng nhập.
 *
 * Hỗ trợ các dạng claim:
 * - "role" (chuẩn OAuth)
 * - "http://schemas.microsoft.com/ws/2008/06/identity/claims/role" (mặc định của ASP.NET Core JwtBearer)
 *
 * @returns {string | null}
 */
export function getRoleFromToken() {
  const payload = decodeJwtPayload(getAccessToken())
  if (!payload || typeof payload !== 'object') return null
  const raw =
    payload.role ??
    payload.Role ??
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
    null
  return raw == null ? null : String(raw).trim() || null
}
