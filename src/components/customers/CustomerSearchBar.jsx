export default function CustomerSearchBar({ search, onSearchChange, resultCount }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="input-focus-glow group relative w-full sm:max-w-md">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary">
          <span className="material-symbols-outlined text-[22px]">search</span>
        </span>
        <input
          className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pr-4 pl-11 text-base text-on-surface outline-none placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder="Tìm theo tên, SĐT, email, biển số..."
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <p className="text-sm text-on-surface-variant">
        <span className="font-semibold text-on-surface">{resultCount}</span> khách hàng
      </p>
    </div>
  )
}
