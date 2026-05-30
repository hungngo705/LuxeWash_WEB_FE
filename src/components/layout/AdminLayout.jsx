import { Outlet, useLocation } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import AdminTopBar from './AdminTopBar'

const PAGE_TITLES = {
  '/admin/dashboard': 'Tổng quan vận hành',
  '/admin/services': 'Quản lý dịch vụ',
  '/admin/vehicle-types': 'Loại xe',
  '/admin/vehicle-approvals': 'Duyệt loại xe',
  '/admin/time-slots': 'Khung giờ đặt lịch',
  '/admin/tiers': 'Hạng thành viên',
  '/admin/vouchers': 'Quản lý voucher',
  '/admin/users': 'Người dùng hệ thống',
  '/admin/bookings': 'Lịch đặt toàn hệ thống',
  '/admin/transactions': 'Giao dịch & điểm',
  '/admin/settings': 'Cài đặt Admin',
}

export default function AdminLayout() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'LuxeWash Admin'

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <AdminTopBar title={title} />
      <main className="ml-64 mt-16 min-h-[calc(100vh-4rem)] p-6">
        <Outlet />
      </main>
    </div>
  )
}
