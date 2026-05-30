import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user?.role === 'Staff') {
    return <Navigate to="/dashboard" replace />
  }

  if (user?.role !== 'Admin') {
    return <Navigate to="/login" replace />
  }

  return children
}
