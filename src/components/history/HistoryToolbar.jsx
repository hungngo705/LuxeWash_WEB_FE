const BOOKING_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'Completed', label: 'Completed' },
  { id: 'Cancelled', label: 'Cancelled' },
]

const TX_FILTERS = [
  { id: 'all', label: 'Mọi TT thanh toán' },
  { id: 'Success', label: 'Success' },
  { id: 'Failed', label: 'Failed' },
  { id: 'Refunded', label: 'Refunded' },
]

export default function HistoryToolbar({
  bookingFilter,
  onBookingFilterChange,
  txFilter,
  onTxFilterChange,
  search,
  onSearchChange,
  resultCount,
}) {
  return (
    <div className="mb-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {BOOKING_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onBookingFilterChange(f.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              bookingFilter === f.id
                ? 'bg-primary text-on-primary'
                : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {TX_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onTxFilterChange(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                txFilter === f.id
                  ? 'bg-primary-container/20 text-primary-container ring-1 ring-primary-container/40'
                  : 'border border-outline-variant/60 text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="input-focus-glow group relative w-full sm:w-72">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input
              className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pr-4 pl-10 text-sm text-on-surface outline-none placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Biển số, khách hàng..."
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <span className="text-sm text-on-surface-variant">{resultCount} kết quả</span>
        </div>
      </div>
    </div>
  )
}
