import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  fetchBookingsByDate,
  fetchVehicleTypes,
  markBookingNoShow,
  normalizeAdminBooking,
  normalizePlateQuery,
  reportBookingMismatch,
  searchBookingsByLicensePlate,
  toApiTargetDate,
  updateBookingStatus,
  updateBookingStatusByLicensePlate,
} from '../api'
import StatusBadge from '../components/admin/shared/StatusBadge'
import WashTelemetry, { WashDurationBadge } from '../components/shared/WashTelemetry'
import { formatVnd } from '../utils/format'

const STATUS_OPTIONS = ['All', 'Pending', 'Checked-in', 'Processing', 'Completed', 'Cancelled', 'No-show']
const UPDATE_STATUS_OPTIONS = ['Pending', 'Checked-in', 'Completed', 'Cancelled', 'No-show']

const STATUS_LABELS = {
  All: 'Tất cả',
  Pending: 'Chờ check-in',
  'Checked-in': 'Đã check-in',
  Processing: 'Đang rửa',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
  'No-show': 'Vắng mặt',
}

const VEHICLE_CONDITIONS = [
  { value: 1, label: 'Sạch' },
  { value: 2, label: 'Bẩn' },
  { value: 3, label: 'Rất bẩn' },
]

function todayDateValue() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function getBookingSummary(booking) {
  return [
    booking.bookingId,
    booking.licensePlate,
    booking.customerName,
    booking.serviceName,
    booking.processingLaneName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function DetailList({ booking, onReportMismatch }) {
  if (!booking?.details?.length) {
    return (
      <p className="rounded-lg border border-dashed border-outline-variant px-3 py-4 text-sm text-on-surface-variant">
        Booking này chưa có chi tiết xe trong phản hồi API.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {booking.details.map((detail) => (
        <div
          key={detail.detailId}
          className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-on-surface">{detail.licensePlate}</p>
              <p className="mt-0.5 text-sm text-on-surface-variant">{detail.serviceName}</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Tình trạng ghi nhận: {detail.vehicleCondition}
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-variant"
              onClick={() => onReportMismatch(detail)}
            >
              Báo sai
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function StaffBookingsPage() {
  const [dateFilter, setDateFilter] = useState(todayDateValue)
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState('')
  const [statusDrafts, setStatusDrafts] = useState({})
  const [actionKey, setActionKey] = useState('')
  const [selectedBookingId, setSelectedBookingId] = useState(null)
  const [vehicleTypes, setVehicleTypes] = useState([])

  const [plateQuery, setPlateQuery] = useState('')
  const [plateStatus, setPlateStatus] = useState('Checked-in')
  const [plateResults, setPlateResults] = useState([])
  const [plateLoading, setPlateLoading] = useState(false)

  const [mismatchForm, setMismatchForm] = useState({
    detailId: null,
    condition: 2,
    actualTypeId: '',
  })

  const showToast = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
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
      setStatusDrafts(
        Object.fromEntries(items.map((booking) => [booking.bookingId, booking.status])),
      )
      if (items.length && selectedBookingId == null) {
        setSelectedBookingId(items[0].bookingId)
      }
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách booking')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [dateFilter, selectedBookingId])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  useEffect(() => {
    fetchVehicleTypes()
      .then((types) => setVehicleTypes(Array.isArray(types) ? types : []))
      .catch(() => setVehicleTypes([]))
  }, [])

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.bookingId === selectedBookingId) ?? bookings[0] ?? null,
    [bookings, selectedBookingId],
  )

  const visibleBookings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return bookings.filter((booking) => {
      const matchesStatus = statusFilter === 'All' || booking.status === statusFilter
      const matchesQuery = !query || getBookingSummary(booking).includes(query)
      return matchesStatus && matchesQuery
    })
  }, [bookings, searchTerm, statusFilter])

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      pending: bookings.filter((booking) => booking.status === 'Pending').length,
      active: bookings.filter((booking) => booking.status === 'Checked-in').length,
      done: bookings.filter((booking) => booking.status === 'Completed').length,
    }
  }, [bookings])

  const runAction = async (key, action, successMessage) => {
    if (actionKey) return
    setActionKey(key)
    try {
      await action()
      showToast(successMessage)
      await loadBookings()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không thực hiện được thao tác')
    } finally {
      setActionKey('')
    }
  }

  const handleStatusUpdate = (booking) => {
    const nextStatus = statusDrafts[booking.bookingId] ?? booking.status
    if (nextStatus === booking.status) {
      showToast('Trạng thái chưa thay đổi')
      return
    }

    runAction(
      `status-${booking.bookingId}`,
      () => updateBookingStatus(booking.bookingId, nextStatus),
      `Đã cập nhật booking #${booking.bookingId}`,
    )
  }

  const handleNoShow = (booking) => {
    runAction(
      `noshow-${booking.bookingId}`,
      () => markBookingNoShow(booking.bookingId),
      `Đã đánh dấu no-show cho booking #${booking.bookingId}`,
    )
  }

  const handlePlateSearch = async () => {
    const plate = normalizePlateQuery(plateQuery)
    if (!plate) {
      showToast('Nhập biển số cần tra cứu')
      return
    }

    setPlateLoading(true)
    try {
      const results = await searchBookingsByLicensePlate(plate)
      setPlateResults(results.map(normalizeAdminBooking))
      if (!results.length) showToast('Không tìm thấy booking cho biển số này')
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không tra cứu được biển số')
      setPlateResults([])
    } finally {
      setPlateLoading(false)
    }
  }

  const handlePlateStatusUpdate = async () => {
    const plate = normalizePlateQuery(plateQuery)
    if (!plate) {
      showToast('Nhập biển số cần cập nhật')
      return
    }

    await runAction(
      'plate-status',
      () => updateBookingStatusByLicensePlate(plate, plateStatus),
      `Đã cập nhật trạng thái cho ${plate}`,
    )
    await handlePlateSearch()
  }

  const handleReportMismatch = async () => {
    if (!mismatchForm.detailId) {
      showToast('Chọn chi tiết xe cần báo sai')
      return
    }

    await runAction(
      `mismatch-${mismatchForm.detailId}`,
      () =>
        reportBookingMismatch(mismatchForm.detailId, {
          condition: Number(mismatchForm.condition),
          actualTypeId: mismatchForm.actualTypeId ? Number(mismatchForm.actualTypeId) : undefined,
        }),
      `Đã gửi báo cáo mismatch cho detail #${mismatchForm.detailId}`,
    )
    setMismatchForm({ detailId: null, condition: 2, actualTypeId: '' })
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-6 z-50 rounded-lg bg-inverse-surface px-4 py-2 text-sm font-medium text-inverse-on-surface shadow-lg">
          {toast}
        </div>
      )}

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wider text-primary uppercase">
              Staff booking operations
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-on-surface">Booking theo ngày</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Xem booking, check-in, hoàn tất, no-show và báo sai thông tin xe.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[560px]">
            <label className="space-y-1 text-sm">
              <span className="text-on-surface-variant">Ngày</span>
              <input
                type="date"
                className="h-11 w-full rounded-lg border border-outline-variant bg-surface px-3 text-on-surface outline-none focus:border-primary"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-on-surface-variant">Trạng thái</span>
              <select
                className="h-11 w-full rounded-lg border border-outline-variant bg-surface px-3 text-on-surface outline-none focus:border-primary"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status] ?? status}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-on-surface-variant">Tìm nhanh</span>
              <input
                className="h-11 w-full rounded-lg border border-outline-variant bg-surface px-3 text-on-surface outline-none focus:border-primary"
                placeholder="Biển số, khách, dịch vụ"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            ['Tổng booking', stats.total],
            ['Đang chờ', stats.pending],
            ['Đang xử lý', stats.active],
            ['Hoàn tất', stats.done],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-surface-container px-4 py-3">
              <p className="text-xs font-semibold tracking-wide text-on-surface-variant uppercase">
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-on-surface">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
            <div>
              <h3 className="font-semibold text-on-surface">Danh sách booking</h3>
              <p className="text-sm text-on-surface-variant">
                {visibleBookings.length} booking hiển thị
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium text-on-surface hover:bg-surface-variant disabled:opacity-60"
              disabled={loading}
              onClick={loadBookings}
            >
              Làm mới
            </button>
          </div>

          {loadError ? (
            <div className="m-5 rounded-lg border border-error/30 bg-error-container/20 p-4 text-sm text-error">
              {loadError}
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-sm text-on-surface-variant">Đang tải booking...</div>
          ) : visibleBookings.length === 0 ? (
            <div className="p-8 text-center text-sm text-on-surface-variant">
              Không có booking phù hợp bộ lọc hiện tại.
            </div>
          ) : (
            <div className="divide-y divide-outline-variant">
              {visibleBookings.map((booking) => (
                <article
                  key={booking.bookingId}
                  className={`grid gap-4 px-5 py-4 transition hover:bg-surface-container ${
                    selectedBooking?.bookingId === booking.bookingId
                      ? 'bg-primary-container/10'
                      : ''
                  } lg:grid-cols-[minmax(0,1fr)_330px]`}
                >
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => setSelectedBookingId(booking.bookingId)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-on-surface-variant">
                        #{booking.bookingId}
                      </span>
                      <h4 className="text-base font-semibold text-on-surface">
                        {booking.licensePlate}
                      </h4>
                      <StatusBadge status={booking.status} />
                      <StatusBadge status={booking.paymentStatus ?? 'Unpaid'} />
                    </div>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      {booking.customerName} · {booking.serviceName}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-on-surface sm:grid-cols-3">
                      <span>{booking.scheduledDate || dateFilter}</span>
                      <span>{booking.slotLabel}</span>
                      <span>{booking.processingLaneName || 'Chưa có làn'}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-on-surface">
                      {formatVnd(booking.finalAmount)}
                    </p>
                    <WashDurationBadge booking={booking} className="mt-2" />
                  </button>

                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    <div className="flex min-w-0 gap-2">
                      <select
                        className="h-10 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface outline-none focus:border-primary"
                        value={statusDrafts[booking.bookingId] ?? booking.status}
                        onChange={(event) =>
                          setStatusDrafts((drafts) => ({
                            ...drafts,
                            [booking.bookingId]: event.target.value,
                          }))
                        }
                      >
                        {UPDATE_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status] ?? status}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="h-10 rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary disabled:opacity-60"
                        disabled={actionKey === `status-${booking.bookingId}`}
                        onClick={() => handleStatusUpdate(booking)}
                      >
                        Lưu
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="h-10 flex-1 rounded-lg border border-outline-variant px-3 text-sm font-semibold text-on-surface hover:bg-surface-variant"
                        onClick={() => setSelectedBookingId(booking.bookingId)}
                      >
                        Chi tiết
                      </button>
                      <button
                        type="button"
                        className="h-10 flex-1 rounded-lg border border-error/30 px-3 text-sm font-semibold text-error hover:bg-error-container/20 disabled:opacity-60"
                        disabled={actionKey === `noshow-${booking.bookingId}`}
                        onClick={() => handleNoShow(booking)}
                      >
                        Vắng mặt
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <h3 className="font-semibold text-on-surface">Tra theo biển số</h3>
            <div className="mt-4 space-y-3">
              <input
                className="h-11 w-full rounded-lg border border-outline-variant bg-surface px-3 font-semibold uppercase text-on-surface outline-none focus:border-primary"
                placeholder="VD: 51A-12345"
                value={plateQuery}
                onChange={(event) => setPlateQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handlePlateSearch()
                }}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="h-10 rounded-lg border border-outline-variant px-3 text-sm font-semibold text-on-surface hover:bg-surface-variant disabled:opacity-60"
                  disabled={plateLoading}
                  onClick={handlePlateSearch}
                >
                  Tra cứu
                </button>
                <select
                  className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface outline-none focus:border-primary"
                  value={plateStatus}
                  onChange={(event) => setPlateStatus(event.target.value)}
                >
                  {UPDATE_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status] ?? status}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="h-10 w-full rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary disabled:opacity-60"
                disabled={actionKey === 'plate-status'}
                onClick={handlePlateStatusUpdate}
              >
                Cập nhật trạng thái theo biển số
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {plateResults.map((booking) => (
                <button
                  key={booking.bookingId}
                  type="button"
                  className="w-full rounded-lg border border-outline-variant p-3 text-left hover:bg-surface-variant"
                  onClick={() => setSelectedBookingId(booking.bookingId)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-on-surface">#{booking.bookingId}</span>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {booking.licensePlate} · {booking.slotLabel}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <h3 className="font-semibold text-on-surface">Chi tiết booking</h3>
            {selectedBooking ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-on-surface-variant">
                      #{selectedBooking.bookingId}
                    </span>
                    <StatusBadge status={selectedBooking.status} />
                  </div>
                  <p className="mt-2 text-xl font-semibold text-on-surface">
                    {selectedBooking.licensePlate}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    {selectedBooking.customerName} · {selectedBooking.serviceName}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-surface-container p-3">
                    <p className="text-xs text-on-surface-variant">Ngày</p>
                    <p className="mt-1 font-semibold text-on-surface">
                      {selectedBooking.scheduledDate || dateFilter}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-container p-3">
                    <p className="text-xs text-on-surface-variant">Giờ</p>
                    <p className="mt-1 font-semibold text-on-surface">{selectedBooking.slotLabel}</p>
                  </div>
                  <div className="rounded-lg bg-surface-container p-3">
                    <p className="text-xs text-on-surface-variant">Làn</p>
                    <p className="mt-1 font-semibold text-on-surface">
                      {selectedBooking.processingLaneName || 'Chưa có'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-container p-3">
                    <p className="text-xs text-on-surface-variant">Tổng tiền</p>
                    <p className="mt-1 font-semibold text-on-surface">
                      {formatVnd(selectedBooking.finalAmount)}
                    </p>
                  </div>
                </div>

                <DetailList
                  booking={selectedBooking}
                  onReportMismatch={(detail) =>
                    setMismatchForm({
                      detailId: detail.detailId,
                      condition: 2,
                      actualTypeId: vehicleTypes[0]?.id ?? '',
                    })
                  }
                />

                <WashTelemetry booking={selectedBooking} />

                {mismatchForm.detailId != null && (
                  <div className="rounded-lg border border-tertiary/30 bg-tertiary-container/10 p-3">
                    <p className="text-sm font-semibold text-on-surface">
                      Báo mismatch detail #{mismatchForm.detailId}
                    </p>
                    <div className="mt-3 grid gap-2">
                      <select
                        className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface outline-none focus:border-primary"
                        value={mismatchForm.condition}
                        onChange={(event) =>
                          setMismatchForm((form) => ({
                            ...form,
                            condition: Number(event.target.value),
                          }))
                        }
                      >
                        {VEHICLE_CONDITIONS.map((condition) => (
                          <option key={condition.value} value={condition.value}>
                            {condition.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface outline-none focus:border-primary"
                        value={mismatchForm.actualTypeId}
                        onChange={(event) =>
                          setMismatchForm((form) => ({
                            ...form,
                            actualTypeId: event.target.value,
                          }))
                        }
                      >
                        <option value="">Giữ nguyên loại xe</option>
                        {vehicleTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="h-9 flex-1 rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary disabled:opacity-60"
                        disabled={actionKey === `mismatch-${mismatchForm.detailId}`}
                        onClick={handleReportMismatch}
                      >
                        Gửi báo cáo
                      </button>
                      <button
                        type="button"
                        className="h-9 rounded-lg px-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-variant"
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
            ) : (
              <p className="mt-4 text-sm text-on-surface-variant">
                Chọn một booking trong danh sách để xem chi tiết.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
