import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, fetchManagerBookings, normalizeManagerBooking } from '../../api'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import { formatDateTime, formatVnd } from '../../utils/format'

const STATUS_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Checked-in', label: 'Checked-in' },
  { id: 'Processing', label: 'Processing' },
  { id: 'Completed', label: 'Completed' },
  { id: 'No-show', label: 'No-show' },
  { id: 'Cancelled', label: 'Cancelled' },
]

export default function ManagerBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const loadBookings = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchManagerBookings()
      setBookings(Array.isArray(data) ? data.map(normalizeManagerBooking) : [])
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được lịch đặt.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBookings()
    const interval = setInterval(loadBookings, 30_000)
    return () => clearInterval(interval)
  }, [loadBookings])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bookings.filter((b) => {
      const matchStatus = statusFilter === 'all' || b.status === statusFilter
      const matchSearch =
        !q ||
        b.licensePlate?.toLowerCase().includes(q) ||
        b.customerName?.toLowerCase().includes(q) ||
        b.serviceName?.toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [bookings, statusFilter, search])

  const stats = useMemo(
    () => ({
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'Pending').length,
      checkedIn: bookings.filter((b) => b.status === 'Checked-in').length,
      processing: bookings.filter((b) => b.status === 'Processing').length,
    }),
    [bookings],
  )

  return (
    <div className="w-full">
      <PageHeader
        title="Lịch đặt"
        description="Theo dõi booking chi nhánh — Pending, Checked-in, Processing"
      />

      <div className="mb-4 flex justify-end">
        <Link
          to="/manager/queue"
          className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-on-secondary hover:bg-secondary/90"
        >
          <span className="material-symbols-outlined text-[18px]">local_shipping</span>
          Điều phối & check-in
        </Link>
      </div>

      {loadError ? (
        <div className="mb-6 rounded-xl border border-error-container/40 bg-error-container/10 p-4">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
            onClick={loadBookings}
          >
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Tổng lịch', value: stats.total },
              { label: 'Pending', value: stats.pending },
              { label: 'Checked-in', value: stats.checkedIn },
              { label: 'Processing', value: stats.processing },
            ].map((s) => (
              <div
                key={s.label}
                className="glass-panel rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-center"
              >
                <p className="font-sora text-2xl font-semibold text-on-surface">{s.value}</p>
                <p className="text-xs font-medium text-on-surface-variant">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    statusFilter === f.id
                      ? 'bg-secondary text-on-secondary'
                      : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
                  }`}
                  onClick={() => setStatusFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <input
              type="search"
              className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm lg:w-72"
              placeholder="Tìm biển số, khách, dịch vụ…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-outline">event_busy</span>
              <p className="text-sm text-on-surface-variant">
                Không có booking đang hoạt động tại chi nhánh.
              </p>
            </div>
          ) : (
            <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Biển số</th>
                    <th className="px-4 py-3">Khách hàng</th>
                    <th className="px-4 py-3">Dịch vụ</th>
                    <th className="px-4 py-3">Giờ hẹn</th>
                    <th className="px-4 py-3">Làn</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Thanh toán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {filtered.map((b, index) => (
                    <tr key={b.bookingId} className="hover:bg-surface-container-low/50">
                      <td className="px-4 py-3 text-on-surface-variant">{index + 1}</td>
                      <td className="px-4 py-3 font-mono font-semibold uppercase text-secondary">
                        {b.licensePlate}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-on-surface">{b.customerName}</p>
                        {b.customerPhone && b.customerPhone !== '—' && (
                          <p className="text-xs text-on-surface-variant">{b.customerPhone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-on-surface">{b.serviceName}</td>
                      <td className="px-4 py-3">
                        <p>{b.slotLabel}</p>
                        <p className="text-xs text-on-surface-variant">
                          {formatDateTime(b.scheduledTime ?? b.scheduledDate)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{b.processingLaneName || '—'}</p>
                        {b.isBusinessLane && (
                          <span className="mt-1 inline-flex rounded-full border border-secondary/30 bg-secondary-container/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-on-secondary-container">
                            Doanh nghiệp
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3 font-medium">{formatVnd(b.finalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
