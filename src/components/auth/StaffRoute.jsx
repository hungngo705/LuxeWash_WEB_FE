import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function StaffRoute({ children }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user?.role === 'Admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  if (user?.role !== 'Staff') {
    return <Navigate to="/login" replace />
  }

  return children
}
