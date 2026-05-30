import { createContext, useContext, useMemo, useState } from 'react'
import { findAdminAccount } from '../data/adminAccounts'
import { findStaffAccount } from '../data/staffAccounts'

const AuthContext = createContext(null)
const STORAGE_KEY = 'luxewash_session'
const LEGACY_KEY = 'luxewash_staff_session'

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function buildSession(account) {
  const base = {
    userId: account.userId,
    phoneNumber: account.phoneNumber,
    fullName: account.fullName,
    role: account.role,
    avatar: account.avatar,
  }
  if (account.role === 'Staff') return { ...base, station: account.station }
  if (account.role === 'Admin') return { ...base, email: account.email }
  return base
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadSession)
  const [error, setError] = useState('')

  const login = (phoneOrEmail, password) => {
    const admin = findAdminAccount(phoneOrEmail, password)
    const staff = !admin ? findStaffAccount(phoneOrEmail, password) : null
    const account = admin ?? staff

    if (!account) {
      setError('Số điện thoại hoặc mật khẩu không đúng.')
      return null
    }

    const session = buildSession(account)
    localStorage.removeItem(LEGACY_KEY)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    setUser(session)
    setError('')
    return session.role
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LEGACY_KEY)
    setUser(null)
    setError('')
  }

  const value = useMemo(
    () => ({
      user,
      staff: user,
      isAuthenticated: Boolean(user),
      login,
      logout,
      error,
      setError,
    }),
    [user, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
