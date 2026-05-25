import { formatVnd } from '../../utils/format'

export default function CustomerDetailPanel({ customer }) {
  if (!customer) {
    return (
      <div className="glass-panel soft-shadow flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
        <span className="material-symbols-outlined mb-3 text-5xl text-outline">person_search</span>
        <p className="font-sora text-lg font-semibold text-on-surface">Chọn khách hàng</p>
        <p className="mt-1 text-sm text-on-surface-variant">
          Tìm và chọn một khách để xem hồ sơ, xe đăng ký và ví.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-panel soft-shadow metallic-edge overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="border-b border-outline-variant bg-surface-container-low p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <img
            alt={customer.fullName}
            className="h-20 w-20 shrink-0 rounded-full border-2 border-primary-container object-cover"
            src={customer.avatar}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-sora text-2xl font-semibold text-on-surface">{customer.fullName}</h2>
              <span className="rounded-full border border-primary-container/50 bg-primary-container px-3 py-1 text-xs font-semibold uppercase text-on-primary">
                {customer.rankName}
              </span>
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">
              User #{customer.userId} · Profile #{customer.profileId}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  customer.userStatus === 'Active'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-error-container/30 text-error'
                }`}
              >
                {customer.userStatus}
              </span>
              <span className="rounded-full bg-surface-variant px-3 py-1 text-xs text-on-surface-variant">
                Hệ số điểm ×{customer.pointMultiplier}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <InfoBlock icon="call" label="Số điện thoại" value={customer.phoneNumber} />
        <InfoBlock icon="mail" label="Email" value={customer.email} />
        <InfoBlock icon="home" label="Địa chỉ" value={customer.address} className="sm:col-span-2" />
        <InfoBlock icon="stars" label="Điểm tích lũy" value={customer.userScore.toLocaleString('vi-VN')} />
        <InfoBlock icon="account_balance_wallet" label="Ví (Wallet)" value={formatVnd(customer.walletBalance)} />
        <InfoBlock icon="local_car_wash" label="Lần rửa" value={`${customer.totalWashes} lượt`} />
        <InfoBlock icon="event" label="Lần ghé gần nhất" value={customer.lastVisitDisplay} />
      </div>

      <div className="border-t border-outline-variant p-6">
        <h3 className="mb-3 flex items-center gap-2 font-sora text-lg font-semibold text-on-surface">
          <span className="material-symbols-outlined text-primary">directions_car</span>
          Xe đăng ký (Vehicles)
        </h3>
        <div className="space-y-2">
          {customer.vehicles.map((v) => (
            <div
              key={v.licensePlate}
              className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3"
            >
              <div>
                <p className="font-sora text-lg font-semibold tracking-wide text-primary-container">
                  {v.licensePlate}
                </p>
                <p className="text-sm text-on-surface-variant">
                  {v.displayName} · {v.vehicleType}
                </p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">badge</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ icon, label, value, className = '' }) {
  return (
    <div className={`rounded-lg bg-surface-container-low p-4 ${className}`}>
      <div className="mb-1 flex items-center gap-1 text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
        {label}
      </div>
      <p className="text-sm font-medium text-on-surface">{value}</p>
    </div>
  )
}
