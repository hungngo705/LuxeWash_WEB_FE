import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  fetchManagerBookings,
  fetchManagerStaffs,
  fetchManagerLanes,
  normalizeManagerBooking,
  checkinAssignBooking,
  markManagerBookingNoShow,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'
import { WashDurationBadge } from '../../components/shared/WashTelemetry'
import LaneAssignmentBadge from '../../components/shared/LaneAssignmentBadge'
import { formatVnd } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'
import { publishLaneDisplayEvent } from '../../services/laneDisplayChannel'
import { hasAssignedLane } from '../../utils/laneAssignment'

const STATUS_FILTERS = ['Tất cả', 'Chờ check-in', 'Đã check-in', 'Đang rửa']

const STATUS_RAW_MAP = {
  pending: 'Chờ check-in',
  checkedin: 'Đã check-in',
  checked_in: 'Đã check-in',
  processing: 'Đang rửa',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  noshow: 'Vắng mặt',
}

function normalizeStatus(raw) {
  const s = String(raw ?? '').toLowerCase().replace(/[\s_-]+/g, '')
  return STATUS_RAW_MAP[s] ?? String(raw ?? '')
}

function normalizeBookingWithStatus(item) {
  const normalized = normalizeManagerBooking(item)
  return { ...normalized, status: normalizeStatus(normalized.status) }
}

