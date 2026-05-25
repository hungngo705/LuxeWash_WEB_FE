export default function QueueStats({ stats, avgWaitMinutes }) {
  const cards = [
    {
      label: 'Tổng hàng đợi',
      value: stats.total,
      suffix: 'xe',
      icon: 'format_list_numbered',
      accent: 'text-primary',
    },
    {
      label: 'Chờ xử lý',
      value: stats.pending,
      suffix: 'Pending',
      icon: 'schedule',
      accent: 'text-tertiary-container',
    },
    {
      label: 'Đã check-in',
      value: stats.checkedIn,
      suffix: 'Checked-in',
      icon: 'login',
      accent: 'text-primary-container',
    },
    {
      label: 'Thời gian chờ TB',
      value: `${avgWaitMinutes} phút`,
      suffix: '',
      icon: 'timer',
      accent: 'text-on-surface',
      isText: true,
    },
  ]

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="glass-panel soft-shadow flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container-low">
            <span className={`material-symbols-outlined ${card.accent}`}>{card.icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              {card.label}
            </p>
            <p className={`font-sora text-2xl font-semibold ${card.accent}`}>
              {card.isText ? card.value : card.value}
              {!card.isText && card.suffix && (
                <span className="ml-1 text-sm font-normal text-on-surface-variant">{card.suffix}</span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
