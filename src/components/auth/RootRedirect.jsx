import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/** Trang đầu: Login nếu chưa đăng nhập, Dashboard nếu đã đăng nhập */
export default function RootRedirect() {
  const { isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
}
