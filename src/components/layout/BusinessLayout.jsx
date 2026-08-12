import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { fetchBusinessProfile } from '../../api/business.api'
import { useAuth } from '../../context/AuthContext'
import BusinessSidebar from './BusinessSidebar'
import BusinessTopBar from './BusinessTopBar'

const PAGE_TITLES = {
  '/business/bookings/:id/reschedule': 'Đổi lịch đặt',
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
  const { patchUser } = useAuth()
  const { pathname } = useLocation()
  const title = getTitle(pathname)
  const [approvalStatus, setApprovalStatus] = useState(null)

  useEffect(() => {
    fetchBusinessProfile()
      .then((profile) => {
        setApprovalStatus(profile?.approvalStatus ?? null)
        if (profile) {
          patchUser({
            companyName: profile.companyName,
            email: profile.billingEmail,
          })
        }
      })
      .catch(() => {})
  }, [patchUser])

  return (
    <div className="min-h-screen bg-background">
      <BusinessSidebar />
      <BusinessTopBar title={title} />
      <main className="ml-64 mt-16 min-h-[calc(100vh-4rem)] p-6">
        {approvalStatus && approvalStatus !== 'Approved' && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
            <span className="material-symbols-outlined text-yellow-700">info</span>
            <div className="text-sm text-yellow-900">
              <p className="font-medium">Hồ sơ doanh nghiệp: {approvalStatus}</p>
              <p className="mt-0.5 text-yellow-800">
                Một số tính năng (nhập xe, đặt lịch, hàng đợi) có thể bị giới hạn cho đến khi Admin/Manager duyệt hồ sơ.
              </p>
            </div>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
