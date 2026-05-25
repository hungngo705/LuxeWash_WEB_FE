import { createContext, useContext, useMemo, useState } from 'react'
import { findStaffAccount } from '../data/staffAccounts'

const AuthContext = createContext(null)
const STORAGE_KEY = 'luxewash_staff_session'

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [staff, setStaff] = useState(loadSession)
  const [error, setError] = useState('')

  const login = (phoneOrEmail, password) => {
    const account = findStaffAccount(phoneOrEmail, password)
    if (!account) {
      setError('Số điện thoại hoặc mật khẩu không đúng. Chỉ tài khoản Staff được phép đăng nhập.')
      return false
    }
    const session = {
      userId: account.userId,
      phoneNumber: account.phoneNumber,
      fullName: account.fullName,
      role: account.role,
      station: account.station,
      avatar: account.avatar,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    setStaff(session)
    setError('')
    return true
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setStaff(null)
    setError('')
  }

  const value = useMemo(
    () => ({ staff, isAuthenticated: Boolean(staff), login, logout, error, setError }),
    [staff, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
