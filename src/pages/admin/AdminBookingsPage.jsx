import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  fetchBookingsByDate,
  normalizeAdminBooking,
  toApiTargetDate,
  updateBookingStatus,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import { formatVnd } from '../../utils/format'

const STATUS_OPTIONS = ['All', 'Pending', 'Checked-in', 'Completed', 'Cancelled', 'No-show']

function todayDateValue() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [dateFilter, setDateFilter] = useState(todayDateValue)
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [detailBooking, setDetailBooking] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadBookings = useCallback(async () => {
    const targetDate = toApiTargetDate(dateFilter)
    if (!targetDate) return

    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchBookingsByDate(targetDate)
      const items = Array.isArray(data) ? data.map(normalizeAdminBooking) : []
      setBookings(items)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách booking')
    } finally {
      setLoading(false)
    }
  }, [dateFilter])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  const filtered = useMemo(() => {
    return bookings.filter((b) => statusFilter === 'All' || b.status === statusFilter)
  }, [bookings, statusFilter])

  const handleCancel = async () => {
    if (!cancelTarget || cancelling) return

    setCancelling(true)
    try {
      await updateBookingStatus(cancelTarget, 'Cancelled')
      setCancelTarget(null)
      showToast(
        cancelReason.trim()
          ? `Đã hủy booking #${cancelTarget}. Lý do: ${cancelReason.trim()}`
          : `Đã hủy booking #${cancelTarget}`,
      )
      setCancelReason('')
      setDetailBooking(null)
      await loadBookings()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không hủy được booking')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Lịch đặt toàn hệ thống"
        description="Xem và quản lý booking theo ngày trên toàn bộ trạm"
      />

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-on-surface-variant">Ngày:</span>
          <input
            type="date"
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                statusFilter === status
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
              }`}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'All' ? 'Tất cả' : status}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="rounded-lg border border-error/30 px-3 py-1.5 text-sm font-medium text-error hover:bg-error-container/20"
            onClick={loadBookings}
          >
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải booking…</p>
      ) : filtered.length === 0 && !loadError ? (
        <EmptyState icon="calendar_month" title="Không có booking" />
      ) : (
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">Booking ID</th>
                <th className="px-4 py-3">Biển số</th>
                <th className="px-4 py-3">Khách</th>
                <th className="px-4 py-3">Dịch vụ</th>
                <th className="px-4 py-3">Slot/Giờ</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Số tiền</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {filtered.map((booking) => (
                <tr key={booking.bookingId} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 font-medium text-on-surface">#{booking.bookingId}</td>
                  <td className="px-4 py-3 text-on-surface">{booking.licensePlate}</td>
                  <td className="px-4 py-3 text-on-surface">{booking.customerName}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{booking.serviceName}</td>
                  <td className="px-4 py-3">
                    <p className="text-on-surface">{booking.slotLabel}</p>
                    <p className="text-xs text-on-surface-variant">{booking.scheduledDate}</p>
                  </td>
                  <td className="px-4 py-3 text-on-surface">{booking.rankName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="px-4 py-3 text-on-surface">{formatVnd(booking.finalAmount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-primary hover:bg-primary-container/20"
                        onClick={() => setDetailBooking(booking)}
                      >
                        Chi tiết
                      </button>
                      {booking.status !== 'Cancelled' &&
                        booking.status !== 'Completed' &&
                        booking.status !== 'No-show' && (
                          <button
                            type="button"
                            className="rounded-lg px-2 py-1 text-error hover:bg-error-container/20"
                            onClick={() => setCancelTarget(booking.bookingId)}
                          >
                            Hủy
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormModal
        open={Boolean(detailBooking)}
        title={`Booking #${detailBooking?.bookingId ?? ''}`}
        submitLabel="Đóng"
        onClose={() => setDetailBooking(null)}
        onSubmit={() => setDetailBooking(null)}
      >
        {detailBooking && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-on-surface-variant">Trạng thái</p>
                <StatusBadge status={detailBooking.status} />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Ngày đặt</p>
                <p className="text-on-surface">{detailBooking.scheduledDate || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Khung giờ</p>
                <p className="text-on-surface">{detailBooking.slotLabel}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Tổng tiền</p>
                <p className="font-medium text-on-surface">{formatVnd(detailBooking.finalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">QR fallback</p>
                <p className="font-mono text-on-surface">{detailBooking.fallbackQrCode}</p>
              </div>
            </div>
            {detailBooking.details.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                  Chi tiết xe
                </p>
                <ul className="space-y-2">
                  {detailBooking.details.map((d) => (
                    <li
                      key={d.detailId}
                      className="rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-on-surface">{d.licensePlate}</p>
                      <p className="text-on-surface-variant">
                        {d.serviceName} · {d.vehicleCondition}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">Không có chi tiết xe trong response.</p>
            )}
          </div>
        )}
      </FormModal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Hủy booking"
        message={
          <div className="mt-3 space-y-1">
            <p className="text-sm text-on-surface-variant">
              Hủy booking #{cancelTarget}. Lý do (tùy chọn, chỉ hiển thị nội bộ):
            </p>
            <textarea
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm"
              rows={3}
              value={cancelReason}
              disabled={cancelling}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Lý do..."
            />
          </div>
        }
        confirmLabel={cancelling ? 'Đang xử lý…' : 'Hủy booking'}
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => {
          if (!cancelling) {
            setCancelTarget(null)
            setCancelReason('')
          }
        }}
      />
    </div>
  )
}
