import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBusinessDashboard, fetchBusinessBookings } from '../../api/business.api'
import { formatVnd, formatDateTime } from '../../utils/format'

function KpiCard({ icon, label, value, sub, color = 'text-primary', bg = 'bg-primary/10' }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-on-surface-variant mb-1">{label}</p>
          <p className={`font-sora text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-on-surface-variant mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center`}>
          <span className={`material-symbols-outlined ${color}`}>{icon}</span>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    Pending: { label: 'Chờ xác nhận', className: 'bg-yellow-100 text-yellow-800' },
    Confirmed: { label: 'Đã xác nhận', className: 'bg-blue-100 text-blue-800' },
    CheckedIn: { label: 'Đã check-in', className: 'bg-purple-100 text-purple-800' },
    Processing: { label: 'Đang rửa', className: 'bg-orange-100 text-orange-800' },
    Completed: { label: 'Hoàn tất', className: 'bg-green-100 text-green-800' },
    Cancelled: { label: 'Đã hủy', className: 'bg-gray-100 text-gray-600' },
  }
  const style = map[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  )
}

export default function BusinessDashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [fleet, setFleet] = useState(null)
  const [recentBookings, setRecentBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetchBusinessDashboard().catch(() => null),
      fetchBusinessBookings().catch(() => []),
    ])
      .then(([dash, bkgs]) => {
        setDashboard(dash)
        setFleet(null)
        setRecentBookings(Array.isArray(bkgs) ? bkgs.slice(0, 5) : [])
      })
      .catch(() => setError('Không thể tải dữ liệu dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
    )
  }

  const d = dashboard || {}
  const f = fleet || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon="local_shipping"
          label="Tổng số xe"
          value={d.totalVehicles ?? f.totalVehicles ?? 0}
          sub="Trong danh sách xe"
        />
        <KpiCard
          icon="check_circle"
          label="Xe đang hoạt động"
          value={d.activeVehicles ?? f.activeVehicles ?? 0}
          sub="Đã được duyệt"
          color="text-green-600"
          bg="bg-green-50"
        />
        <KpiCard
          icon="pending"
          label="Xe chờ duyệt"
          value={d.pendingVehicles ?? 0}
          sub="Cần Staff duyệt"
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <KpiCard
          icon="today"
          label="Lần rửa hôm nay"
          value={d.todayWashCount ?? d.todayWashes ?? 0}
          sub={new Date().toLocaleDateString('vi-VN')}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <KpiCard
          icon="date_range"
          label="Lần rửa tháng này"
          value={d.monthlyWashCount ?? d.monthWashes ?? 0}
          sub={`Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`}
          color="text-purple-600"
          bg="bg-purple-50"
        />
        <KpiCard
          icon="payments"
          label="Chi tiêu tháng"
          value={formatVnd(d.monthlySpend ?? d.monthCost ?? 0)}
          sub="Tổng chi phí tháng"
          color="text-red-600"
          bg="bg-red-50"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <h3 className="font-sora text-base font-semibold text-on-surface">Đặt lịch gần đây</h3>
            <Link to="/business/bookings" className="text-xs text-primary font-medium hover:underline">
              Xem tất cả
            </Link>
          </div>
          {recentBookings.length === 0 ? (
            <div className="p-8 text-center text-sm text-on-surface-variant">
              Chưa có đặt lịch nào.
            </div>
          ) : (
            <div className="divide-y divide-outline-variant">
              {recentBookings.map((booking) => (
                <div key={booking.bookingId || booking.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface">
                      {booking.licensePlate || booking.fleetVehicle?.licensePlate || 'N/A'}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {formatDateTime(booking.scheduledTime || booking.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <h3 className="font-sora text-base font-semibold text-on-surface">Thao tác nhanh</h3>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            <Link
              to="/business/bookings/new"
              className="flex flex-col items-center gap-2 p-4 bg-primary/5 rounded-xl border border-primary/20 hover:bg-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-3xl">add_circle</span>
              <span className="text-xs font-medium text-primary text-center">Đặt lịch mới</span>
            </Link>
            <Link
              to="/business/vehicles/import"
              className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <span className="material-symbols-outlined text-blue-600 text-3xl">upload_file</span>
              <span className="text-xs font-medium text-blue-600 text-center">Nhập danh sách xe</span>
            </Link>
            <Link
              to="/business/invoices"
              className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-xl border border-green-200 hover:bg-green-100 transition-colors"
            >
              <span className="material-symbols-outlined text-green-600 text-3xl">receipt_long</span>
              <span className="text-xs font-medium text-green-600 text-center">Xem hóa đơn</span>
            </Link>
            <Link
              to="/business/credit"
              className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-xl border border-purple-200 hover:bg-purple-100 transition-colors"
            >
              <span className="material-symbols-outlined text-purple-600 text-3xl">credit_score</span>
              <span className="text-xs font-medium text-purple-600 text-center">Hạn mức tín dụng</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
