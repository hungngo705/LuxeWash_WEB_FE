import { useMemo, useState } from 'react'
import FormModal from '../../admin/shared/FormModal'
import StatusBadge from '../../admin/shared/StatusBadge'
import { formatDayFull, formatDayShort, isSameDay } from '../../../utils/week'
import { formatVnd } from '../../../utils/format'

const STATUS_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'Pending', label: 'Chờ check-in' },
  { id: 'Checked-in', label: 'Đã check-in' },
  { id: 'Processing', label: 'Đang rửa' },
  { id: 'Completed', label: 'Hoàn thành' },
  { id: 'No-show', label: 'Vắng mặt' },
  { id: 'Cancelled', label: 'Đã hủy' },
]

/**
 * @param {unknown} b
 * @returns {boolean} true nếu booking là walk-in (không có customer cụ thể).
 */
function isWalkInBooking(b) {
  if (!b) return false
  if ((b.bookingType ?? '').toString().toLowerCase() === 'walkin') return true
  const name = (b.customerName ?? '').toString().trim()
  if (!name || name === '—' || name === '-') return true
  if (b.userId == null || b.userId === 0) return true
  return false
}

/**
 * Lấy giờ trong ngày (HH:mm) từ scheduledTime ISO, fallback slotLabel.
 * @param {Record<string, unknown>} b
 */
function bookingTimeLabel(b) {
  const iso = b.scheduledTime
  if (iso) {
    const d = new Date(String(iso))
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  }
  return b.slotLabel ? String(b.slotLabel) : '—'
}

/**
 * Sort key cho thời gian của booking. Ưu tiên scheduledTime ISO.
 * @param {Record<string, unknown>} b
 */
function bookingSortKey(b) {
  const iso = b.scheduledTime
  if (iso) {
    const t = new Date(String(iso)).getTime()
    if (!Number.isNaN(t)) return t
  }
  return Number.MAX_SAFE_INTEGER
}

/**
 * Lấy tên khách hiển thị (fallback "Khách vãng lai").
 */
function getDisplayName(b) {
  if (isWalkInBooking(b)) return 'Khách vãng lai'
  const name = (b.customerName ?? '').toString().trim()
  return name && name !== '—' && name !== '-' ? name : 'Khách vãng lai'
}

/**
 * Lấy SĐT khách (nếu có).
 */
function getDisplayPhone(b) {
  const phone = (b.phoneNumber ?? b.customerPhone ?? '').toString().trim()
  return phone && phone !== '—' && phone !== '-' ? phone : ''
}

/**
 * DayBookingsPanel - Modal "Sổ thông tin 1 ngày" cho Manager.
 *
 * Hiển thị toàn bộ booking của 1 ngày (mọi status: Pending/Checked-in/Processing/
 * Completed/Cancelled/No-show) bao gồm cả khách vãng lai.
 *
 * Props:
 *   - open: boolean
 *   - date: Date | null - ngày đang xem
 *   - bookings: Array - danh sách booking đã được normalize (AdminBooking[])
 *   - loading: boolean
 *   - error?: string - thông báo lỗi (vd 403 khi BE chưa cấp quyền)
 *   - onClose()
 *   - onBookingClick(b): callback khi user click vào 1 dòng booking
 */
