import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AdminRoute from './components/auth/AdminRoute'
import ManagerRoute from './components/auth/ManagerRoute'
import RootRedirect from './components/auth/RootRedirect'
import StaffRoute from './components/auth/StaffRoute'
import AdminLayout from './components/layout/AdminLayout'
import ManagerLayout from './components/layout/ManagerLayout'
import StaffLayout from './components/layout/StaffLayout'
import { AuthProvider } from './context/AuthContext'
import AdminBookingsPage from './pages/admin/AdminBookingsPage'
import AdminBranchesPage from './pages/admin/AdminBranchesPage'
import AdminCarModelsPage from './pages/admin/AdminCarModelsPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminEmployeesPage from './pages/admin/AdminEmployeesPage'
import AdminLanesPage from './pages/admin/AdminLanesPage'
import AdminServicesPage from './pages/admin/AdminServicesPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminTimeSlotsPage from './pages/admin/AdminTimeSlotsPage'
import AdminTiersPage from './pages/admin/AdminTiersPage'
import AdminTransactionsPage from './pages/admin/AdminTransactionsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminVehicleApprovalsPage from './pages/admin/AdminVehicleApprovalsPage'
import AdminVehicleTypesPage from './pages/admin/AdminVehicleTypesPage'
import AdminVouchersPage from './pages/admin/AdminVouchersPage'
import CustomersPage from './pages/CustomersPage'
import DashboardPage from './pages/DashboardPage'
import HistoryPage from './pages/HistoryPage'
import LoginPage from './pages/LoginPage'
import QueuePage from './pages/QueuePage'
import SettingsPage from './pages/SettingsPage'
import ManagerBookingsPage from './pages/manager/ManagerBookingsPage'
import ManagerQueuePage from './pages/manager/ManagerQueuePage'
import ManagerStaffPage from './pages/manager/ManagerStaffPage'
import ManagerWalkInPage from './pages/manager/ManagerWalkInPage'
import ManagerDashboardPage from './pages/manager/ManagerDashboardPage'
import ManagerSettingsPage from './pages/manager/ManagerSettingsPage'
import ManagerLanesPage from './pages/manager/ManagerLanesPage'
import ManagerTimeSlotsPage from './pages/manager/ManagerTimeSlotsPage'
import ManagerEmployeesPage from './pages/manager/ManagerEmployeesPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <StaffRoute>
                <StaffLayout />
              </StaffRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/services" element={<AdminServicesPage />} />
            <Route path="/admin/vehicle-types" element={<AdminVehicleTypesPage />} />
            <Route path="/admin/vehicle-approvals" element={<AdminVehicleApprovalsPage />} />
            <Route path="/admin/branches" element={<AdminBranchesPage />} />
            <Route path="/admin/lanes" element={<AdminLanesPage />} />
            <Route path="/admin/employees" element={<AdminEmployeesPage />} />
            <Route path="/admin/car-models" element={<AdminCarModelsPage />} />
            <Route path="/admin/time-slots" element={<AdminTimeSlotsPage />} />
            <Route path="/admin/tiers" element={<AdminTiersPage />} />
            <Route path="/admin/vouchers" element={<AdminVouchersPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/bookings" element={<AdminBookingsPage />} />
            <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>

          <Route
            element={
              <ManagerRoute>
                <ManagerLayout />
              </ManagerRoute>
            }
          >
            <Route path="/manager/dashboard" element={<ManagerDashboardPage />} />
            <Route path="/manager/bookings" element={<ManagerBookingsPage />} />
            <Route path="/manager/queue" element={<ManagerQueuePage />} />
            <Route path="/manager/lanes" element={<ManagerLanesPage />} />
            <Route path="/manager/time-slots" element={<ManagerTimeSlotsPage />} />
            <Route path="/manager/staff" element={<ManagerStaffPage />} />
            <Route path="/manager/employees" element={<ManagerEmployeesPage />} />
            <Route path="/manager/walk-in" element={<ManagerWalkInPage />} />
            <Route path="/manager/settings" element={<ManagerSettingsPage />} />
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
