import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom'
import { fetchBookingDetail } from '../../api/business.api'
import { formatVnd, formatDateTime } from '../../utils/format'

const STATUS_STYLES = {
  Pending: { label: 'Đã đặt lịch', icon: 'event_available', className: 'bg-tertiary-container/30 text-tertiary border-tertiary/30' },
  CheckedIn: { label: 'Đã check-in', icon: 'login', className: 'bg-secondary-container/40 text-secondary border-secondary/30' },
  Processing: { label: 'Đang rửa', icon: 'local_car_wash', className: 'bg-primary-container/30 text-primary border-primary/30' },
  Completed: { label: 'Hoàn tất', icon: 'task_alt', className: 'bg-primary-container/30 text-primary border-primary/30' },
  Cancelled: { label: 'Đã hủy', icon: 'event_busy', className: 'bg-surface-variant text-on-surface-variant border-outline-variant' },
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? {
    label: status,
    icon: 'help',
    className: 'bg-surface-variant text-on-surface-variant border-outline-variant',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide uppercase ${style.className}`}>
      <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
      {style.label}
    </span>
  )
}

function PaymentBadge({ status }) {
  if (status === 'Paid') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-container/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        <span className="material-symbols-outlined text-[14px]">verified</span>
        Đã thanh toán
      </span>
    )
  }
  if (status === 'Refunded') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-variant px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        <span className="material-symbols-outlined text-[14px]">undo</span>
        Đã hoàn tiền
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-tertiary/30 bg-tertiary-container/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-tertiary">
      <span className="material-symbols-outlined text-[14px]">schedule</span>
      Chưa thanh toán
    </span>
  )
}

function GlassPanel({ children, className = '' }) {
  return (
    <div className={`glass-panel soft-shadow overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest ${className}`}>
      {children}
    </div>
  )
}

function InfoItem({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low/60 p-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-container/15 text-primary">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{label}</p>
        <div className="mt-0.5 text-sm text-on-surface">{children}</div>
      </div>
    </div>
  )
}

function Notice({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary-container/15 px-4 py-3 text-sm text-primary">
      <span className="material-symbols-outlined mt-0.5 text-[18px]">check_circle</span>
      <span className="font-medium">{message}</span>
    </div>
  )
}

function LoadingBlock({ label = 'Đang tải chi tiết đặt lịch...' }) {
  return (
    <GlassPanel className="flex items-center justify-center gap-3 px-6 py-14 text-sm font-medium text-on-surface-variant">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary" />
      {label}
    </GlassPanel>
  )
}

export default function BusinessBookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBookingDetail(id)
      .then((data) => setBooking(data || null))
      .catch(() => setError('Không thể tải chi tiết đặt lịch.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="h-4 w-32 rounded-full bg-surface-container" />
        <LoadingBlock />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <button
          onClick={() => navigate('/business/bookings')}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Quay lại danh sách
        </button>
        <div className="flex items-start gap-3 rounded-xl border border-error-container bg-error-container/25 px-4 py-3 text-sm text-error">
          <span className="material-symbols-outlined mt-0.5 text-[18px]">error</span>
          <span className="font-medium">{error || 'Không tìm thấy đặt lịch.'}</span>
        </div>
      </div>
    )
  }

  const total =
    booking.totalAmount ??
    booking.finalAmount ??
    booking.originalPrice ??
    (Array.isArray(booking.services)
      ? booking.services.reduce(
          (sum, s) => sum + (Number.isFinite(Number(s.price)) ? Number(s.price) : 0),
          0,
        )
      : 0)

  const licensePlate = booking.licensePlate || booking.fleetVehicle?.licensePlate
  const vehicleType = booking.vehicleType || booking.fleetVehicle?.vehicleType || booking.fleetVehicle?.vehicleTypeName
  const branchName = booking.branchName || booking.branch?.name
  const laneName = booking.laneName || (booking.laneId ? `Làn #${booking.laneId}` : null)
  const scheduledTime = booking.scheduledTime || booking.createdAt

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <Notice message={location.state?.successMessage} />

      <button
        onClick={() => navigate('/business/bookings')}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Quay lại danh sách
      </button>

      <GlassPanel>
        <div className="flex flex-col gap-4 border-b border-outline-variant bg-surface-container-low px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container/15 text-primary">
              <span className="material-symbols-outlined text-[24px]">event_note</span>
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Đặt lịch</p>
              <h2 className="font-sora text-2xl font-semibold text-on-surface">#{id}</h2>
              {licensePlate && (
                <p className="mt-1 text-sm font-medium text-on-surface-variant">
                  {licensePlate}
                  {vehicleType ? ` · ${vehicleType}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {booking.status === 'Pending' && (
              <Link
                to={`/business/bookings/${id}/reschedule`}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">event_repeat</span>
                Đổi lịch
              </Link>
            )}
            <StatusBadge status={booking.status} />
          </div>
        </div>

        <div className="space-y-5 p-6">
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Thông tin chung</p>
            <div className="grid gap-3 md:grid-cols-2">
              <InfoItem icon="directions_car" label="Biển số xe">
                <span className="font-medium">{licensePlate || '—'}</span>
              </InfoItem>
              <InfoItem icon="category" label="Loại xe">
                {vehicleType || '—'}
              </InfoItem>
              <InfoItem icon="store" label="Chi nhánh">
                {branchName || '—'}
              </InfoItem>
              <InfoItem icon="garage" label="Làn rửa">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{laneName || '—'}</span>
                  {booking.isBusinessLane && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-secondary/30 bg-secondary-container/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-on-secondary-container">
                      <span className="material-symbols-outlined text-[12px]">corporate_fare</span>
                      Doanh nghiệp
                    </span>
                  )}
                </div>
              </InfoItem>
              <InfoItem icon="calendar_month" label="Ngày đặt">
                {scheduledTime ? formatDateTime(scheduledTime) : '—'}
              </InfoItem>
              <InfoItem icon="payments" label="Thanh toán">
                <PaymentBadge status={booking.paymentStatus} />
              </InfoItem>
              {booking.startTime && (
                <InfoItem icon="schedule" label="Khung giờ">
                  {booking.startTime} — {booking.endTime}
                </InfoItem>
              )}
              {booking.estimatedStart && (
                <InfoItem icon="play_circle" label="Bắt đầu dự kiến">
                  {formatDateTime(booking.estimatedStart)}
                </InfoItem>
              )}
              {booking.estimatedEnd && (
                <InfoItem icon="flag" label="Kết thúc dự kiến">
                  {formatDateTime(booking.estimatedEnd)}
                </InfoItem>
              )}
            </div>
          </section>

          {(booking.oldScheduledTime || booking.newScheduledTime) && (
            <div className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-container/15 text-primary">
                <span className="material-symbols-outlined text-[18px]">event_repeat</span>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Lịch đổi gần nhất</p>
                <p className="mt-1 text-on-surface">
                  Từ:{' '}
                  <span className="text-on-surface-variant">
                    {booking.oldScheduledTime ? formatDateTime(booking.oldScheduledTime) : '—'}
                  </span>
                  {' → '}
                  Đến:{' '}
                  <span className="font-semibold text-on-surface">
                    {booking.newScheduledTime ? formatDateTime(booking.newScheduledTime) : '—'}
                  </span>
                </p>
              </div>
            </div>
          )}

          {Array.isArray(booking.services) && booking.services.length > 0 && (
            <section className="border-t border-outline-variant pt-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Dịch vụ đã chọn</p>
                <p className="text-xs text-on-surface-variant">{booking.services.length} dịch vụ</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-outline-variant">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-2.5">Dịch vụ</th>
                      <th className="px-4 py-2.5 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {booking.services.map((svc, idx) => (
                      <tr key={idx} className="transition-colors hover:bg-surface-container-low/60">
                        <td className="px-4 py-3 text-on-surface">{svc.name || '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-primary">
                          {svc.price != null && Number.isFinite(Number(svc.price)) ? formatVnd(svc.price) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-primary/20 bg-primary-container/10 px-4 py-3">
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container/20 text-primary">
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  </span>
                  <span className="text-sm font-semibold uppercase tracking-wide">Tổng cộng</span>
                </div>
                <span className="font-sora text-xl font-semibold text-primary">{formatVnd(total)}</span>
              </div>
            </section>
          )}
        </div>
      </GlassPanel>
    </div>
  )
}