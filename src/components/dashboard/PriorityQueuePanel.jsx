import { priorityQueue } from '../../data/mockDashboard'

export default function PriorityQueuePanel({ selectedBookingId, onSelectVehicle }) {
  return (
    <section className="dashboard-queue-panel glass-panel soft-shadow flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">format_list_numbered</span>
          <h3 className="font-sora text-2xl font-semibold text-on-surface">Hàng chờ ưu tiên</h3>
        </div>
        <span className="rounded bg-surface-variant px-2 py-1 text-xs font-semibold text-on-surface-variant">
          {priorityQueue.length} xe đang đợi
        </span>
      </div>

      <div className="dashboard-queue-list flex flex-col gap-3 overflow-y-auto p-3">
        {priorityQueue.map((item) => (
          <QueueItem
            key={item.bookingId}
            item={item}
            isSelected={item.bookingId === selectedBookingId}
            onSelect={() => onSelectVehicle(item.bookingId)}
          />
        ))}
      </div>
    </section>
  )
}

function QueueItem({ item, isSelected, onSelect }) {
  const isVip = item.rankName === 'VIP' || item.rankId >= 4

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex w-full shrink-0 cursor-pointer items-center gap-4 overflow-hidden rounded-lg border p-3 text-left transition-colors hover:bg-surface-bright ${
        isSelected
          ? 'border-primary-container bg-surface-container-lowest shadow-sm'
          : 'border-outline-variant bg-surface-container-lowest opacity-70 hover:opacity-100'
      }`}
    >
      {isSelected && <div className="absolute top-0 bottom-0 left-0 w-1 bg-primary-container" />}

      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded border ${
          isSelected
            ? 'border-primary-container/30 bg-surface-container-low'
            : 'border-outline-variant bg-surface-container-low'
        }`}
      >
        <span
          className={`material-symbols-outlined text-3xl ${
            isSelected ? 'text-primary-container' : 'text-on-surface-variant'
          }`}
        >
          {item.icon ?? 'directions_car'}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span
            className={
              isSelected
                ? 'font-sora text-2xl tracking-wide text-primary-container'
                : 'text-lg tracking-wide text-on-surface'
            }
          >
            {item.licensePlate}
          </span>
          <span className="shrink-0 text-xs font-semibold text-on-surface-variant">{item.waitLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded border px-2 py-[2px] text-[10px] font-semibold uppercase ${
              isVip
                ? 'border-primary-container/30 bg-primary-container/10 text-primary-container'
                : 'border-outline-variant bg-surface-variant text-on-surface-variant'
            }`}
          >
            {item.rankName}
          </span>
          <span className="text-base text-on-surface-variant">{item.note}</span>
        </div>
      </div>

      <span className="material-symbols-outlined shrink-0 text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100">
        chevron_right
      </span>
    </button>
  )
}