export default function ManagerQueuePage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [, setStaffs] = useState([])
  const [lanes, setLanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tất cả')
  const [search, setSearch] = useState('')

  const [assignTarget, setAssignTarget] = useState(null)
  const [selectedLaneId, setSelectedLaneId] = useState('')
  const [assigning, setAssigning] = useState(false)

  const [noShowTarget, setNoShowTarget] = useState(null)
  const [noShowing, setNoShowing] = useState(false)
  const toast = useToast()

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    if (!silent) setLoadError('')
    try {
      const [bookingsResult, staffsResult, lanesResult] = await Promise.allSettled([
        fetchManagerBookings(),
        fetchManagerStaffs(),
        fetchManagerLanes(),
      ])

      if (bookingsResult.status === 'fulfilled') {
        setBookings(Array.isArray(bookingsResult.value) ? bookingsResult.value.map(normalizeBookingWithStatus) : [])
      }
      if (staffsResult.status === 'fulfilled') {
        setStaffs(Array.isArray(staffsResult.value) ? staffsResult.value : [])
      }
      if (lanesResult.status === 'fulfilled') {
        setLanes(Array.isArray(lanesResult.value) ? lanesResult.value : [])
      }

      if (bookingsResult.status === 'rejected') {
        const err = bookingsResult.reason
        if (!silent) {
          setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách booking.')
        }
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async queue load with polling cleanup
    loadData()
    const interval = setInterval(() => loadData({ silent: true }), 10_000)
    return () => clearInterval(interval)
  }, [loadData])

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'Chờ check-in').length,
    waiting: bookings.filter((b) => b.status === 'Đã check-in' && !hasAssignedLane(b)).length,
    ready: bookings.filter((b) => b.status === 'Đã check-in' && hasAssignedLane(b)).length,
    processing: bookings.filter((b) => b.status === 'Đang rửa').length,
  }), [bookings])

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchStatus = statusFilter === 'Tất cả' || b.status === statusFilter
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        b.licensePlate?.toLowerCase().includes(q) ||
        b.customerName?.toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [bookings, statusFilter, search])

  const assignableLanes = useMemo(() => {
    const bookingType = String(assignTarget?.bookingType ?? '').toLowerCase()
    const isBusinessBooking = bookingType === 'business' || bookingType === 'fleet'
    return lanes.filter(
      (lane) =>
        lane.isActive !== false &&
        Boolean(lane.isBusinessLane) === isBusinessBooking,
    )
  }, [assignTarget, lanes])

  const handleAssignLane = async () => {
    if (!assignTarget || !selectedLaneId) return
    setAssigning(true)
    try {
      await checkinAssignBooking(assignTarget.bookingId, {
        laneId: Number(selectedLaneId),
        staffId: user?.userId ? Number(user.userId) : undefined,
      })
      const selectedLane = lanes.find((lane) => Number(lane.laneId) === Number(selectedLaneId))
      publishLaneDisplayEvent({
        type: 'assigned',
        plate: assignTarget.licensePlate,
        bookingId: assignTarget.bookingId,
        laneId: Number(selectedLaneId),
        laneName: selectedLane?.name ?? selectedLane?.laneName,
      })
      toast.success(`Xe ${assignTarget.licensePlate} đã điều vào làn.`)
      setAssignTarget(null)
      setSelectedLaneId('')
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Lỗi khi điều xe vào làn.')
    } finally {
      setAssigning(false)
    }
  }

  const handleNoShow = async () => {
    if (!noShowTarget) return
    setNoShowing(true)
    try {
      await markManagerBookingNoShow(noShowTarget.bookingId)
      toast.success('Đã đánh dấu vắng mặt.')
      setNoShowTarget(null)
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Lỗi khi đánh dấu vắng mặt.')
    } finally {
      setNoShowing(false)
    }
  }

  const canAssign = (b) =>
    b.status === 'Chờ check-in' || (b.status === 'Đã check-in' && !hasAssignedLane(b))
  const canNoShow = (b) => b.status === 'Chờ check-in' || b.status === 'Đã check-in'

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Vận hành chi nhánh"
        title="Điều phối xe vào làn"
        description="Quản lý xe chờ, check-in và phân công làn rửa"
        actionIcon="local_shipping"
      />

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: 'Tổng', value: stats.total, color: 'text-on-surface' },
          { label: 'Chờ check-in', value: stats.pending, color: 'text-tertiary-container' },
          { label: 'Chờ làn', value: stats.waiting, color: 'text-tertiary-container' },
          { label: 'Đã có làn', value: stats.ready, color: 'text-primary' },
          { label: 'Đang rửa', value: stats.processing, color: 'text-primary-container' },
        ].map((s) => (
          <div key={s.label} className="glass-panel rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-center">
            <p className="font-sora text-2xl font-semibold text-on-surface">{s.value}</p>
            <p className={`text-xs font-medium ${s.color}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                statusFilter === f
                  ? 'bg-secondary text-on-secondary'
                  : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
              }`}
              onClick={() => setStatusFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          type="text"
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm uppercase placeholder:text-outline"
          placeholder="Tìm biển số..."
          value={search}
          onChange={(e) => setSearch(e.target.value.toUpperCase())}
        />
      </div>

      {loadError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-error-container/40 bg-error-container/10 p-6 text-center">
          <p className="text-sm text-error">{loadError}</p>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary" onClick={loadData}>
            Thử lại
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline">garage</span>
          <p className="text-sm text-on-surface-variant">Không có xe nào trong danh sách</p>
        </div>
      ) : (
        <DataTable
          data={filtered}
          loading={loading}
          minWidth="900px"
          emptyIcon="garage"
          emptyTitle="Không có xe nào trong danh sách"
          columns={[
            {
              key: 'bookingId',
              label: 'Booking ID',
              width: '110px',
              render: (b) => (
                <span className="font-medium text-on-surface">#{b.bookingId}</span>
              ),
            },
            {
              key: 'licensePlate',
              label: 'Biển số',
              render: (b) => (
                <span className="font-mono font-semibold text-secondary uppercase">
                  {b.licensePlate}
                </span>
              ),
            },
            {
              key: 'customerName',
              label: 'Khách hàng',
              render: (b) => <span className="text-on-surface">{b.customerName}</span>,
              tdClassName: 'text-on-surface',
            },
            {
              key: 'serviceName',
              label: 'Dịch vụ',
              render: (b) => <span className="text-on-surface-variant">{b.serviceName}</span>,
              tdClassName: 'text-on-surface-variant',
            },
            {
              key: 'slotLabel',
              label: 'Slot/Giờ',
              render: (b) => (
                <>
                  <p className="text-on-surface">{b.slotLabel}</p>
                  <p className="text-xs text-on-surface-variant">{b.scheduledDate}</p>
                </>
              ),
            },
            {
              key: 'lane',
              label: 'Làn',
              render: (b) => (
                <LaneAssignmentBadge
                  booking={{
                    ...b,
                    status:
                      b.status === 'Đã check-in'
                        ? 'Checked-in'
                        : b.status === 'Đang rửa'
                          ? 'Processing'
                          : b.status === 'Chờ check-in'
                            ? 'Pending'
                            : b.status,
                  }}
                />
              ),
            },
            {
              key: 'status',
              label: 'Trạng thái',
              render: (b) => <StatusBadge status={b.status} />,
            },
            {
              key: 'finalAmount',
              label: 'Số tiền',
              render: (b) => (
                <>
                  <div>{formatVnd(b.finalAmount)}</div>
                  <WashDurationBadge booking={b} className="mt-2" />
                </>
              ),
              tdClassName: 'text-on-surface',
            },
            {
              key: 'actions',
              label: 'Thao tác',
              width: '220px',
              align: 'right',
              renderActions: (b) => (
                <div className="flex flex-wrap justify-end gap-1.5">
                  {canAssign(b) && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-on-secondary hover:bg-secondary/90 disabled:opacity-50"
                      onClick={() => {
                        setAssignTarget(b)
                        setSelectedLaneId('')
                      }}
                      disabled={lanes.length === 0}
                    >
                      {b.status === 'Chờ check-in' ? 'Check-in & phân làn' : 'Phân làn thủ công'}
                    </button>
                  )}
                  {canNoShow(b) && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-variant"
                      onClick={() => setNoShowTarget(b)}
                    >
                      <span
                        className="material-symbols-outlined text-[14px]"
                        style={{ fontVariationSettings: "'FILL' 0" }}
                      >
                        person_off
                      </span>
                      Vắng mặt
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Assign Lane Modal */}
      <FormModal
        open={Boolean(assignTarget)}
        title={`${assignTarget?.status === 'Chờ check-in' ? 'Check-in và phân làn' : 'Phân làn thủ công'} · ${assignTarget?.licensePlate ?? ''}`}
        submitLabel={assigning ? 'Đang xử lý...' : 'Xác nhận điều'}
        onClose={() => !assigning && setAssignTarget(null)}
        onSubmit={handleAssignLane}
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            Chọn làn cho xe <strong className="text-on-surface">{assignTarget?.licensePlate}</strong>. Xe đã check-in nhưng chưa có làn sẽ không bị check-in lại.
          </p>
          {assignableLanes.length === 0 ? (
            <p className="text-sm text-error">
              Không có làn nào khả dụng. Vui lòng liên hệ Admin để tạo làn rửa cho chi nhánh này.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {assignableLanes.map((lane) => (
                <button
                  key={lane.laneId}
                  type="button"
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                    selectedLaneId === String(lane.laneId)
                      ? 'border-secondary bg-secondary-container/30 text-on-surface'
                      : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-secondary'
                  }`}
                  onClick={() => setSelectedLaneId(String(lane.laneId))}
                >
                  <span className="material-symbols-outlined text-lg">garage</span>
                  <p className="mt-1 font-semibold">{lane.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </FormModal>

      {/* No-show Confirmation */}
      <ConfirmDialog
        open={Boolean(noShowTarget)}
        title="Đánh dấu vắng mặt"
        message={
          <p className="text-sm text-on-surface-variant">
            Xe <strong className="text-on-surface">{noShowTarget?.licensePlate}</strong> không đến? Đánh dấu vắng mặt — tiền cọc sẽ không được hoàn.
          </p>
        }
        confirmLabel={noShowing ? 'Đang xử lý...' : 'Đánh dấu vắng mặt'}
        variant="danger"
        loading={noShowing}
        onConfirm={handleNoShow}
        onCancel={() => !noShowing && setNoShowTarget(null)}
      />
    </div>
  )
}
