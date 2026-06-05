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
import { formatVnd } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'

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
  const s = String(raw ?? '').toLowerCase().replace(/\s+/g, '')
  return STATUS_RAW_MAP[s] ?? String(raw ?? '')
}

function normalizeBookingWithStatus(item) {
  const normalized = normalizeManagerBooking(item)
  return { ...normalized, status: normalizeStatus(normalized.status) }
}

export default function ManagerQueuePage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [staffs, setStaffs] = useState([])
  const [lanes, setLanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tất cả')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')

  const [assignTarget, setAssignTarget] = useState(null)
  const [selectedLaneId, setSelectedLaneId] = useState('')
  const [assigning, setAssigning] = useState(false)

  const [noShowTarget, setNoShowTarget] = useState(null)
  const [noShowing, setNoShowing] = useState(false)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
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
        setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách booking.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'Chờ check-in').length,
    checkedIn: bookings.filter((b) => b.status === 'Đã check-in').length,
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

  const handleAssignLane = async () => {
    if (!assignTarget || !selectedLaneId) return
    setAssigning(true)
    try {
      await checkinAssignBooking(assignTarget.bookingId, {
        laneId: Number(selectedLaneId),
        staffId: user?.userId ? Number(user.userId) : undefined,
      })
      showToast(`Xe ${assignTarget.licensePlate} đã điều vào làn.`)
      setAssignTarget(null)
      setSelectedLaneId('')
      await loadData()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Lỗi khi điều xe vào làn.')
    } finally {
      setAssigning(false)
    }
  }

  const handleNoShow = async () => {
    if (!noShowTarget) return
    setNoShowing(true)
    try {
      await markManagerBookingNoShow(noShowTarget.bookingId)
      showToast('Đã đánh dấu vắng mặt.')
      setNoShowTarget(null)
      await loadData()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Lỗi khi đánh dấu vắng mặt.')
    } finally {
      setNoShowing(false)
    }
  }

  const canAssign = (b) => b.status === 'Chờ check-in'
  const canNoShow = (b) => b.status === 'Chờ check-in' || b.status === 'Đã check-in'

  return (
    <div className="w-full">
      <PageHeader
        title="Điều phối xe vào làn"
        description="Quản lý xe chờ, check-in và phân công làn rửa"
      />

      {toast && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </div>
      )}

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Tổng', value: stats.total, color: 'text-on-surface' },
          { label: 'Chờ check-in', value: stats.pending, color: 'text-tertiary-container' },
          { label: 'Đã check-in', value: stats.checkedIn, color: 'text-secondary-container' },
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
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">Booking ID</th>
                <th className="px-4 py-3">Biển số</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Dịch vụ</th>
                <th className="px-4 py-3">Slot/Giờ</th>
                <th className="px-4 py-3">Làn</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Số tiền</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {filtered.map((b) => (
                <tr key={b.bookingId} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 font-medium text-on-surface">#{b.bookingId}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-secondary uppercase">{b.licensePlate}</td>
                  <td className="px-4 py-3 text-on-surface">{b.customerName}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{b.serviceName}</td>
                  <td className="px-4 py-3">
                    <p className="text-on-surface">{b.slotLabel}</p>
                    <p className="text-xs text-on-surface-variant">{b.scheduledDate}</p>
                  </td>
                  <td className="px-4 py-3 text-on-surface">{b.processingLaneName || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 text-on-surface">{formatVnd(b.finalAmount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {canAssign(b) && (
                        <button
                          type="button"
                          className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-on-secondary hover:bg-secondary/90 disabled:opacity-50"
                          onClick={() => {
                            setAssignTarget(b)
                            setSelectedLaneId('')
                          }}
                          disabled={lanes.length === 0}
                        >
                          Điều vào làn
                        </button>
                      )}
                      {canNoShow(b) && (
                        <button
                          type="button"
                          className="rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-variant"
                          onClick={() => setNoShowTarget(b)}
                        >
                          Vắng mặt
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

      {/* Assign Lane Modal */}
      <FormModal
        open={Boolean(assignTarget)}
        title={`Điều xe ${assignTarget?.licensePlate ?? ''} vào làn`}
        submitLabel={assigning ? 'Đang xử lý...' : 'Xác nhận điều'}
        onClose={() => !assigning && setAssignTarget(null)}
        onSubmit={handleAssignLane}
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            Chọn làn để điều xe <strong className="text-on-surface">{assignTarget?.licensePlate}</strong> vào rửa.
          </p>
          {lanes.length === 0 ? (
            <p className="text-sm text-error">
              Không có làn nào khả dụng. Vui lòng liên hệ Admin để tạo làn rửa cho chi nhánh này.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {lanes.map((lane) => (
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
        onConfirm={handleNoShow}
        onCancel={() => !noShowing && setNoShowTarget(null)}
      />
    </div>
  )
}
