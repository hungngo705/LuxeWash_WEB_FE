import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBusinessBookings, cancelBooking } from '../../api/business.api'
import { WashDurationBadge } from '../../components/shared/WashTelemetry'
import { formatDateTime } from '../../utils/format'

function StatusBadge({ status }) {
  const map = {
    Pending: { label: 'Đã đặt lịch', className: 'bg-blue-100 text-blue-800' },
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

export default function BusinessBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('All')
  const [cancellingId, setCancellingId] = useState(null)

  useEffect(() => {
    fetchBusinessBookings()
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setError('Không thể tải danh sách đặt lịch.'))
      .finally(() => setLoading(false))
  }, [])

  const handleCancel = async (id) => {
    if (!window.confirm('Bạn có chắc muốn hủy đặt lịch này?')) return
    setCancellingId(id)
    try {
      await cancelBooking(id)
      setBookings((prev) =>
        prev.map((b) => (b.bookingId === id || b.id === id ? { ...b, status: 'Cancelled' } : b))
      )
    } catch (err) {
      setError(err.message || 'Hủy đặt lịch thất bại.')
    } finally {
      setCancellingId(null)
    }
  }

  // Completed washes belong to the wash-history screen. Keeping them here would
  // mix finished services with actionable bookings and may expose stale actions.
  const activeBookings = bookings.filter((booking) => booking.status !== 'Completed')
  const filteredBookings = filter === 'All'
    ? activeBookings
    : activeBookings.filter((b) => b.status === filter)

  const filterOptions = [
    { value: 'All', label: 'Tất cả' },
    { value: 'Pending', label: 'Đã đặt lịch' },
    { value: 'CheckedIn', label: 'Đã check-in' },
    { value: 'Processing', label: 'Đang rửa' },
    { value: 'Cancelled', label: 'Đã hủy' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sora text-lg font-semibold text-on-surface">Đặt lịch</h2>
          <p className="text-sm text-on-surface-variant">{filteredBookings.length} đặt lịch</p>
        </div>
        <Link
          to="/business/bookings/new"
          className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Đặt lịch mới
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-2 flex-wrap">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === opt.value
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Biển số</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Thời gian</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Chi nhánh</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-on-surface-variant">
                    Không có đặt lịch nào.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.bookingId || booking.id} className="hover:bg-surface-container transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-primary">
                      #{booking.bookingId || booking.id}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-on-surface">
                      {booking.licensePlate || booking.fleetVehicle?.licensePlate || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-on-surface">
                      <div>{formatDateTime(booking.scheduledTime || booking.createdAt)}</div>
                      <WashDurationBadge booking={booking} className="mt-2" />
                    </td>
                    <td className="px-4 py-3 text-sm text-on-surface">
                      {booking.branch?.name || booking.branchName || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {booking.status === 'Pending' && (
                          <Link
                            to={`/business/bookings/${booking.bookingId || booking.id}/reschedule`}
                            className="px-2 py-1 text-xs text-primary hover:underline"
                          >
                            Đổi lịch
                          </Link>
                        )}
                        <Link
                          to={`/business/bookings/${booking.bookingId || booking.id}`}
                          className="px-2 py-1 text-xs text-primary hover:underline"
                        >
                          Chi tiết
                        </Link>
                        {booking.status === 'Pending' && (
                          <button
                            onClick={() => handleCancel(booking.bookingId || booking.id)}
                            disabled={cancellingId === (booking.bookingId || booking.id)}
                            className="px-2 py-1 text-xs text-red-600 hover:underline disabled:opacity-50"
                          >
                            {cancellingId === (booking.bookingId || booking.id) ? 'Đang hủy...' : 'Hủy'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
