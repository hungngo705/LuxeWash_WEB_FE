import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AdminRoute from './components/auth/AdminRoute'
import BusinessRoute from './components/auth/BusinessRoute'
import ManagerRoute from './components/auth/ManagerRoute'
import RootRedirect from './components/auth/RootRedirect'
import StaffRoute from './components/auth/StaffRoute'
import OperationsDisplayRoute from './components/auth/OperationsDisplayRoute'
import AdminLayout from './components/layout/AdminLayout'
import BusinessLayout from './components/layout/BusinessLayout'
import ManagerLayout from './components/layout/ManagerLayout'
import StaffLayout from './components/layout/StaffLayout'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { ToastProvider } from './components/ui/Toast'
import AdminBookingsPage from './pages/admin/AdminBookingsPage'
import AdminBranchesPage from './pages/admin/AdminBranchesPage'
import AdminCarModelsPage from './pages/admin/AdminCarModelsPage'
import AdminPendingCarModelsPage from './pages/admin/AdminPendingCarModelsPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminEmployeesPage from './pages/admin/AdminEmployeesPage'
import AdminFleetApprovalsPage from './pages/admin/AdminFleetApprovalsPage'
import AdminInventoryPage from './pages/admin/AdminInventoryPage'
import AdminLanesPage from './pages/admin/AdminLanesPage'
import AdminServicesPage from './pages/admin/AdminServicesPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminTimeSlotsPage from './pages/admin/AdminTimeSlotsPage'
import AdminTiersPage from './pages/admin/AdminTiersPage'
import AdminTransactionsPage from './pages/admin/AdminTransactionsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminVehicleApprovalsPage from './pages/admin/AdminVehicleApprovalsPage'
import AdminVehicleTypesPage from './pages/admin/AdminVehicleTypesPage'
import AdminVoucherCampaignsPage from './pages/admin/AdminVoucherCampaignsPage'
import AdminVouchersPage from './pages/admin/AdminVouchersPage'
import CustomersPage from './pages/CustomersPage'
import DashboardPage from './pages/DashboardPage'
import HistoryPage from './pages/HistoryPage'
import LoginPage from './pages/LoginPage'
import StaffQueuePage from './pages/StaffQueuePage'
import StaffBookingsPage from './pages/StaffBookingsPage'
import SettingsPage from './pages/SettingsPage'
import StaffShiftsPage from './pages/StaffShiftsPage'
import ManagerBookingsPage from './pages/manager/ManagerBookingsPage'
import ManagerQueuePage from './pages/manager/ManagerQueuePage'
import ManagerStaffPage from './pages/manager/ManagerStaffPage'
import ManagerWalkInPage from './pages/manager/ManagerWalkInPage'
import ManagerDashboardPage from './pages/manager/ManagerDashboardPage'
import ManagerSettingsPage from './pages/manager/ManagerSettingsPage'
import ManagerLanesPage from './pages/manager/ManagerLanesPage'
import ManagerTimeSlotsPage from './pages/manager/ManagerTimeSlotsPage'
import ManagerEmployeesPage from './pages/manager/ManagerEmployeesPage'
import ManagerCustomersPage from './pages/manager/ManagerCustomersPage'
import ManagerInventoryPage from './pages/manager/ManagerInventoryPage'
import LandingPage from './pages/LandingPage'
import BusinessRegisterPage from './pages/business/BusinessRegisterPage'
import BusinessDashboardPage from './pages/business/BusinessDashboardPage'
import BusinessVehiclesPage from './pages/business/BusinessVehiclesPage'
import BusinessVehicleDetailPage from './pages/business/BusinessVehicleDetailPage'
import BusinessImportPage from './pages/business/BusinessImportPage'
import BusinessImportHistoryPage from './pages/business/BusinessImportHistoryPage'
import BusinessBookingsPage from './pages/business/BusinessBookingsPage'
import BusinessNewBookingPage from './pages/business/BusinessNewBookingPage'
import BusinessBookingDetailPage from './pages/business/BusinessBookingDetailPage'
import BusinessRescheduleBookingPage from './pages/business/BusinessRescheduleBookingPage'
import BusinessWalkInPage from './pages/business/BusinessWalkInPage'
import BusinessFleetQueuePage from './pages/business/BusinessFleetQueuePage'
import BusinessHistoryPage from './pages/business/BusinessHistoryPage'
import BusinessInvoicesPage from './pages/business/BusinessInvoicesPage'
import BusinessInvoiceDetailPage from './pages/business/BusinessInvoiceDetailPage'
import BusinessRedInvoicePage from './pages/business/BusinessRedInvoicePage'
import BusinessCreditPage from './pages/business/BusinessCreditPage'
import BusinessStatementsPage from './pages/business/BusinessStatementsPage'
import BusinessSettingsPage from './pages/business/BusinessSettingsPage'
import AdminBusinessApplicationsPage from './pages/admin/AdminBusinessApplicationsPage'
import AdminBusinessApplicationDetailPage from './pages/admin/AdminBusinessApplicationDetailPage'
import AdminBusinessInvoicesPage from './pages/admin/AdminBusinessInvoicesPage'
import ManagerShiftsPage from './pages/manager/ManagerShiftsPage'
import LaneAssignmentDisplayPage from './pages/display/LaneAssignmentDisplayPage'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/business/register" element={<BusinessRegisterPage />} />
          <Route
            path="/display/lane"
            element={
              <OperationsDisplayRoute>
                <LaneAssignmentDisplayPage />
              </OperationsDisplayRoute>
            }
          />

          <Route
            element={
              <StaffRoute>
                <StaffLayout />
              </StaffRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/bookings" element={<StaffBookingsPage />} />
            <Route path="/queue" element={<StaffQueuePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/shifts" element={<StaffShiftsPage />} />
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
            <Route path="/admin/fleet-approvals" element={<AdminFleetApprovalsPage />} />
            <Route path="/admin/branches" element={<AdminBranchesPage />} />
            <Route path="/admin/lanes" element={<AdminLanesPage />} />
            <Route path="/admin/employees" element={<AdminEmployeesPage />} />
            <Route path="/admin/car-models" element={<AdminCarModelsPage />} />
            <Route path="/admin/pending-car-models" element={<AdminPendingCarModelsPage />} />
            <Route path="/admin/time-slots" element={<AdminTimeSlotsPage />} />
            <Route path="/admin/tiers" element={<AdminTiersPage />} />
            <Route path="/admin/vouchers" element={<AdminVouchersPage />} />
            <Route path="/admin/voucher-campaigns" element={<AdminVoucherCampaignsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/bookings" element={<AdminBookingsPage />} />
            <Route path="/admin/inventory" element={<AdminInventoryPage />} />
            <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
            <Route path="/admin/business-invoices" element={<AdminBusinessInvoicesPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route
              path="/admin/business-applications"
              element={<AdminBusinessApplicationsPage />}
            />
            <Route
              path="/admin/business-applications/:id"
              element={<AdminBusinessApplicationDetailPage />}
            />
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
            <Route path="/manager/customers" element={<ManagerCustomersPage />} />
            <Route path="/manager/walk-in" element={<ManagerWalkInPage />} />
            <Route path="/manager/inventory" element={<ManagerInventoryPage />} />
            <Route path="/manager/settings" element={<ManagerSettingsPage />} />
            <Route path="/manager/shifts" element={<ManagerShiftsPage />} />
          </Route>

          <Route
            element={
              <BusinessRoute>
                <BusinessLayout />
              </BusinessRoute>
            }
          >
            <Route path="/business/dashboard" element={<BusinessDashboardPage />} />
            <Route path="/business/vehicles" element={<BusinessVehiclesPage />} />
            <Route path="/business/vehicles/import" element={<BusinessImportPage />} />
            <Route path="/business/vehicles/history" element={<BusinessImportHistoryPage />} />
            <Route path="/business/vehicles/:id" element={<BusinessVehicleDetailPage />} />
            <Route path="/business/bookings" element={<BusinessBookingsPage />} />
            <Route path="/business/bookings/new" element={<BusinessNewBookingPage />} />
            <Route path="/business/bookings/:id" element={<BusinessBookingDetailPage />} />
            <Route
              path="/business/bookings/:id/reschedule"
              element={<BusinessRescheduleBookingPage />}
            />
            <Route path="/business/walk-in" element={<BusinessWalkInPage />} />
            <Route path="/business/queue" element={<BusinessFleetQueuePage />} />
            <Route path="/business/history" element={<BusinessHistoryPage />} />
            <Route path="/business/invoices" element={<BusinessInvoicesPage />} />
            <Route path="/business/invoices/:id" element={<BusinessInvoiceDetailPage />} />
            <Route
              path="/business/invoices/:id/red-invoice"
              element={<BusinessRedInvoicePage />}
            />
            <Route path="/business/credit" element={<BusinessCreditPage />} />
            <Route path="/business/statements" element={<BusinessStatementsPage />} />
            <Route path="/business/settings" element={<BusinessSettingsPage />} />
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
