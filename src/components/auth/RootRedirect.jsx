import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getHomePathForRole } from '../../utils/format'

export default function RootRedirect() {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={getHomePathForRole(user?.role)} replace />
}
