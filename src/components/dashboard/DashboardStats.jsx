import { dashboardStats } from '../../data/mockDashboard'

function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function DashboardStats() {
  const cards = [
    {
      label: 'Hàng chờ',
      value: dashboardStats.queueCount,
      suffix: 'xe',
      icon: 'format_list_numbered',
      color: 'text-primary-container',
    },
    {
      label: 'Check-in hôm nay',
      value: dashboardStats.checkedInToday,
      suffix: 'lượt',
      icon: 'login',
      color: 'text-tertiary-container',
    },
    {
      label: 'Hoàn thành',
      value: dashboardStats.completedToday,
      suffix: 'lượt',
      icon: 'check_circle',
      color: 'text-primary',
    },
    {
      label: 'Doanh thu hôm nay',
      value: formatVnd(dashboardStats.revenueTodayVnd),
      suffix: '',
      icon: 'payments',
      color: 'text-on-surface',
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
            <span className={`material-symbols-outlined ${card.color}`}>{card.icon}</span>
          </div>
          <div>
            <p className="font-label-sm text-[12px] font-semibold tracking-wider text-on-surface-variant uppercase">
              {card.label}
            </p>
            <p className={`font-headline-md text-2xl font-semibold ${card.color}`}>
              {card.isText ? card.value : card.value}
              {!card.isText && (
                <span className="ml-1 font-body-md text-base font-normal text-on-surface-variant">
                  {card.suffix}
                </span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
