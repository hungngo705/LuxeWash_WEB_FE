import { formatVnd } from '../../utils/format'

export default function HistoryStats({ stats }) {
  const cards = [
    { label: 'Tổng lượt', value: stats.total, suffix: 'lượt', icon: 'history', accent: 'text-primary' },
    {
      label: 'Hoàn thành',
      value: stats.completed,
      suffix: 'Completed',
      icon: 'check_circle',
      accent: 'text-primary-container',
    },
    {
      label: 'Đã hủy',
      value: stats.cancelled,
      suffix: 'Cancelled',
      icon: 'cancel',
      accent: 'text-on-surface-variant',
    },
    {
      label: 'Doanh thu (Success)',
      value: formatVnd(stats.revenue),
      isText: true,
      icon: 'payments',
      accent: 'text-on-surface',
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
            <p className={`font-sora text-xl font-semibold sm:text-2xl ${card.accent}`}>
              {card.value}
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
