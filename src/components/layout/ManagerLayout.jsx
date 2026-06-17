import { Outlet, useLocation } from 'react-router-dom'
import ManagerSidebar from './ManagerSidebar'
import ManagerTopBar from './ManagerTopBar'

const PAGE_TITLES = {
  '/manager/dashboard': 'Tổng quan chi nhánh',
  '/manager/bookings': 'Lịch đặt',
  '/manager/queue': 'Điều phối xe vào làn',
  '/manager/lanes': 'Quản lý làn rửa',
  '/manager/time-slots': 'Khung giờ đặt lịch',
  '/manager/staff': 'Phân công nhân viên & Làn',
  '/manager/employees': 'Quản lý nhân viên',
  '/manager/walk-in': 'Tiếp nhận khách vãng lai',
  '/manager/settings': 'Cài đặt Manager',
  '/manager/fleet-approvals': 'Duyệt xe doanh nghiệp',
  '/manager/shifts': 'Quản lý ca làm',
  '/manager/business-applications': 'Đơn doanh nghiệp',
}

export default function ManagerLayout() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'LuxeWash Manager'

  return (
    <div className="min-h-screen bg-background">
      <ManagerSidebar />
      <ManagerTopBar title={title} />
      <main className="ml-64 mt-16 min-h-[calc(100vh-4rem)] p-6">
        <Outlet />
      </main>
    </div>
  )
}