export default function DayBookingsPanel({
  open,
  date,
  bookings = [],
  loading = false,
  error = '',
  onClose,
  onBookingClick,
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Reset filter khi đổi ngày (open sang ngày khác)
  // Effect-free: state sẽ được re-create khi `open` thay đổi qua key
  // (không cần useEffect để tránh setState in render)

  const sorted = useMemo(() => {
    return [...bookings].sort((a, b) => bookingSortKey(a) - bookingSortKey(b))
  }, [bookings])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sorted.filter((b) => {
      const matchStatus = statusFilter === 'all' || b.status === statusFilter
      if (!matchStatus) return false
      if (!q) return true
      const plate = (b.licensePlate ?? '').toString().toLowerCase()
      const name = (b.customerName ?? '').toString().toLowerCase()
      const svc = (b.serviceName ?? '').toString().toLowerCase()
      return plate.includes(q) || name.includes(q) || svc.includes(q)
    })
  }, [sorted, statusFilter, search])

  const stats = useMemo(() => {
    const count = (predicate) => bookings.filter(predicate).length
    return {
      total: bookings.length,
      pending: count((b) => b.status === 'Pending'),
      checkedIn: count((b) => b.status === 'Checked-in'),
      processing: count((b) => b.status === 'Processing'),
      completed: count((b) => b.status === 'Completed'),
      noShow: count((b) => b.status === 'No-show'),
      cancelled: count((b) => b.status === 'Cancelled'),
    }
  }, [bookings])

  // Khi modal không mở hoặc chưa có date → render FormModal rỗng
  if (!open || !date) {
    return <FormModal open={open} title="Sổ lịch ngày" onClose={onClose} />
  }

  return (
    <FormModal
      key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${statusFilter}`}
      open={open}
      title={`Sổ lịch ngày ${formatDayFull(date)}`}
      submitLabel="Đóng"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault()
        onClose?.()
      }}
      size="xl"
    >
      <div className="space-y-4">
        {/* Banner lỗi (vd 403 khi BE chưa cấp quyền cho role) */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-error-container/40 bg-error-container/10 px-4 py-3">
            <span className="material-symbols-outlined text-error">error</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-error">{error}</p>
            </div>
          </div>
        )}

        {/* Banner ngày đặc biệt */}
        {!isSameDay(date, new Date()) &&
          (() => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
            const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)
            if (diffDays < 0) {
              return (
                <div className="flex items-start gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3">
                  <span className="material-symbols-outlined text-on-surface-variant">history</span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">
                      Ngày trong quá khứ (cách {Math.abs(diffDays)} ngày)
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Chỉ xem thông tin. Không thể thao tác với booking đã qua.
                    </p>
                  </div>
                </div>
              )
            }
            if (diffDays > 0) {
              return (
                <div className="flex items-start gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3">
                  <span className="material-symbols-outlined text-on-surface-variant">schedule</span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">
                      Ngày trong tương lai (cách {diffDays} ngày)
                    </p>
                  </div>
                </div>
              )
            }
            return null
          })()}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { label: 'Tổng', value: stats.total, tone: 'default' },
            { label: 'Chờ check-in', value: stats.pending, tone: 'warning' },
            { label: 'Checked-in', value: stats.checkedIn, tone: 'info' },
            { label: 'Đang rửa', value: stats.processing, tone: 'primary' },
            { label: 'Hoàn thành', value: stats.completed, tone: 'success' },
            { label: 'Vắng mặt', value: stats.noShow, tone: 'danger' },
            { label: 'Đã hủy', value: stats.cancelled, tone: 'muted' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-center"
            >
              <p className="font-sora text-xl font-semibold text-on-surface">{s.value}</p>
              <p className="text-[11px] font-medium text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter + search */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  statusFilter === f.id
                    ? 'bg-secondary text-on-secondary'
                    : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm biển số, khách, dịch vụ…"
            className="h-10 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm lg:w-72"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest py-12 text-center">
            <span className="material-symbols-outlined text-5xl text-outline">event_busy</span>
            <p className="text-sm font-medium text-on-surface-variant">
              {bookings.length === 0
                ? `Không có booking nào trong ngày ${formatDayShort(date)}.`
                : 'Không có booking nào khớp bộ lọc hiện tại.'}
            </p>
          </div>
        ) : (
          <div className="glass-panel overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Giờ</th>
                  <th className="px-3 py-2.5">Khách hàng</th>
                  <th className="px-3 py-2.5">Biển số</th>
                  <th className="px-3 py-2.5">Dịch vụ</th>
                  <th className="px-3 py-2.5">Làn</th>
                  <th className="px-3 py-2.5">Trạng thái</th>
                  <th className="px-3 py-2.5">Thanh toán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {filtered.map((b, index) => {
                  const walkIn = isWalkInBooking(b)
                  const displayName = getDisplayName(b)
                  const phone = getDisplayPhone(b)
                  return (
                    <tr
                      key={b.bookingId ?? `${b.licensePlate}-${index}`}
                      className="cursor-pointer transition-colors hover:bg-surface-container-low"
                      onClick={() => onBookingClick?.(b)}
                    >
                      <td className="px-3 py-2.5 text-on-surface-variant">{index + 1}</td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-secondary">
                        {bookingTimeLabel(b)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                walkIn ? 'italic text-on-surface-variant' : 'text-on-surface'
                              }`}
                            >
                              {displayName}
                            </span>
                            {walkIn && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-container/40 px-2 py-0.5 text-[10px] font-semibold text-on-tertiary-container">
                                <span
                                  className="material-symbols-outlined text-[11px]"
                                  style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                  directions_car
                                </span>
                                Walk-in
                              </span>
                            )}
                          </div>
                          {phone && (
                            <span className="text-[11px] text-on-surface-variant">{phone}</span>
                          )}
                          {!phone && walkIn && (
                            <span className="text-[11px] italic text-on-surface-variant">
                              Không có SĐT
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold uppercase text-on-surface">
                        {b.licensePlate && b.licensePlate !== '—' ? b.licensePlate : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-on-surface">
                        {b.serviceName && b.serviceName !== '—' ? b.serviceName : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs">{b.processingLaneName || '—'}</span>
                          {b.isBusinessLane && (
                            <span className="inline-flex w-fit rounded-full border border-secondary/30 bg-secondary-container/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-on-secondary-container">
                              Doanh nghiệp
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-3 py-2.5 font-medium">
                        <div className="text-on-surface">{formatVnd(b.finalAmount)}</div>
                        {b.paymentStatus && b.paymentStatus !== 'Unpaid' && (
                          <div className="mt-0.5 text-[11px] text-on-surface-variant">
                            {b.paymentStatus}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-[11px] text-on-surface-variant">
          Bấm vào 1 dòng để xem chi tiết. Tổng {bookings.length} booking, hiển thị{' '}
          {filtered.length}.
        </p>
      </div>
    </FormModal>
  )
}
