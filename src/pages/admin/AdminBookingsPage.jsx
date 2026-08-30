import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  fetchAdminBranches,
  fetchBookingsByDate,
  fetchTimeSlots,
  fetchVehicleTypes,
  filterBookingsByBranch,
  findUserByLicensePlate,
  forceCancelBookings,
  markBookingNoShow,
  normalizeAdminBooking,
  normalizePlateQuery,
  reportBookingMismatch,
  searchBookingsByLicensePlate,
  toApiTargetDate,
  updateBookingStatus,
  updateBookingStatusByLicensePlate,
  updateBookingCondition,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import WashTelemetry, { WashDurationBadge } from '../../components/shared/WashTelemetry'
import DataTable from '../../components/ui/DataTable'
import Input from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { formatVnd } from '../../utils/format'

const STATUS_OPTIONS = ['All', 'Pending', 'Checked-in', 'Processing', 'Completed', 'Cancelled', 'No-show']

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
  { value: 1, label: 'Sạch (Clean)' },
  { value: 2, label: 'Bẩn (Dirty)' },
  { value: 3, label: 'Rất bẩn (Very dirty)' },
]

const CONDITION_LABELS = {
  1: 'Sạch (Clean)',
  2: 'Bẩn (Dirty)',
  3: 'Rất bẩn (Very dirty)',
}

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
  const [branches, setBranches] = useState([])
  const [selectedBranchId, setSelectedBranchId] = useState('')
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
  const [conditionForm, setConditionForm] = useState({
    bookingId: null,
    condition: 2,
  })
  const [conditionLoading, setConditionLoading] = useState(false)
  const [plateQuery, setPlateQuery] = useState('')
  const [plateResults, setPlateResults] = useState([])
  const [plateLoading, setPlateLoading] = useState(false)
  const [plateStatus, setPlateStatus] = useState('Checked-in')
  const [plateActionLoading, setPlateActionLoading] = useState(false)
  const toast = useToast()

  const branchIdNum = Number(selectedBranchId)
  const selectedBranchName =
    branches.find((b) => b.id === branchIdNum)?.name ?? ''

  const loadBookings = useCallback(async () => {
    const targetDate = toApiTargetDate(dateFilter)
    if (!targetDate || !branchIdNum) return

    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchBookingsByDate(targetDate)
      const items = Array.isArray(data) ? data.map(normalizeAdminBooking) : []
      setBookings(filterBookingsByBranch(items, branchIdNum))
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách booking')
    } finally {
      setLoading(false)
    }
  }, [dateFilter, branchIdNum])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  useEffect(() => {
    fetchAdminBranches()
      .then((branchList) => setBranches(Array.isArray(branchList) ? branchList : []))
      .catch(() => {})
    fetchVehicleTypes()
      .then((types) => setVehicleTypes(Array.isArray(types) ? types : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!branchIdNum) {
      setTimeSlots([])
      setBookings([])
      return
    }
    fetchTimeSlots({ branchId: branchIdNum })
      .then((slots) => setTimeSlots(Array.isArray(slots) ? slots : []))
      .catch(() => setTimeSlots([]))
  }, [branchIdNum])

  const filtered = useMemo(() => {
    return bookings.filter((b) => statusFilter === 'All' || b.status === statusFilter)
  }, [bookings, statusFilter])

  const runBookingAction = async (fn, successMessage) => {
    setActionLoading(true)
    try {
      await fn()
      toast.success(successMessage)
      setDetailBooking(null)
      await loadBookings()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thực hiện được thao tác')
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
      toast.success(
        cancelReason.trim()
          ? `Đã hủy booking #${cancelTarget}. Lý do: ${cancelReason.trim()}`
          : `Đã hủy booking #${cancelTarget}`,
      )
      setCancelReason('')
      setDetailBooking(null)
      await loadBookings()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không hủy được booking')
    } finally {
      setCancelling(false)
    }
  }

  const handleForceCancel = async () => {
    if (!forceCancelForm.reason.trim() || forceCancelling) return

    if (!branchIdNum) {
      toast.warning('Chọn chi nhánh trước khi hủy hàng loạt')
      return
    }

    const timeSlotId = Number(forceCancelForm.timeSlotId)
    if (!timeSlotId) {
      toast.warning('Chọn khung giờ cần hủy hàng loạt')
      return
    }

    setForceCancelling(true)
    try {
      await forceCancelBookings({
        branchId: branchIdNum,
        timeSlotId,
        affectedDate: toApiTargetDate(dateFilter),
        reason: forceCancelForm.reason.trim(),
      })
      setForceCancelOpen(false)
      setForceCancelForm({ timeSlotId: '', reason: '' })
      toast.success('Đã hủy hàng loạt booking trong khung giờ')
      await loadBookings()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không force-cancel được')
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

  const handleUpdateCondition = async () => {
    if (!conditionForm.bookingId || conditionLoading) return
    setConditionLoading(true)
    try {
      await updateBookingCondition(conditionForm.bookingId, Number(conditionForm.condition))
      toast.success(`Đã cập nhật tình trạng xe: ${CONDITION_LABELS[conditionForm.condition]}`)
      setConditionForm({ bookingId: null, condition: 2 })
      setDetailBooking(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Lỗi khi cập nhật tình trạng xe.')
    } finally {
      setConditionLoading(false)
    }
  }

  const canChangeStatus = (status) =>
    status !== 'Cancelled' && status !== 'Completed' && status !== 'No-show'

  const searchByPlate = async () => {
    const plate = plateQuery.trim()
    if (!plate) return

    setPlateLoading(true)
    setPlateResults([])
    try {
      let items = (await searchBookingsByLicensePlate(plate)).map(normalizeAdminBooking)

      if (branchIdNum) {
        items = filterBookingsByBranch(items, branchIdNum)
      }

      const onSelectedDate = items.filter((b) => b.scheduledDate === dateFilter)
      const otherDates = items.filter((b) => b.scheduledDate !== dateFilter)
      items = [...onSelectedDate, ...otherDates]

      if (items.length) {
        const needsCustomer = items.some((b) => !b.customerName || b.customerName === '—')
        if (needsCustomer) {
          const lookup = await findUserByLicensePlate(items[0].licensePlate || plate)
          if (lookup) {
            items = items.map((b) => ({
              ...b,
              customerName: lookup.customer.fullName,
              rankName: lookup.customer.rankName,
            }))
          }
        }
      }

      setPlateResults(items)

      if (!items.length) {
        toast.warning('Không tìm thấy booking cho biển số này')
      } else if (!onSelectedDate.length && otherDates.length) {
        toast.info(
          `Tìm thấy ${items.length} booking — không có lịch trong ngày ${dateFilter}`,
        )
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không tra cứu được theo biển số')
    } finally {
      setPlateLoading(false)
    }
  }

  const applyPlateStatus = async () => {
    const plate = plateQuery.trim()
    if (!plate || plateActionLoading) return

    setPlateActionLoading(true)
    try {
      const apiPlate = normalizePlateQuery(plate)
      await updateBookingStatusByLicensePlate(apiPlate, plateStatus)
      toast.success('Đã cập nhật trạng thái theo biển số')
      await searchByPlate()
      if (branchIdNum) await loadBookings()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không đổi trạng thái được')
    } finally {
      setPlateActionLoading(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Vận hành"
        title="Lịch đặt"
        description="Chọn chi nhánh để xem và thao tác lịch đặt theo ngày"
        actionLabel="Hủy hàng loạt (slot)"
        actionIcon="event_busy"
        onAction={() => {
          if (!branchIdNum) {
            toast.warning('Chọn chi nhánh trước')
            return
          }
          setForceCancelOpen(true)
        }}
      />

      <div className="lw-card mb-6 rounded-xl p-5">
        <Input
          label="Chi nhánh thao tác"
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          iconLeft="store"
          className="max-w-md"
          // Render select through Input children — but Input renders <input>. So use raw select below.
        >
        </Input>
        <select
          className="mt-2 w-full max-w-md rounded-lg border border-outline-variant bg-white px-3.5 py-2 text-sm text-on-surface focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
        >
          <option value="">— Chọn chi nhánh —</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {b.isActive === false ? ' (Inactive)' : ''}
            </option>
          ))}
        </select>
        {selectedBranchId ? (
          <p className="mt-3 text-sm text-on-surface-variant">
            Đang thao tác tại: <strong className="text-on-surface">{selectedBranchName}</strong>
          </p>
        ) : (
          <p className="mt-3 text-sm text-on-surface-variant">
            Chọn chi nhánh để xem danh sách theo ngày hoặc hủy hàng loạt. Tra cứu biển số
            hoạt động không cần chọn chi nhánh.
          </p>
        )}
      </div>

      <div className="lw-card mb-6 rounded-xl p-5">
        <h2 className="mb-3 text-sm font-semibold text-on-surface">Tra cứu theo biển số</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Input
            label="Biển số"
            value={plateQuery}
            onChange={(e) => setPlateQuery(e.target.value)}
            placeholder="51F-123.45"
            className="min-w-[200px] flex-1"
          />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 self-end rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={plateLoading || !plateQuery.trim()}
            onClick={searchByPlate}
          >
            {plateLoading && (
              <span
                className="material-symbols-outlined lw-spin text-[16px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                progress_activity
              </span>
            )}
            {plateLoading ? 'Đang tìm…' : 'Tra cứu'}
          </button>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
              Đổi trạng thái
            </span>
            <select
              className="rounded-lg border border-outline-variant bg-white px-3.5 py-2 text-sm text-on-surface focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              value={plateStatus}
              disabled={plateActionLoading}
              onChange={(e) => setPlateStatus(e.target.value)}
            >
              {STATUS_OPTIONS.filter((s) => s !== 'All').map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status] ?? status}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 self-end rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary-container/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={plateActionLoading || !plateQuery.trim()}
            onClick={applyPlateStatus}
          >
            {plateActionLoading && (
              <span
                className="material-symbols-outlined lw-spin text-[16px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                progress_activity
              </span>
            )}
            {plateActionLoading ? 'Đang xử lý…' : 'Áp dụng'}
          </button>
        </div>
        {plateResults.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-outline-variant/60 pt-4 text-sm">
            {plateResults.map((b) => (
              <li key={b.bookingId}>
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-outline-variant/60 bg-white px-3 py-2 text-left transition-all hover:border-primary/30 hover:bg-primary/5"
                  onClick={() => setDetailBooking(b)}
                >
                  <span className="font-medium text-on-surface">#{b.bookingId}</span>
                  <span className="font-semibold tracking-wide text-primary">{b.licensePlate}</span>
                  <StatusBadge status={b.status} />
                  <StatusBadge status={b.paymentStatus ?? 'Unpaid'} />
                  <span className="text-on-surface">{b.customerName}</span>
                  <span className="text-on-surface-variant">{b.serviceName}</span>
                  <span className="text-on-surface-variant">
                    {b.scheduledDate} · {b.slotLabel}
                  </span>
                  <span className="text-on-surface-variant">{formatVnd(b.finalAmount)}</span>
                  {b.scheduledDate !== dateFilter && (
                    <span className="text-xs text-tertiary">Khác ngày đang chọn</span>
                  )}
                </button>
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
            className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-on-surface focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
                statusFilter === status
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-variant'
              }`}
              onClick={() => setStatusFilter(status)}
            >
              {STATUS_LABELS[status] ?? status}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="rounded-lg border border-error/40 px-3 py-1.5 text-sm font-medium text-error transition-colors hover:bg-error-container/40"
            onClick={loadBookings}
          >
            Thử lại
          </button>
        </div>
      )}

      {!selectedBranchId ? (
        <DataTable
          data={[]}
          loading={false}
          emptyIcon="store"
          emptyTitle="Chọn chi nhánh"
          emptyMessage="Chọn chi nhánh ở trên để tải và thao tác lịch đặt theo ngày."
          columns={[]}
        />
      ) : (
        <DataTable
          data={filtered}
          loading={loading}
          minWidth="1080px"
          emptyIcon="calendar_month"
          emptyTitle="Không có booking"
          columns={[
            {
              key: 'bookingId',
              label: 'Booking ID',
              width: '110px',
              render: (row) => <span className="font-medium">#{row.bookingId}</span>,
            },
            {
              key: 'licensePlate',
              label: 'Biển số',
              render: (row) => (
                <span className="font-semibold tracking-wide text-primary">{row.licensePlate}</span>
              ),
            },
            {
              key: 'customerName',
              label: 'Khách',
              render: (row) => row.customerName,
            },
            {
              key: 'serviceName',
              label: 'Dịch vụ',
              render: (row) => row.serviceName,
              tdClassName: 'text-on-surface-variant',
            },
            {
              key: 'slot',
              label: 'Slot/Giờ',
              render: (row) => (
                <div>
                  <p className="text-on-surface">{row.slotLabel}</p>
                  <p className="text-xs text-on-surface-variant">{row.scheduledDate}</p>
                </div>
              ),
            },
            {
              key: 'rankName',
              label: 'Tier',
              render: (row) => row.rankName,
            },
            {
              key: 'status',
              label: 'Trạng thái',
              width: '140px',
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: 'paymentStatus',
              label: 'Thanh toán',
              width: '140px',
              render: (row) => <StatusBadge status={row.paymentStatus ?? 'Unpaid'} />,
            },
            {
              key: 'finalAmount',
              label: 'Số tiền',
              width: '160px',
              render: (row) => (
                <div>
                  <div>{formatVnd(row.finalAmount)}</div>
                  <WashDurationBadge booking={row} className="mt-2" />
                </div>
              ),
            },
            {
              key: 'actions',
              label: 'Thao tác',
              width: '140px',
              align: 'right',
              renderActions: (row) => (
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary-container/30"
                    onClick={() => setDetailBooking(row)}
                  >
                    Chi tiết
                  </button>
                  {canChangeStatus(row.status) && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-error transition-colors hover:bg-error-container/30"
                      onClick={() => setCancelTarget(row.bookingId)}
                    >
                      Hủy
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
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
                <p className="text-xs text-on-surface-variant">Thanh toán</p>
                <StatusBadge status={detailBooking.paymentStatus ?? 'Unpaid'} />
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
                <p className="text-xs text-on-surface-variant">Khách hàng</p>
                <p className="text-on-surface">{detailBooking.customerName}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-on-surface-variant">QR fallback</p>
                <p className="font-mono text-on-surface">{detailBooking.fallbackQrCode}</p>
              </div>
            </div>

            <WashTelemetry booking={detailBooking} />

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
                      'Đã đánh dấu vắng mặt',
                    )
                  }
                >
                  Vắng mặt
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
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            className="text-xs text-secondary hover:underline"
                            onClick={() =>
                              setConditionForm({
                                bookingId: detailBooking.bookingId,
                                condition: 2,
                              })
                            }
                          >
                            Ghi nhận tình trạng
                          </button>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
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
                        </div>
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

            {conditionForm.bookingId != null && (
              <div className="rounded-lg border border-secondary/30 bg-secondary-container/10 p-3">
                <p className="mb-2 text-xs font-semibold text-on-surface-variant uppercase">
                  Ghi nhận tình trạng xe #{conditionForm.bookingId}
                </p>
                <label className="mb-2 block space-y-1 text-sm">
                  <span className="text-on-surface-variant">Tình trạng thực tế</span>
                  <select
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-2"
                    value={conditionForm.condition}
                    onChange={(e) =>
                      setConditionForm((f) => ({ ...f, condition: Number(e.target.value) }))
                    }
                  >
                    {VEHICLE_CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={conditionLoading}
                    className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-semibold text-on-secondary disabled:opacity-50"
                    onClick={handleUpdateCondition}
                  >
                    {conditionLoading ? 'Đang xử lý…' : 'Cập nhật'}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-sm text-on-surface-variant hover:underline"
                    onClick={() => setConditionForm({ bookingId: null, condition: 2 })}
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
            Hủy mọi booking tại <strong className="text-on-surface">{selectedBranchName}</strong>{' '}
            trong khung giờ đã chọn, ngày{' '}
            <strong className="text-on-surface">{dateFilter}</strong>.
          </p>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">
              Khung giờ
            </span>
            <select
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={forceCancelForm.timeSlotId}
              disabled={forceCancelling || !branchIdNum}
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

