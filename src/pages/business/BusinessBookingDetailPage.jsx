import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchBookingDetail } from '../../api/business.api'
import { formatVnd, formatDateTime } from '../../utils/format'

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
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  )
}

export default function BusinessBookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBookingDetail(id)
      .then(setBooking)
      .catch(() => setError('Không thể tải chi tiết đặt lịch.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-700">{error || 'Không tìm thấy đặt lịch.'}</p>
        <button onClick={() => navigate('/business/bookings')} className="text-sm text-primary hover:underline">
          ← Quay lại danh sách
        </button>
      </div>
    )
  }

  const total = Array.isArray(booking.services)
    ? booking.services.reduce((sum, s) => sum + (s.price || 0), 0)
    : booking.totalAmount || 0

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => navigate('/business/bookings')} className="text-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Quay lại danh sách
      </button>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <h2 className="font-sora text-lg font-semibold text-on-surface">
            Đặt lịch #{id}
          </h2>
          <StatusBadge status={booking.status} />
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Biển số xe</p>
              <p className="text-sm font-medium text-on-surface">
                {booking.licensePlate || booking.fleetVehicle?.licensePlate || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Loại xe</p>
              <p className="text-sm text-on-surface">
                {booking.vehicleType || booking.fleetVehicle?.vehicleType || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Chi nhánh</p>
              <p className="text-sm text-on-surface">
                {booking.branch?.name || booking.branchName || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Ngày đặt</p>
              <p className="text-sm text-on-surface">
                {formatDateTime(booking.scheduledTime || booking.createdAt)}
              </p>
            </div>
            {booking.startTime && (
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Khung giờ</p>
                <p className="text-sm text-on-surface">{booking.startTime} — {booking.endTime}</p>
              </div>
            )}
          </div>

          {Array.isArray(booking.services) && booking.services.length > 0 && (
            <div className="border-t border-outline-variant pt-4">
              <p className="text-xs text-on-surface-variant mb-2">Dịch vụ</p>
              <div className="space-y-2">
                {booking.services.map((svc, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-on-surface">{svc.name}</span>
                    <span className="font-medium text-primary">{formatVnd(svc.price)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-base font-semibold mt-3 pt-3 border-t border-outline-variant">
                <span className="text-on-surface">Tổng cộng</span>
                <span className="text-primary">{formatVnd(total)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
