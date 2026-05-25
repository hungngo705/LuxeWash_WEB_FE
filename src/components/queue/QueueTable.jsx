import { formatVnd } from '../../data/mockQueue'

function StatusBadge({ status }) {
  const isPending = status === 'Pending'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${
        isPending
          ? 'border border-tertiary-container/40 bg-tertiary-container/15 text-tertiary-container'
          : 'border border-primary-container/40 bg-primary-container/15 text-primary-container'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isPending ? 'bg-tertiary-container' : 'bg-primary-container'}`}
      />
      {status}
    </span>
  )
}

function RankBadge({ rankName, rankId }) {
  const isVip = rankName.includes('VIP') || rankName === 'VIP' || rankId >= 4
  return (
    <span
      className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${
        isVip
          ? 'border-primary-container/30 bg-primary-container/10 text-primary-container'
          : 'border-outline-variant bg-surface-variant text-on-surface-variant'
      }`}
    >
      {rankName}
    </span>
  )
}

export default function QueueTable({ bookings, onCheckIn, onComplete }) {
  if (bookings.length === 0) {
    return (
      <div className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-12 text-center">
        <span className="material-symbols-outlined mb-3 text-5xl text-outline">directions_car</span>
        <p className="font-sora text-lg font-semibold text-on-surface">Không có xe trong hàng đợi</p>
        <p className="mt-1 text-sm text-on-surface-variant">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
      </div>
    )
  }

  return (
    <div className="glass-panel soft-shadow overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Biển số</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Dịch vụ</th>
              <th className="px-4 py-3">Giờ hẹn</th>
              <th className="px-4 py-3">Làn</th>
              <th className="px-4 py-3">Chờ</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((row, index) => (
              <tr
                key={row.bookingId}
                className="border-b border-outline-variant/60 transition-colors last:border-0 hover:bg-surface-container-low/80"
              >
                <td className="px-4 py-4 text-sm text-on-surface-variant">{index + 1}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-container">directions_car</span>
                    <div>
                      <p className="font-sora text-lg font-semibold tracking-wide text-on-surface">
                        {row.licensePlate}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {row.vehicleDisplay} · {row.vehicleType}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {row.isWalkIn ? (
                    <span className="text-sm italic text-on-surface-variant">Khách vãng lai</span>
                  ) : (
                    <div>
                      <p className="font-medium text-on-surface">{row.customerName}</p>
                      <p className="text-xs text-on-surface-variant">{row.phoneMasked}</p>
                      <div className="mt-1">
                        <RankBadge rankName={row.rankName} rankId={row.rankId} />
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium text-on-surface">{row.serviceName}</p>
                  <p className="text-xs text-on-surface-variant">
                    {formatVnd(row.basePrice)} · {row.durationMinutes} phút
                  </p>
                </td>
                <td className="px-4 py-4 text-sm text-on-surface">{row.scheduledDisplay}</td>
                <td className="px-4 py-4 text-sm text-on-surface-variant">{row.lane}</td>
                <td className="px-4 py-4">
                  <span className="text-sm font-medium text-on-surface">{row.waitMinutes} phút</span>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    {row.status === 'Pending' && (
                      <button
                        type="button"
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold tracking-wide text-on-primary uppercase transition-colors hover:bg-primary/90"
                        onClick={() => onCheckIn(row.bookingId)}
                      >
                        Check-in
                      </button>
                    )}
                    {row.status === 'Checked-in' && (
                      <button
                        type="button"
                        className="rounded-lg border border-primary-container bg-primary-container/10 px-3 py-2 text-xs font-semibold tracking-wide text-primary-container uppercase transition-colors hover:bg-primary-container/20"
                        onClick={() => onComplete(row.bookingId)}
                      >
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
    </div>
  )
}
