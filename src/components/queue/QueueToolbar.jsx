const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Checked-in', label: 'Checked-in' },
]

export default function QueueToolbar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  resultCount,
}) {
  return (
    <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilterChange(f.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.id
                ? 'bg-primary text-on-primary shadow-sm'
                : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
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
            placeholder="Tìm biển số, tên khách..."
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <span className="text-sm text-on-surface-variant">
          {resultCount} kết quả
        </span>
      </div>
    </div>
  )
}
