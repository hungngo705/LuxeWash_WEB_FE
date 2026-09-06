import FormModal from '../../admin/shared/FormModal'
import { formatDayFull } from '../../../utils/week'
import {
  isOccupying,
  sortBookingsForDisplay,
} from './WeeklyScheduleGrid'

const STATUS_LABELS = {
  Pending: 'Chờ xác nhận',
  CheckedIn: 'Đã check-in',
  Processing: 'Đang rửa',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã huỷ',
  NoShow: 'Không đến',
}

function statusLabel(status) {
  return STATUS_LABELS[status] ?? status ?? '—'
}

function statusClass(status) {
  switch (status) {
    case 'Pending':
      return 'border-outline-variant bg-surface-container-low text-on-surface-variant'
    case 'CheckedIn':
      return 'border-secondary/40 bg-secondary-container/40 text-on-secondary-container'
    case 'Processing':
      return 'border-primary/40 bg-primary-container/40 text-on-primary-container'
    case 'Completed':
      return 'border-tertiary/40 bg-tertiary/10 text-tertiary'
    default:
      return 'border-outline-variant bg-surface-container-low text-on-surface-variant'
  }
}

function shortTime(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

/**
 * Panel chi tiết 1 ô (read-only). Hiển thị:
 *   - Tên slot + ngày
 *   - used/max + busyLanes/totalLanes
 *   - Danh sách booking (mọi status — Manager Lịch đặt chỉ xem)
 *   - Banner cảnh báo nếu slot đầy (giữ nguyên cho manager quyết định nhân viên)
 *
 * Props:
 *   - open: boolean
 *   - cell: { date, slot, cellState, bookings, busyLanes, totalLanes, used, max } | null
 *   - onClose()
 *   - onBookingClick(booking) (optional): nếu truyền thì <li> clickable → mở detail
 */
export default function SlotDetailPanel({ open, cell, onClose, onBookingClick }) {
  if (!cell) {
    return <FormModal open={open} title="Chi tiết khung giờ" onClose={onClose} />
  }

  const {
    date,
    slot,
    cellState,
    bookings = [],
    busyLanes = 0,
    totalLanes = 0,
    used = 0,
    max = 0,
  } = cell

  const slotLabel = `${shortTime(slot.startTime)} – ${shortTime(slot.endTime)}`
  const isFull = cellState === 'current-full' || (max > 0 && used >= max)

  return (
    <FormModal
      open={open}
      title={`${slotLabel} • ${formatDayFull(date)}`}
      submitLabel="Đóng"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault()
        onClose?.()
      }}
      size="lg"
    >
      <div className="space-y-4">
        {/* Banner cảnh báo - chỉ giữ "slot đầy" cho manager quyết định
            có nhận thêm walk-in không. Bỏ banner isPast/isFuture: Manager Lịch
            đặt chỉ xem, không có hành động nào phụ thuộc quá khứ/tương lai. */}
        {isFull && (
          <div className="flex items-start gap-2 rounded-lg border border-error/40 bg-error-container/30 px-4 py-3">
            <span className="material-symbols-outlined text-error">block</span>
            <div>
              <p className="text-sm font-semibold text-error">
                Khung giờ đã đầy
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Sức chứa tối đa ({max}) đã được lấp đầy. Manager không thể tạo thêm
                walk-in cho khung giờ này (BE sẽ từ chối).
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
            <p className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
              Công suất
            </p>
            <p className="mt-1 text-2xl font-semibold text-on-surface">
              {used}
              <span className="text-sm font-normal text-on-surface-variant"> / {max}</span>
            </p>
            <p className="mt-1 text-xs text-on-surface-variant">booking đang chiếm chỗ</p>
          </div>
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
            <p className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
              Làn đang bận
            </p>
            <p className="mt-1 text-2xl font-semibold text-on-surface">
              {busyLanes}
              <span className="text-sm font-normal text-on-surface-variant">
                {' '}
                / {totalLanes}
              </span>
            </p>
            <p className="mt-1 text-xs text-on-surface-variant">tổng số làn của chi nhánh</p>
          </div>
        </div>

        {/* Booking list */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-on-surface">
            Booking trong khung giờ ({bookings.length})
          </h4>

          {bookings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest py-8 text-center">
              <span className="material-symbols-outlined text-3xl text-outline">
                event_available
              </span>
              <p className="mt-2 text-sm text-on-surface-variant">
                Không có booking nào trong khung giờ này.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {sortBookingsForDisplay(bookings).map((b) => {
                const occupying = isOccupying(b)
                return (
                  <li
                    key={b.bookingId}
                    onClick={() => onBookingClick?.(b)}
                    className={`flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 sm:flex-row sm:items-center sm:justify-between ${
                      onBookingClick ? 'cursor-pointer hover:bg-surface-container' : ''
                    } ${occupying ? '' : 'opacity-70'}`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`font-mono text-sm font-semibold ${
                          occupying
                            ? 'text-on-surface'
                            : 'text-on-surface-variant line-through'
                        }`}
                      >
                        {b.licensePlate}
                      </span>
                      <span className="text-xs text-on-surface-variant">
                        {b.customerName && b.customerName !== '—'
                          ? b.customerName
                          : 'Khách vãng lai'}
                        {b.serviceName && b.serviceName !== '—' && ` • ${b.serviceName}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {b.processingLaneName && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-secondary-container/30 px-2 py-0.5 text-[11px] font-medium text-on-secondary-container">
                          <span
                            className="material-symbols-outlined text-[12px]"
                            style={{ fontVariationSettings: "'FILL' 0" }}
                          >
                            garage
                          </span>
                          {b.processingLaneName}
                        </span>
                      )}
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${statusClass(
                          b.status,
                        )}`}
                      >
                        {statusLabel(b.status)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </FormModal>
  )
}
