import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute'
import RootRedirect from './components/auth/RootRedirect'
import StaffLayout from './components/layout/StaffLayout'
import { AuthProvider } from './context/AuthContext'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import PlaceholderPage from './pages/PlaceholderPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <StaffLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/queue"
              element={
                <PlaceholderPage
                  title="Queue"
                  description="Trang hàng đợi — sẽ triển khai ở commit tiếp theo."
                />
              }
            />
            <Route
              path="/history"
              element={
                <PlaceholderPage
                  title="History"
                  description="Lịch sử xe đã rửa — sẽ triển khai ở commit tiếp theo."
                />
              }
            />
            <Route
              path="/customers"
              element={
                <PlaceholderPage
                  title="Customers"
                  description="Tra cứu khách hàng — sẽ triển khai ở commit tiếp theo."
                />
              }
            />
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
