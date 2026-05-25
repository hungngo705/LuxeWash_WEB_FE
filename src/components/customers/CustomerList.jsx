import { formatVnd } from '../../utils/format'

export default function CustomerList({ customers, selectedUserId, onSelect }) {
  if (customers.length === 0) {
    return (
      <div className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
        <span className="material-symbols-outlined mb-2 text-4xl text-outline">person_off</span>
        <p className="text-sm text-on-surface-variant">Không tìm thấy khách hàng.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {customers.map((c) => {
        const selected = c.userId === selectedUserId
        return (
          <button
            key={c.userId}
            type="button"
            onClick={() => onSelect(c.userId)}
            className={`w-full rounded-xl border p-4 text-left transition-all ${
              selected
                ? 'border-primary-container bg-primary-container/5 shadow-sm'
                : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low'
            }`}
          >
            <div className="flex items-center gap-3">
              <img
                alt=""
                className="h-12 w-12 shrink-0 rounded-full border-2 border-outline-variant object-cover"
                src={c.avatar}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-semibold text-on-surface">{c.fullName}</p>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      c.userStatus === 'Active'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-error-container/30 text-error'
                    }`}
                  >
                    {c.userStatus}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">{c.phoneMasked}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded border border-primary-container/30 bg-primary-container/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-container">
                    {c.rankName}
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {c.vehicles.length} xe · {formatVnd(c.walletBalance)}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined shrink-0 text-on-surface-variant">chevron_right</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
