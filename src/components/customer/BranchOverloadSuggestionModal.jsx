import { useEffect } from 'react'

export default function BranchOverloadSuggestionModal({
  isOpen,
  onClose,
  currentBranchName,
  currentOccupancyRate,
  suggestedAlternative,
  incentiveVoucher,
  onAcceptSwitch,
  onKeepCurrent,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !suggestedAlternative) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl">
        {/* Warning Header */}
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-error-container/20">
            <span className="material-symbols-outlined text-3xl text-error">warning</span>
          </div>
          <div className="flex-1">
            <h3 className="font-sora text-xl font-bold text-error">
              Chi nhánh đang rất đông!
            </h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              <strong>{currentBranchName}</strong> hiện đang kín lịch{' '}
              <strong>{Math.round(currentOccupancyRate * 100)}%</strong>. Thời gian chờ có thể kéo dài.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Suggestion Card */}
        <div className="mb-6 rounded-xl border border-secondary/30 bg-secondary/10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">lightbulb</span>
            <h4 className="font-semibold text-on-surface">Gợi ý chi nhánh thay thế</h4>
          </div>

          <div className="space-y-2">
            <p className="text-lg font-bold text-on-surface">
              {suggestedAlternative.branchName}
            </p>
            <p className="text-sm text-on-surface-variant">
              📍 {suggestedAlternative.address}
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary">navigation</span>
                <span className="text-sm font-semibold text-on-surface">
                  Chỉ cách {suggestedAlternative.distanceKm} km
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary">bar_chart</span>
                <span className="text-sm font-semibold text-on-surface">
                  Chỉ mới {Math.round(suggestedAlternative.occupancyRate * 100)}% công suất
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary">event_available</span>
                <span className="text-sm font-semibold text-on-surface">
                  {suggestedAlternative.availableSlotsCount} khung giờ trống
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Incentive Voucher Card */}
        {incentiveVoucher && (
          <div className="mb-6 rounded-xl border-2 border-primary bg-primary/10 p-5">
            <div className="flex items-start gap-3">
              <span className="text-4xl">🎁</span>
              <div className="flex-1">
                <div className="mb-2 inline-block rounded-full bg-primary px-3 py-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-on-primary">
                    Ưu đãi đặc biệt
                  </span>
                </div>
                <p className="mb-2 text-lg font-bold text-primary">
                  TẶNG NGAY VOUCHER GIẢM {incentiveVoucher.discountPercentage}%
                </p>
                <p className="mb-2 font-mono text-sm font-bold text-primary">
                  Mã: {incentiveVoucher.voucherCode}
                </p>
                <p className="mb-1 text-sm text-on-surface-variant">
                  {incentiveVoucher.description}
                </p>
                <p className="text-xs text-on-surface-variant">
                  ⏰ Có hiệu lực trong {incentiveVoucher.expiresInHours} giờ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onAcceptSwitch}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            <span className="material-symbols-outlined">bolt</span>
            <span>
              Đổi sang {suggestedAlternative.branchName}
              {incentiveVoucher && ` & Nhận giảm ${incentiveVoucher.discountPercentage}%`}
            </span>
          </button>
          <button
            onClick={onKeepCurrent}
            className="rounded-lg border border-outline-variant px-6 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-variant"
          >
            Vẫn giữ chi nhánh hiện tại
          </button>
        </div>
      </div>
    </div>
  )
}
