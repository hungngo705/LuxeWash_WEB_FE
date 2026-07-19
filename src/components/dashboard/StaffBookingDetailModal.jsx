import { useEffect, useState } from 'react'
import { enrichStaffBooking, fetchUserById, formatPaymentMethodLabel } from '../../api'
import { mapUserDetailToCustomerView } from '../../api/staff.customers.api'
import WashTelemetry from '../shared/WashTelemetry'
import { formatDateTime, formatVnd } from '../../utils/format'

function DetailRow({ label, value }) {
  const display = value == null || value === '' || value === '—' ? '—' : value
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
        {label}
      </dt>
      <dd className="text-sm text-on-surface sm:text-right">{display}</dd>
    </div>
  )
}

export default function StaffBookingDetailModal({ booking, onClose }) {
  const [displayBooking, setDisplayBooking] = useState(booking)
  const [loadingDetail, setLoadingDetail] = useState(true)
  const [customerExtra, setCustomerExtra] = useState(null)
  const [loadingExtra, setLoadingExtra] = useState(false)

  useEffect(() => {
    if (!booking) return
    const controller = new AbortController()
    let cancelled = false
    setDisplayBooking(booking)
    setLoadingDetail(true)
    enrichStaffBooking(booking, { allowStandaloneFetch: true, signal: controller.signal })
      .then((enriched) => {
        if (!cancelled) setDisplayBooking(enriched)
      })
      .catch(() => {
        // ignore abort / optional fetch failures
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [booking])

  useEffect(() => {
    const userId = displayBooking?.userId
    if (!userId) {
      setCustomerExtra(null)
      return
    }
    const controller = new AbortController()
    let cancelled = false
    setLoadingExtra(true)
    fetchUserById(userId, { signal: controller.signal })
      .then((data) => {
        if (!cancelled) setCustomerExtra(mapUserDetailToCustomerView(data))
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || err?.name === 'CanceledError') return
        if (!cancelled) setCustomerExtra(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingExtra(false)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [displayBooking?.userId])

  if (!booking || !displayBooking) return null

  const rankLabel = customerExtra?.rankName ?? displayBooking.rankName
  const phoneLabel = customerExtra?.phoneMasked ?? displayBooking.phoneMasked
  const customerName = customerExtra?.fullName ?? displayBooking.customerName
  const walletBalance = customerExtra?.walletBalance
  const userScore = customerExtra?.userScore
  const vehicles = customerExtra?.vehicles?.length
    ? customerExtra.vehicles
    : [
        {
          licensePlate: displayBooking.licensePlate,
          vehicleType: displayBooking.vehicleType,
          displayName: displayBooking.vehicleDisplayName,
        },
      ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-panel soft-shadow max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-lowest"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-booking-detail-title"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-6 py-4">
          <div>
            <h2 id="staff-booking-detail-title" className="font-sora text-xl font-semibold text-on-surface">
              Chi tiết lịch hẹn #{displayBooking.bookingId}
            </h2>
            <p className="mt-0.5 text-sm text-on-surface-variant">{displayBooking.licensePlate}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-variant"
            onClick={onClose}
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loadingDetail && (
          <p className="border-b border-outline-variant px-6 py-2 text-xs text-on-surface-variant">
            Đang tải chi tiết từ hệ thống…
          </p>
        )}

        <div className="space-y-6 p-6">
          <section>
            <h3 className="mb-3 font-sora text-sm font-semibold tracking-wide text-primary uppercase">
              Khách hàng
            </h3>
            <dl className="space-y-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <DetailRow label="Họ tên" value={customerName} />
              <DetailRow label="Số điện thoại" value={phoneLabel} />
              <DetailRow label="Hạng thành viên" value={rankLabel} />
              {loadingExtra && (
                <p className="text-xs text-on-surface-variant">Đang tải thêm thông tin khách…</p>
              )}
              {userScore != null && userScore > 0 && (
                <DetailRow label="Điểm tích lũy" value={userScore.toLocaleString('vi-VN')} />
              )}
              {walletBalance != null && walletBalance > 0 && (
                <DetailRow label="Số dư ví" value={formatVnd(walletBalance)} />
              )}
              {displayBooking.lastVisitDate && (
                <DetailRow
                  label="Lần rửa gần nhất"
                  value={formatDateTime(displayBooking.lastVisitDate)}
                />
              )}
            </dl>
          </section>

          <WashTelemetry booking={displayBooking} />

          <section>
            <h3 className="mb-3 font-sora text-sm font-semibold tracking-wide text-primary uppercase">
              Xe & dịch vụ
            </h3>
            <dl className="space-y-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <DetailRow label="Biển số" value={displayBooking.licensePlate} />
              <DetailRow
                label="Loại xe"
                value={
                  displayBooking.vehicleDisplayName !== '—'
                    ? `${displayBooking.vehicleDisplayName}${displayBooking.vehicleType !== '—' ? ` (${displayBooking.vehicleType})` : ''}`
                    : displayBooking.vehicleType
                }
              />
              <DetailRow label="Dịch vụ" value={displayBooking.serviceName} />
              <DetailRow label="Khung giờ" value={displayBooking.slotLabel} />
              <DetailRow label="Thời gian hẹn" value={formatDateTime(displayBooking.scheduledTime)} />
              <DetailRow label="Trạng thái" value={displayBooking.status} />
              {displayBooking.branchName && (
                <DetailRow label="Chi nhánh" value={displayBooking.branchName} />
              )}
              {displayBooking.processingLaneName && (
                <DetailRow label="Làn rửa" value={displayBooking.processingLaneName} />
              )}
            </dl>
          </section>

          <section>
            <h3 className="mb-3 font-sora text-sm font-semibold tracking-wide text-primary uppercase">
              Thanh toán
            </h3>
            <dl className="space-y-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
              {displayBooking.originalAmount > 0 &&
                displayBooking.originalAmount !== displayBooking.finalAmount && (
                  <DetailRow
                    label="Giá gốc"
                    value={formatVnd(displayBooking.originalAmount)}
                  />
                )}
              <DetailRow
                label="Tổng thanh toán"
                value={displayBooking.finalAmount ? formatVnd(displayBooking.finalAmount) : '—'}
              />
              {displayBooking.discountAmount > 0 && (
                <DetailRow label="Giảm giá" value={formatVnd(displayBooking.discountAmount)} />
              )}
              <DetailRow
                label="Hình thức thanh toán"
                value={formatPaymentMethodLabel(displayBooking.paymentMethod)}
              />
              {displayBooking.paymentStatus !== '—' && (
                <DetailRow label="Trạng thái thanh toán" value={displayBooking.paymentStatus} />
              )}
              {displayBooking.fallbackQrCode !== '—' && (
                <DetailRow label="Mã QR dự phòng" value={displayBooking.fallbackQrCode} />
              )}
            </dl>
          </section>

          {displayBooking.details.length > 0 && (
            <section>
              <h3 className="mb-3 font-sora text-sm font-semibold tracking-wide text-primary uppercase">
                Chi tiết từng xe
              </h3>
              <div className="overflow-hidden rounded-xl border border-outline-variant">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                    <tr>
                      <th className="px-4 py-2">Biển số</th>
                      <th className="px-4 py-2">Dịch vụ</th>
                      <th className="px-4 py-2">Tình trạng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayBooking.details.map((d) => (
                      <tr key={d.detailId} className="border-t border-outline-variant/60">
                        <td className="px-4 py-3 font-medium text-on-surface">{d.licensePlate}</td>
                        <td className="px-4 py-3 text-on-surface">{d.serviceName}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{d.vehicleCondition}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {vehicles.some((v) => v.licensePlate && v.licensePlate !== '—') && (
            <section>
              <h3 className="mb-3 font-sora text-sm font-semibold tracking-wide text-primary uppercase">
                Garage khách hàng
              </h3>
              <ul className="space-y-2">
                {vehicles.map((v) => (
                  <li
                    key={v.licensePlate}
                    className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm"
                  >
                    <span className="font-semibold text-on-surface">{v.licensePlate}</span>
                    <span className="text-on-surface-variant">
                      {' '}
                      — {v.displayName || v.vehicleType}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="border-t border-outline-variant px-6 py-4">
          <button
            type="button"
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold tracking-wide text-on-primary uppercase"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
