export default function CustomerProfilePanel({ detection, autoApprove, onConfirm, onSkip }) {
  const { customer, vehicle } = detection

  return (
    <section className="glass-panel soft-shadow metallic-edge relative shrink-0 grow-0 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-container/5 to-transparent" />
      <h3 className="relative z-10 mb-4 font-sora text-2xl font-semibold text-on-surface">
        Thông tin khách hàng
      </h3>

      <div className="relative z-10 flex items-start gap-4">
        <div className="h-16 w-16 shrink-0 rounded-full border-2 border-primary-container bg-surface-container-highest p-1">
          <img
            alt={customer.fullName}
            className="h-full w-full rounded-full object-cover"
            src={customer.avatar}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-sora text-[32px] leading-10 font-semibold text-on-surface">
                {customer.fullName}
              </h4>
              <p className="mt-1 flex items-center gap-1 text-base text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">call</span>
                {customer.phoneMasked}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-primary-container/50 bg-primary-container px-3 py-1 text-xs font-medium tracking-wider text-on-primary uppercase shadow-[0_2px_10px_rgba(74,169,215,0.2)]">
              <span className="material-symbols-outlined text-[14px]">stars</span>
              {customer.rankName}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-outline-variant/50 pt-3">
            <div>
              <span className="mb-1 block text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Xe đăng ký
              </span>
              <span className="text-base text-on-surface">{vehicle.displayName}</span>
              <span className="mt-0.5 block text-xs text-on-surface-variant">
                {vehicle.licensePlate}
              </span>
            </div>
            <div>
              <span className="mb-1 block text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Lần rửa cuối
              </span>
              <span className="text-base text-on-surface">{customer.lastVisitDisplay}</span>
            </div>
          </div>

          {!autoApprove && (
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-lg bg-primary px-4 py-3 text-center text-sm font-medium tracking-wide text-on-primary uppercase shadow-sm transition-colors hover:bg-primary/90"
                onClick={onConfirm}
              >
                Xác nhận
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-outline bg-transparent px-4 py-3 text-center text-sm font-medium tracking-wide text-on-surface uppercase transition-colors hover:bg-surface-variant"
                onClick={onSkip}
              >
                Bỏ qua
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
