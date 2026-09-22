import FormModal from '../../admin/shared/FormModal'
import StatusBadge from '../../admin/shared/StatusBadge'
import { formatDateTime, formatVnd, formatWashDuration } from '../../../utils/format'

/**
 * @param {Record<string, unknown>} b
 */
function isWalkInBooking(b) {
  if (!b) return false
  if ((b.bookingType ?? '').toString().toLowerCase() === 'walkin') return true
  const name = (b.customerName ?? '').toString().trim()
  if (!name || name === '—' || name === '-') return true
  if (b.userId == null || b.userId === 0) return true
  return false
}

function getDisplayName(b) {
  if (isWalkInBooking(b)) return 'Khách vãng lai'
  const name = (b.customerName ?? '').toString().trim()
  return name && name !== '—' && name !== '-' ? name : 'Khách vãng lai'
}

function getDisplayPhone(b) {
  const phone = (b.phoneNumber ?? b.customerPhone ?? '').toString().trim()
  return phone && phone !== '—' && phone !== '-' ? phone : '—'
}

/**
 * BookingDetailPanel - Modal read-only chi tiết 1 booking cho Manager.
 *
 * Không có action write/create — Manager chỉ xem.
 *
 * Props:
 *   - open: boolean
 *   - booking: AdminBooking | null
 *   - onClose()
 */
export default function BookingDetailPanel({ open, booking, onClose }) {
  if (!booking) {
    return <FormModal open={open} title="Chi tiết booking" onClose={onClose} />
  }

  const walkIn = isWalkInBooking(booking)
  const displayName = getDisplayName(booking)
  const phone = getDisplayPhone(booking)
  const plate = (booking.licensePlate ?? '').toString()
  const serviceName =
    booking.serviceName && booking.serviceName !== '—'
      ? String(booking.serviceName)
      : '—'
  const slotLabel = booking.slotLabel ? String(booking.slotLabel) : '—'
  const laneName = booking.processingLaneName ? String(booking.processingLaneName) : '—'
  const hasDetails = Array.isArray(booking.details) && booking.details.length > 1

  return (
    <FormModal
      open={open}
      title={`Booking #${booking.bookingId ?? '—'}`}
      submitLabel="Đóng"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault()
        onClose?.()
      }}
      size="lg"
    >
      <div className="space-y-5">
        {/* Header: status + loại khách */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={booking.status} />
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
              walkIn
                ? 'bg-tertiary-container/40 text-on-tertiary-container'
                : 'bg-secondary-container/40 text-on-secondary-container'
            }`}
          >
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {walkIn ? 'directions_car' : 'person'}
            </span>
            {walkIn ? 'Khách vãng lai' : 'Customer đặt lịch'}
          </span>
          {booking.isBusinessLane && (
            <span className="inline-flex items-center gap-1 rounded-full border border-secondary/30 bg-secondary-container/40 px-3 py-1 text-xs font-semibold text-on-secondary-container">
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                business
              </span>
              Làn doanh nghiệp
            </span>
          )}
        </div>

        {/* Khối 1: Khách hàng */}
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <h4 className="mb-3 text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
            Khách hàng
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] text-on-surface-variant">Họ tên</p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  walkIn ? 'italic text-on-surface-variant' : 'text-on-surface'
                }`}
              >
                {displayName}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-on-surface-variant">Số điện thoại</p>
              <p className="mt-1 font-mono text-sm text-on-surface">{phone}</p>
            </div>
            <div>
              <p className="text-[11px] text-on-surface-variant">User ID</p>
              <p className="mt-1 font-mono text-sm text-on-surface">
                {booking.userId != null && booking.userId !== 0
                  ? booking.userId
                  : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Khối 2: Thông tin booking */}
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <h4 className="mb-3 text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
            Thông tin booking
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] text-on-surface-variant">Biển số</p>
              <p className="mt-1 font-mono text-lg font-semibold uppercase tracking-wide text-secondary">
                {plate && plate !== '—' ? plate : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-on-surface-variant">Dịch vụ</p>
              <p className="mt-1 text-sm font-semibold text-on-surface">{serviceName}</p>
            </div>
            <div>
              <p className="text-[11px] text-on-surface-variant">Giờ hẹn</p>
              <p className="mt-1 font-mono text-sm font-semibold text-on-surface">
                {booking.scheduledTime ? formatDateTime(booking.scheduledTime) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-on-surface-variant">Khung giờ</p>
              <p className="mt-1 font-mono text-sm text-on-surface">{slotLabel}</p>
            </div>
            <div>
              <p className="text-[11px] text-on-surface-variant">Làn xử lý</p>
              <p className="mt-1 text-sm font-semibold text-on-surface">{laneName}</p>
            </div>
            <div>
              <p className="text-[11px] text-on-surface-variant">Hạng khách</p>
              <p className="mt-1 text-sm text-on-surface">
                {booking.rankName && booking.rankName !== '—' ? booking.rankName : '—'}
                {booking.isVip && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-tertiary-container/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-on-tertiary-container">
                    VIP
                  </span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Khối 3: Trạng thái & Thời gian */}
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <h4 className="mb-3 text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
            Trạng thái & Thời gian
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] text-on-surface-variant">Bắt đầu xử lý</p>
              <p className="mt-1 font-mono text-sm text-on-surface">
                {booking.processingStartTime
                  ? formatDateTime(booking.processingStartTime)
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-on-surface-variant">Hoàn thành</p>
              <p className="mt-1 font-mono text-sm text-on-surface">
                {booking.completedTime ? formatDateTime(booking.completedTime) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-on-surface-variant">Thời lượng thực tế</p>
              <p className="mt-1 text-sm font-semibold text-on-surface">
                {booking.actualDurationMinutes
                  ? formatWashDuration(booking.actualDurationMinutes)
                  : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Khối 4: Thanh toán */}
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <h4 className="mb-3 text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
            Thanh toán
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] text-on-surface-variant">Số tiền</p>
              <p className="mt-1 font-sora text-xl font-semibold text-primary">
                {formatVnd(booking.finalAmount ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-on-surface-variant">Trạng thái thanh toán</p>
              <p className="mt-1 text-sm font-semibold text-on-surface">
                {booking.paymentStatus || '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-on-surface-variant">Phương thức</p>
              <p className="mt-1 text-sm text-on-surface">
                {booking.paymentMethod || '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Khối 5: Chi tiết xe (nếu >1) */}
        {hasDetails && (
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <h4 className="mb-3 text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
              Danh sách xe trong booking ({booking.details.length})
            </h4>
            <div className="overflow-x-auto rounded-lg border border-outline-variant">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-low text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Biển số</th>
                    <th className="px-3 py-2">Dịch vụ</th>
                    <th className="px-3 py-2">Tình trạng xe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {booking.details.map((d, i) => (
                    <tr key={d.detailId ?? i}>
                      <td className="px-3 py-2 text-on-surface-variant">{i + 1}</td>
                      <td className="px-3 py-2 font-mono font-semibold uppercase text-secondary">
                        {d.licensePlate && d.licensePlate !== '—' ? d.licensePlate : '—'}
                      </td>
                      <td className="px-3 py-2 text-on-surface">
                        {d.serviceName && d.serviceName !== '—' ? d.serviceName : '—'}
                      </td>
                      <td className="px-3 py-2 text-on-surface">
                        {d.vehicleCondition && d.vehicleCondition !== '—'
                          ? d.vehicleCondition
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <p className="text-center text-[11px] italic text-on-surface-variant">
          Manager chỉ xem thông tin. Không có thao tác chỉnh sửa booking tại đây.
        </p>
      </div>
    </FormModal>
  )
}
