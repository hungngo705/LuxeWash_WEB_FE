import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const ALLOWED_ROLES = new Set(['Staff', 'Manager'])

export default function OperationsDisplayRoute({ children }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (!ALLOWED_ROLES.has(user?.role)) return <Navigate to="/" replace />
  return children
}
