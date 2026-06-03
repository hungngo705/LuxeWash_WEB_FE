import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  fetchBookingsByDate,
  fetchBookingsByLicensePlate,
  fetchTimeSlots,
  fetchVehicleTypes,
  forceCancelBookings,
  markBookingNoShow,
  normalizeAdminBooking,
  reportBookingMismatch,
  toApiTargetDate,
  updateBookingStatus,
  updateBookingStatusByLicensePlate,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import { formatVnd } from '../../utils/format'

const STATUS_OPTIONS = ['All', 'Pending', 'Checked-in', 'Completed', 'Cancelled', 'No-show']

const VEHICLE_CONDITIONS = [
  { value: 1, label: 'Sạch (Clean)' },
  { value: 2, label: 'Bẩn (Dirty)' },
  { value: 3, label: 'Rất bẩn (Very dirty)' },
]

function todayDateValue() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function formatSlotOption(slot) {
  const start = slot.startTime ? String(slot.startTime).slice(0, 5) : ''
  const end = slot.endTime ? String(slot.endTime).slice(0, 5) : ''
  return `${start} – ${end}`
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [vehicleTypes, setVehicleTypes] = useState([])
  const [dateFilter, setDateFilter] = useState(todayDateValue)
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [detailBooking, setDetailBooking] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [forceCancelOpen, setForceCancelOpen] = useState(false)
  const [forceCancelForm, setForceCancelForm] = useState({
    timeSlotId: '',
    reason: '',
  })
  const [forceCancelling, setForceCancelling] = useState(false)
  const [mismatchForm, setMismatchForm] = useState({
    detailId: null,
    condition: 2,
    actualTypeId: '',
  })
  const [toast, setToast] = useState('')
  const [plateQuery, setPlateQuery] = useState('')
  const [plateResults, setPlateResults] = useState([])
  const [plateLoading, setPlateLoading] = useState(false)
  const [plateStatus, setPlateStatus] = useState('Checked-in')
  const [plateActionLoading, setPlateActionLoading] = useState(false)

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

  useEffect(() => {
    Promise.all([fetchTimeSlots(), fetchVehicleTypes()])
      .then(([slots, types]) => {
        setTimeSlots(Array.isArray(slots) ? slots : [])
        setVehicleTypes(Array.isArray(types) ? types : [])
      })
      .catch(() => {
        // Non-blocking — force-cancel / mismatch still work with manual ids if needed
      })
  }, [])

  const filtered = useMemo(() => {
    return bookings.filter((b) => statusFilter === 'All' || b.status === statusFilter)
  }, [bookings, statusFilter])

  const runBookingAction = async (fn, successMessage) => {
    setActionLoading(true)
    try {
      await fn()
      showToast(successMessage)
      setDetailBooking(null)
      await loadBookings()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không thực hiện được thao tác')
    } finally {
      setActionLoading(false)
    }
  }

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

  const handleForceCancel = async () => {
    if (!forceCancelForm.reason.trim() || forceCancelling) return

    const timeSlotId = Number(forceCancelForm.timeSlotId)
    if (!timeSlotId) {
      showToast('Chọn khung giờ cần hủy hàng loạt')
      return
    }

    setForceCancelling(true)
    try {
      await forceCancelBookings({
        timeSlotId,
        affectedDate: toApiTargetDate(dateFilter),
        reason: forceCancelForm.reason.trim(),
      })
      setForceCancelOpen(false)
      setForceCancelForm({ timeSlotId: '', reason: '' })
      showToast('Đã hủy hàng loạt booking trong khung giờ')
      await loadBookings()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không force-cancel được')
    } finally {
      setForceCancelling(false)
    }
  }

  const handleReportMismatch = async () => {
    if (!mismatchForm.detailId || actionLoading) return

    await runBookingAction(
      () =>
        reportBookingMismatch(mismatchForm.detailId, {
          condition: Number(mismatchForm.condition),
          actualTypeId: mismatchForm.actualTypeId
            ? Number(mismatchForm.actualTypeId)
            : undefined,
        }),
      'Đã báo sai loại/tình trạng xe',
    )
    setMismatchForm({ detailId: null, condition: 2, actualTypeId: '' })
  }

  const canChangeStatus = (status) =>
    status !== 'Cancelled' && status !== 'Completed' && status !== 'No-show'

  const searchByPlate = async () => {
    const plate = plateQuery.trim()
    if (!plate) return

    setPlateLoading(true)
    setPlateResults([])
    try {
      const data = await fetchBookingsByLicensePlate(plate)
      const items = Array.isArray(data) ? data.map(normalizeAdminBooking) : []
      setPlateResults(items)
      if (!items.length) showToast('Không tìm thấy booking cho biển số này')
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không tra cứu được theo biển số')
    } finally {
      setPlateLoading(false)
    }
  }

  const applyPlateStatus = async () => {
    const plate = plateQuery.trim()
    if (!plate || plateActionLoading) return

    setPlateActionLoading(true)
    try {
      await updateBookingStatusByLicensePlate(plate, plateStatus)
      showToast('Đã cập nhật trạng thái theo biển số')
      await searchByPlate()
      await loadBookings()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không đổi trạng thái được')
    } finally {
      setPlateActionLoading(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Lịch đặt toàn hệ thống"
        description="Xem và quản lý booking theo ngày — đổi trạng thái, no-show, force-cancel"
        actionLabel="Hủy hàng loạt (slot)"
        onAction={() => setForceCancelOpen(true)}
      />

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      <div className="glass-panel soft-shadow mb-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <h2 className="mb-3 text-sm font-semibold text-on-surface">Tra cứu theo biển số</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
            <span className="text-on-surface-variant">Biển số</span>
            <input
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 uppercase"
              value={plateQuery}
              onChange={(e) => setPlateQuery(e.target.value)}
              placeholder="51F-123.45"
            />
          </label>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-60"
            disabled={plateLoading || !plateQuery.trim()}
            onClick={searchByPlate}
          >
            {plateLoading ? 'Đang tìm…' : 'Tra cứu'}
          </button>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-on-surface-variant">Đổi trạng thái (booking gần nhất hôm nay)</span>
            <select
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={plateStatus}
              disabled={plateActionLoading}
              onChange={(e) => setPlateStatus(e.target.value)}
            >
              {STATUS_OPTIONS.filter((s) => s !== 'All').map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-60"
            disabled={plateActionLoading || !plateQuery.trim()}
            onClick={applyPlateStatus}
          >
            {plateActionLoading ? 'Đang xử lý…' : 'Áp dụng'}
          </button>
        </div>
        {plateResults.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-outline-variant/60 pt-4 text-sm">
            {plateResults.map((b) => (
              <li key={b.bookingId} className="flex flex-wrap items-center gap-2 text-on-surface">
                <span className="font-medium">#{b.bookingId}</span>
                <StatusBadge status={b.status} />
                <span className="text-on-surface-variant">{b.serviceName}</span>
                <span className="text-on-surface-variant">{b.slotLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

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
                      {canChangeStatus(booking.status) && (
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
        onClose={() => !actionLoading && setDetailBooking(null)}
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
              <div className="col-span-2">
                <p className="text-xs text-on-surface-variant">QR fallback</p>
                <p className="font-mono text-on-surface">{detailBooking.fallbackQrCode}</p>
              </div>
            </div>

            {canChangeStatus(detailBooking.status) && (
              <div className="flex flex-wrap gap-2 border-t border-outline-variant/60 pt-4">
                {detailBooking.status === 'Pending' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-on-primary disabled:opacity-50"
                    onClick={() =>
                      runBookingAction(
                        () => updateBookingStatus(detailBooking.bookingId, 'Checked-in'),
                        'Đã check-in',
                      )
                    }
                  >
                    Check-in
                  </button>
                )}
                {detailBooking.status === 'Checked-in' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-on-primary disabled:opacity-50"
                    onClick={() =>
                      runBookingAction(
                        () => updateBookingStatus(detailBooking.bookingId, 'Completed'),
                        'Đã hoàn thành',
                      )
                    }
                  >
                    Hoàn thành
                  </button>
                )}
                <button
                  type="button"
                  disabled={actionLoading}
                  className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-on-surface hover:bg-surface-variant disabled:opacity-50"
                  onClick={() =>
                    runBookingAction(
                      () => markBookingNoShow(detailBooking.bookingId),
                      'Đã đánh dấu no-show',
                    )
                  }
                >
                  No-show
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  className="rounded-lg border border-error/30 px-3 py-1.5 text-sm font-medium text-error hover:bg-error-container/20 disabled:opacity-50"
                  onClick={() => {
                    setDetailBooking(null)
                    setCancelTarget(detailBooking.bookingId)
                  }}
                >
                  Hủy booking
                </button>
              </div>
            )}

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
                      {canChangeStatus(detailBooking.status) && (
                        <button
                          type="button"
                          className="mt-2 text-xs text-primary hover:underline"
                          onClick={() =>
                            setMismatchForm({
                              detailId: d.detailId,
                              condition: 2,
                              actualTypeId: vehicleTypes[0]?.id ?? '',
                            })
                          }
                        >
                          Báo sai loại/tình trạng
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">Không có chi tiết xe trong response.</p>
            )}

            {mismatchForm.detailId != null && (
              <div className="rounded-lg border border-tertiary/30 bg-tertiary-container/10 p-3">
                <p className="mb-2 text-xs font-semibold text-on-surface-variant uppercase">
                  Report mismatch — detail #{mismatchForm.detailId}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block space-y-1 text-sm">
                    <span className="text-on-surface-variant">Tình trạng xe</span>
                    <select
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-2"
                      value={mismatchForm.condition}
                      onChange={(e) =>
                        setMismatchForm((f) => ({ ...f, condition: Number(e.target.value) }))
                      }
                    >
                      {VEHICLE_CONDITIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="text-on-surface-variant">Loại xe thực tế</span>
                    <select
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-2"
                      value={mismatchForm.actualTypeId}
                      onChange={(e) =>
                        setMismatchForm((f) => ({ ...f, actualTypeId: e.target.value }))
                      }
                    >
                      {vehicleTypes.map((vt) => (
                        <option key={vt.id} value={vt.id}>
                          {vt.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-on-primary disabled:opacity-50"
                    onClick={handleReportMismatch}
                  >
                    Gửi báo cáo
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-sm text-on-surface-variant hover:underline"
                    onClick={() =>
                      setMismatchForm({ detailId: null, condition: 2, actualTypeId: '' })
                    }
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </FormModal>

      <FormModal
        open={forceCancelOpen}
        title="Hủy hàng loạt theo khung giờ"
        submitLabel={forceCancelling ? 'Đang xử lý…' : 'Xác nhận hủy'}
        onClose={() => !forceCancelling && setForceCancelOpen(false)}
        onSubmit={handleForceCancel}
      >
        <div className="space-y-4 text-sm">
          <p className="text-on-surface-variant">
            Hủy mọi booking trong khung giờ đã chọn cho ngày{' '}
            <strong className="text-on-surface">{dateFilter}</strong>.
          </p>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">
              Khung giờ
            </span>
            <select
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={forceCancelForm.timeSlotId}
              disabled={forceCancelling}
              onChange={(e) =>
                setForceCancelForm((f) => ({ ...f, timeSlotId: e.target.value }))
              }
            >
              <option value="">— Chọn slot —</option>
              {timeSlots.map((slot) => (
                <option key={slot.slotId} value={slot.slotId}>
                  {formatSlotOption(slot)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">
              Lý do (bắt buộc)
            </span>
            <textarea
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              rows={3}
              value={forceCancelForm.reason}
              disabled={forceCancelling}
              onChange={(e) => setForceCancelForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="VD: Bảo trì buồng rửa"
            />
          </label>
        </div>
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
