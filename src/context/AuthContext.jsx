import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchCurrentUser, loginWithCredentials, refreshAccessToken } from '../api/auth.api'
import { ApiError, setUnauthorizedHandler } from '../api/client'
import { clearSession, getStoredSession, saveSession } from '../api/session'

const AuthContext = createContext(null)

const DEFAULT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuClp7ADyI2iBVUMA7EIoPJsEAYC2R4QW-wLfbu4V-aXdn2Mz-TQbaCcFYwtlZAX9KsIFU7XGtg5P5AR6HmgOL12_CBKkQdCh9I-BO7ZutWni9cVeBvi07Qicp7uFO9EVhZ3lpQueRoPAmxh8p_bGfItEe3Q60cAdRRZDEUlgQ93Hj6MZEy9-MlXay4Ab63PaE6vJ6tQIlxr64EslF4K7_d4wmwqOG_XztDYgbI4RSQGLu2p4iTRecovl8-Wcs-iPQ7biJH3ov3inmPr'

const PORTAL_ROLES = new Set(['Admin', 'Staff'])

function isPortalSession(session) {
  return Boolean(
    session?.token &&
      typeof session.token === 'string' &&
      PORTAL_ROLES.has(session.role),
  )
}

function loadSession() {
  const session = getStoredSession()
  return isPortalSession(session) ? session : null
}

/**
 * @param {Record<string, unknown>} data Login API `data`
 */
function mapLoginToSession(data) {
  const role = String(data.role ?? '')
  const session = {
    userId: data.userId,
    phoneNumber: data.phoneNumber,
    fullName: data.fullName,
    role,
    token: data.token,
    refreshToken: data.refreshToken,
    avatar: DEFAULT_AVATAR,
  }

  if (role === 'Staff') {
    return { ...session, station: 'Station 04' }
  }

  return session
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadSession)
  const [error, setError] = useState('')

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
    setError('')
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => logout())
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const login = useCallback(async (phoneOrEmail, password) => {
    setError('')

    try {
      const data = await loginWithCredentials(phoneOrEmail.trim(), password)
      const role = String(data.role ?? '')

      if (role === 'Customer') {
        setError('Tài khoản khách hàng không được phép đăng nhập portal web.')
        return null
      }

      if (!PORTAL_ROLES.has(role)) {
        setError('Tài khoản không có quyền truy cập portal Staff/Admin.')
        return null
      }

      let session = mapLoginToSession(data)
      saveSession(session)

      try {
        const profile = await fetchCurrentUser()
        session = {
          ...session,
          fullName: profile.fullName ?? session.fullName,
          phoneNumber: profile.phoneNumber ?? session.phoneNumber,
        }
        saveSession(session)
      } catch {
        // Profile optional right after login
      }

      setUser(session)
      return session.role
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Không thể đăng nhập. Vui lòng thử lại.'
      setError(message)
      return null
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      staff: user,
      isAuthenticated: isPortalSession(user),
      login,
      logout,
      error,
      setError,
      refreshSession: async () => {
        if (!user?.token || !user?.refreshToken) return false
        try {
          const data = await refreshAccessToken(user.token, user.refreshToken)
          const next = {
            ...user,
            token: data.token ?? data.accessToken ?? user.token,
            refreshToken: data.refreshToken ?? user.refreshToken,
          }
          saveSession(next)
          setUser(next)
          return true
        } catch {
          logout()
          return false
        }
      },
      refreshProfile: async () => {
        if (!user) return null
        try {
          const profile = await fetchCurrentUser()
          const next = {
            ...user,
            fullName: profile.fullName ?? user.fullName,
            phoneNumber: profile.phoneNumber ?? user.phoneNumber,
            email: profile.email ?? user.email,
          }
          saveSession(next)
          setUser(next)
          return profile
        } catch {
          return null
        }
      },
      patchUser: (updates) => {
        setUser((prev) => {
          if (!prev) return prev
          const next = { ...prev, ...updates }
          saveSession(next)
          return next
        })
      },
    }),
    [user, error, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
