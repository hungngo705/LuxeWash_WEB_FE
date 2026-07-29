import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ApiError,
  fetchStaffLaneAssignment,
  fetchStaffTasks,
  formatPaymentMethodLabel,
  formatStaffStationLabel,
  updateStaffBookingStatus,
} from '../api'
import LaneAssignmentBadge from '../components/shared/LaneAssignmentBadge'
import { WashDurationBadge } from '../components/shared/WashTelemetry'
import TierBadge from '../components/shared/TierBadge'
import { publishLaneDisplayEvent } from '../services/laneDisplayChannel'
import { canStartWash, getLaneDisplayName, hasAssignedLane } from '../utils/laneAssignment'

function publishAssignedLane(booking) {
  if (!booking?.licensePlate || !hasAssignedLane(booking)) return
  publishLaneDisplayEvent({
    type: 'assigned',
    plate: booking.licensePlate,
    bookingId: booking.bookingId,
    laneId: booking.processingLaneId,
    laneName: getLaneDisplayName(booking, ''),
  })
}

function PaymentStatusBadge({ status }) {
  const raw = String(status ?? '').trim()
  const normalized =
    raw === '—' || raw === '' ? 'Chưa thanh toán' : raw
  const map = {
    'Đã thanh toán': { label: 'Đã thanh toán', className: 'bg-primary/15 text-primary' },
    Paid: { label: 'Đã thanh toán', className: 'bg-primary/15 text-primary' },
    Success: { label: 'Đã thanh toán', className: 'bg-primary/15 text-primary' },
    'Chưa thanh toán': { label: 'Chưa thanh toán', className: 'bg-tertiary-container/15 text-tertiary-container' },
    Pending: { label: 'Chưa thanh toán', className: 'bg-tertiary-container/15 text-tertiary-container' },
    Unpaid: { label: 'Chưa thanh toán', className: 'bg-tertiary-container/15 text-tertiary-container' },
    Failed: { label: 'Thất bại', className: 'bg-error-container/30 text-error' },
    Refunded: { label: 'Đã hoàn tiền', className: 'bg-surface-variant text-on-surface-variant' },
  }
  const style = map[normalized] ?? {
    label: normalized,
    className: 'bg-surface-variant text-on-surface-variant',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${style.className}`}
    >
      <span className="material-symbols-outlined text-[12px]">payments</span>
      {style.label}
    </span>
  )
}

function getBookingStatusLabel(status) {
  const labels = {
    Pending: 'Chờ check-in',
    'Checked-in': 'Đã check-in',
    Processing: 'Đang rửa',
    Completed: 'Hoàn thành',
    Cancelled: 'Đã hủy',
    'No-show': 'Vắng mặt',
  }
  return labels[status] ?? status
}

export default function StaffQueuePage() {
  const [allBookings, setAllBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [laneLabel, setLaneLabel] = useState('')
  const [tab, setTab] = useState('waiting')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  const laneSnapshotRef = useRef(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    fetchStaffLaneAssignment()
      .then((a) => setLaneLabel(formatStaffStationLabel(a)))
      .catch(() => setLaneLabel('Chưa phân công làn'))
  }, [])

  const loadBookings = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    if (!silent) setFetchError('')
    try {
      const data = await fetchStaffTasks()
      const list = Array.isArray(data) ? data : []
      const nextSnapshot = new Map(
        list.map((booking) => [
          Number(booking.bookingId),
          `${booking.processingLaneId ?? ''}|${booking.processingLaneName ?? ''}`,
        ]),
      )
      if (laneSnapshotRef.current) {
        for (const booking of list) {
          const id = Number(booking.bookingId)
          if (laneSnapshotRef.current.get(id) !== nextSnapshot.get(id)) {
            publishAssignedLane(booking)
          }
        }
      }
      laneSnapshotRef.current = nextSnapshot
      setAllBookings(list)
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.isForbidden
            ? 'Không có quyền xem hàng đợi. Liên hệ quản trị viên.'
            : err.message
          : 'Không thể tải dữ liệu. Vui lòng thử lại.'
      if (!silent) setFetchError(msg)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async queue load with polling cleanup
    loadBookings()
    const interval = setInterval(() => loadBookings({ silent: true }), 10_000)
    return () => clearInterval(interval)
  }, [loadBookings])

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allBookings.filter((b) => {
      const matchSearch =
        !q ||
        b.licensePlate.toLowerCase().includes(q) ||
        b.customerName?.toLowerCase().includes(q) ||
        b.serviceName.toLowerCase().includes(q)
      return matchSearch
    })
  }, [allBookings, search])

  const waitingBookings = useMemo(
    () => filteredBookings.filter((b) => b.status === 'Checked-in'),
    [filteredBookings],
  )

  const processingBookings = useMemo(
    () => filteredBookings.filter((b) => b.status === 'Processing'),
    [filteredBookings],
  )

  const stats = useMemo(() => {
    const waiting = allBookings.filter(
      (b) => b.status === 'Checked-in' && !hasAssignedLane(b),
    ).length
    const ready = allBookings.filter(
      (b) => b.status === 'Checked-in' && hasAssignedLane(b),
    ).length
    const processing = allBookings.filter((b) => b.status === 'Processing').length
    return { waiting, ready, processing }
  }, [allBookings])

  const handleStartProcessing = useCallback(
    async (bookingId) => {
      const booking = allBookings.find(
        (item) => Number(item.bookingId) === Number(bookingId),
      )
      if (!canStartWash(booking)) {
        showToast(
          !hasAssignedLane(booking)
            ? 'Xe đang chờ được phân làn.'
            : 'Booking chưa hoàn tất thanh toán.',
          'error',
        )
        return
      }
      try {
        await updateStaffBookingStatus(bookingId, 'Processing')
        showToast(`Xe #${bookingId} bắt đầu rửa.`)
        await loadBookings({ silent: true })
      } catch (err) {
        showToast(
          err instanceof ApiError ? err.message : 'Lỗi khi bắt đầu rửa. Vui lòng thử lại.',
          'error',
        )
      }
    },
    [allBookings, loadBookings],
  )

  const handleComplete = useCallback(async (bookingId) => {
    try {
      await updateStaffBookingStatus(bookingId, 'Completed')
      showToast(`Xe #${bookingId} đã hoàn thành.`)
      await loadBookings({ silent: true })
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : 'Lỗi khi hoàn thành. Vui lòng thử lại.',
        'error',
      )
    }
  }, [loadBookings])

  const displayed = tab === 'waiting' ? waitingBookings : processingBookings

  return (
    <div className="w-full">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-3 shadow-xl ${
            toast.type === 'error'
              ? 'border-error-container/50 bg-error-container/20 text-error'
              : 'border-primary-container/50 bg-primary-container/20 text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-xl">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="mb-6">
        <h1 className="font-sora text-2xl font-semibold text-on-surface">Quản lý hàng đợi</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {laneLabel || 'Đang tải làn…'} — {tab === 'waiting' ? 'Xe đã tiếp nhận, chờ xử lý' : 'Xe đang rửa'}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Chờ làn', value: stats.waiting, icon: 'hourglass_top', tone: 'text-amber-700' },
          { label: 'Sẵn sàng vào làn', value: stats.ready, icon: 'garage', tone: 'text-primary' },
          { label: 'Đang rửa', value: stats.processing, icon: 'wash', tone: 'text-secondary' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
            <span className={`material-symbols-outlined ${item.tone}`}>{item.icon}</span>
            <div>
              <p className={`font-sora text-xl font-bold ${item.tone}`}>{item.value}</p>
              <p className="text-xs font-medium text-on-surface-variant">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex rounded-lg border border-outline-variant bg-surface-container-lowest p-1">
          <button
            onClick={() => setTab('waiting')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'waiting'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-base">hourglass_top</span>
            Chờ xử lý
            {stats.waiting + stats.ready > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-tertiary-container px-1.5 text-xs font-bold text-on-tertiary-container">
                {stats.waiting + stats.ready}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('processing')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'processing'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-base">autorenew</span>
            Đang rửa
            {stats.processing > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-container px-1.5 text-xs font-bold text-on-secondary-container">
                {stats.processing}
              </span>
            )}
          </button>
        </div>

        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant material-symbols-outlined text-base">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo biển số, tên khách, dịch vụ…"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {fetchError ? (
        <div className="mb-6 rounded-xl border border-error-container/40 bg-error-container/10 p-4">
          <p className="text-sm text-error">{fetchError}</p>
          <button
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
            onClick={loadBookings}
          >
            Thử lại
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
            <span className="text-sm text-on-surface-variant">Đang tải dữ liệu…</span>
          </div>
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-12 text-center">
          <span className="material-symbols-outlined mb-3 text-5xl text-outline">
            {tab === 'waiting' ? 'hourglass_top' : 'autorenew'}
          </span>
          <p className="font-sora text-lg font-semibold text-on-surface">
            {tab === 'waiting' ? 'Không có xe chờ xử lý' : 'Không có xe đang rửa'}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            {tab === 'waiting'
              ? 'Chưa có xe nào đã check-in đang chờ làn hoặc chờ bắt đầu rửa.'
              : 'Chưa có xe nào đang rửa trong chi nhánh.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">Biển số</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Dịch vụ</th>
                <th className="px-4 py-3">Giờ hẹn</th>
                <th className="px-4 py-3">Phân làn</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thanh toán</th>
                {tab === 'processing' && <th className="px-4 py-3">Thời gian rửa</th>}
                {tab === 'processing' && <th className="px-4 py-3">Giá tiền</th>}
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {displayed.map((booking) => (
                <tr key={booking.bookingId} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="font-mono text-base font-bold text-primary">
                        {booking.licensePlate}
                      </span>
                      <TierBadge
                        tierName={booking.rankName}
                        tierPoints={booking.customerTierPoints}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-on-surface">{booking.customerName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-on-surface">{booking.serviceName}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">
                    {booking.slotLabel || booking.scheduledTime
                      ? booking.slotLabel ||
                        (booking.scheduledTime
                          ? new Date(booking.scheduledTime).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <LaneAssignmentBadge booking={booking} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${
                        booking.status === 'Pending'
                          ? 'border-tertiary-container/40 bg-tertiary-container/15 text-tertiary-container'
                          : booking.status === 'Checked-in'
                            ? 'border-primary-container/40 bg-primary-container/15 text-primary-container'
                            : 'border-secondary-container/40 bg-secondary-container/15 text-secondary-container'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {getBookingStatusLabel(booking.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={booking.paymentStatus} />
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {formatPaymentMethodLabel(booking.paymentMethod)}
                    </p>
                  </td>
                  {tab === 'processing' && (
                    <td className="px-4 py-3">
                      <WashDurationBadge booking={booking} />
                    </td>
                  )}
                  {tab === 'processing' && (
                    <td className="px-4 py-3 font-semibold text-on-surface">
                      {booking.finalAmount
                        ? booking.finalAmount.toLocaleString('vi-VN') + ' đ'
                        : '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {tab === 'waiting' ? (
                        <button
                          onClick={() => handleStartProcessing(booking.bookingId)}
                          disabled={!canStartWash(booking)}
                          title={
                            !hasAssignedLane(booking)
                              ? 'Xe đang chờ được phân làn'
                              : 'Booking chưa hoàn tất thanh toán'
                          }
                          className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-on-secondary transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <span className="material-symbols-outlined text-base">
                            {canStartWash(booking) ? 'autorenew' : 'lock'}
                          </span>
                          {canStartWash(booking) ? 'Bắt đầu rửa' : 'Chưa sẵn sàng'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleComplete(booking.bookingId)}
                          className="flex items-center gap-1 rounded-lg bg-tertiary px-3 py-1.5 text-sm font-medium text-on-tertiary transition-colors hover:bg-tertiary/90"
                        >
                          <span className="material-symbols-outlined text-base">check_circle</span>
                          Hoàn thành
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
    </div>
  )
}
