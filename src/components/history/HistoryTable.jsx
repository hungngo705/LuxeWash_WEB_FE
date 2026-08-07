import { formatVnd } from '../../utils/format'

function BookingStatusBadge({ status }) {
  const completed = status === 'Completed'
  const labels = {
    Completed: 'Hoàn thành',
    Cancelled: 'Đã hủy',
    'No-show': 'Vắng mặt',
  }
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${
        completed
          ? 'bg-primary-container/15 text-primary-container'
          : 'bg-surface-variant text-on-surface-variant'
      }`}
    >
      {labels[status] ?? status}
    </span>
  )
}

function TxStatusBadge({ status }) {
  const styles = {
    Success: 'bg-primary/15 text-primary',
    Failed: 'bg-error-container/30 text-error',
    Refunded: 'bg-tertiary-container/15 text-tertiary-container',
  }
  const labels = {
    Success: 'Thành công',
    Failed: 'Thất bại',
    Refunded: 'Đã hoàn tiền',
  }
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${styles[status] ?? ''}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default function HistoryTable({ records, onViewImages }) {
  if (records.length === 0) {
    return (
      <div className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-12 text-center">
        <span className="material-symbols-outlined mb-3 text-5xl text-outline">history</span>
        <p className="font-sora text-lg font-semibold text-on-surface">Không có dữ liệu lịch sử</p>
      </div>
    )
  }

  return (
    <div className="glass-panel soft-shadow overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              <th className="px-4 py-3">Mã GD</th>
              <th className="px-4 py-3">Biển số</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Dịch vụ</th>
              <th className="px-4 py-3">Hoàn tất</th>
              <th className="px-4 py-3">Thanh toán</th>
              <th className="px-4 py-3">Điểm</th>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Giao dịch</th>
              <th className="px-4 py-3 text-center">Ảnh</th>
            </tr>
          </thead>
          <tbody>
            {records.map((row) => (
              <tr
                key={row.transactionId}
                className="border-b border-outline-variant/60 transition-colors last:border-0 hover:bg-surface-container-low/80"
              >
                <td className="px-4 py-4 text-sm font-medium text-on-surface">#{row.transactionId}</td>
                <td className="px-4 py-4">
                  <p className="font-sora text-lg font-semibold text-on-surface">{row.licensePlate}</p>
                  <p className="text-xs text-on-surface-variant">{row.vehicleDisplay}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium text-on-surface">{row.customerName}</p>
                  <p className="text-xs text-on-surface-variant">{row.phoneMasked}</p>
                </td>
                <td className="px-4 py-4 text-sm text-on-surface">{row.serviceName}</td>
                <td className="px-4 py-4 text-sm text-on-surface">{row.completedDisplay}</td>
                <td className="px-4 py-4 font-medium text-on-surface">
                  {row.totalAmount > 0 ? formatVnd(row.totalAmount) : '—'}
                </td>
                <td className="px-4 py-4 text-xs text-on-surface-variant">
                  <span className="block">−{row.pointsUsed} / +{row.pointsEarned}</span>
                </td>
                <td className="px-4 py-4">
                  <BookingStatusBadge status={row.bookingStatus} />
                </td>
                <td className="px-4 py-4">
                  <TxStatusBadge status={row.transactionStatus} />
                </td>
                <td className="px-4 py-4 text-center">
                  {row.checkInImageUrl || row.checkOutImageUrl ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                      onClick={() => onViewImages?.(row)}
                    >
                      <span className="material-symbols-outlined text-[17px]">photo_library</span>
                      Xem ảnh
                    </button>
                  ) : (
                    <span className="text-xs text-on-surface-variant">Chưa có ảnh</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
