import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import BusinessSidebar from './BusinessSidebar'
import BusinessTopBar from './BusinessTopBar'

const PAGE_TITLES = {
  '/business/dashboard': 'Dashboard',
  '/business/vehicles': 'Quản lý xe',
  '/business/vehicles/import': 'Nhập danh sách xe',
  '/business/vehicles/history': 'Lịch sử nhập xe',
  '/business/vehicles/:id': 'Chi tiết xe',
  '/business/bookings': 'Đặt lịch',
  '/business/bookings/new': 'Đặt lịch mới',
  '/business/bookings/:id': 'Chi tiết đặt lịch',
  '/business/queue': 'Hàng đợi Fleet',
  '/business/walk-in': 'Check-in trực tiếp',
  '/business/history': 'Lịch sử rửa xe',
  '/business/invoices': 'Hóa đơn',
  '/business/invoices/:id': 'Chi tiết hóa đơn',
  '/business/invoices/:id/red-invoice': 'Yêu cầu hóa đơn đỏ',
  '/business/credit': 'Hạn mức tín dụng',
  '/business/statements': 'Báo cáo tháng',
  '/business/settings': 'Cài đặt',
}

function getTitle(pathname) {
  for (const [key, value] of Object.entries(PAGE_TITLES)) {
    if (key.includes(':')) {
      const regex = new RegExp(`^${key.replace(/:[^/]+/g, '[^/]+')}$`)
      if (regex.test(pathname)) return value
    } else if (pathname === key) {
      return value
    }
  }
  return 'Business Portal'
}

export default function BusinessLayout() {
  const { business } = useAuth()
  const { pathname } = useLocation()
  const title = getTitle(pathname)

  return (
    <div className="min-h-screen bg-background">
      <BusinessSidebar />
      <BusinessTopBar title={title} user={business} />
      <main className="ml-64 mt-16 min-h-[calc(100vh-4rem)] p-6">
        <Outlet />
      </main>
    </div>
  )
}
