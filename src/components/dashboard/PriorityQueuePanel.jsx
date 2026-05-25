import { priorityQueue } from '../../data/mockDashboard'

export default function PriorityQueuePanel() {
  return (
    <section className="glass-panel soft-shadow flex flex-grow flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">format_list_numbered</span>
          <h3 className="font-headline-md text-2xl font-semibold text-on-surface">
            Hàng chờ ưu tiên
          </h3>
        </div>
        <span className="rounded bg-surface-variant px-2 py-1 font-label-sm text-[12px] font-semibold text-on-surface-variant">
          {priorityQueue.length} xe đang đợi
        </span>
      </div>

      <div className="flex flex-grow flex-col gap-3 overflow-y-auto p-3">
        {priorityQueue.map((item) => (
          <QueueItem key={item.bookingId} item={item} />
        ))}
      </div>
    </section>
  )
}

function QueueItem({ item }) {
  const isVip = item.rankName === 'VIP' || item.rankId >= 4
  const plateClass = item.isActive
    ? 'font-headline-md text-2xl tracking-wide text-primary-container'
    : 'font-body-lg text-lg tracking-wide text-on-surface'

  return (
    <div
      className={`relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-lg border p-3 transition-colors hover:bg-surface-bright ${
        item.isActive
          ? 'border-primary-container bg-surface-container-lowest shadow-sm'
          : 'border-outline-variant bg-surface-container-lowest opacity-70 hover:opacity-100'
      } group`}
    >
      {item.isActive && (
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-primary-container" />
      )}
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded border ${
          item.isActive ? 'border-primary-container/30 bg-surface-container-low' : 'border-outline-variant bg-surface-container-low'
        }`}
      >
        <span
          className={`material-symbols-outlined text-3xl ${
            item.isActive ? 'text-primary-container' : 'text-on-surface-variant'
          }`}
        >
          {item.icon ?? 'directions_car'}
        </span>
      </div>
      <div className="flex-grow">
        <div className="mb-1 flex items-center justify-between">
          <span className={plateClass}>{item.licensePlate}</span>
          <span className="font-label-sm text-[12px] font-semibold text-on-surface-variant">
            {item.waitLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded border px-2 py-[2px] font-label-bold text-[10px] uppercase ${
              isVip
                ? 'border-primary-container/30 bg-primary-container/10 text-primary-container'
                : 'border-outline-variant bg-surface-variant text-on-surface-variant'
            }`}
          >
            {item.rankName}
          </span>
          <span className="font-body-md text-base text-on-surface-variant">{item.note}</span>
        </div>
        <p className="mt-0.5 font-label-sm text-[11px] text-outline">
          {item.serviceName} · {item.status}
        </p>
      </div>
      <span className="material-symbols-outlined text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100">
        chevron_right
      </span>
    </div>
  )
}
