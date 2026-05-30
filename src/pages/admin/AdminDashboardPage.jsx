import { useState } from 'react'
import KpiCard from '../../components/admin/dashboard/KpiCard'
import {
  adminKpiCards,
  bookingsLast7Days,
  recentActivities,
  topServices,
} from '../../data/mockAdminDashboard'
import { formatVnd } from '../../utils/format'

export default function AdminDashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const maxBookingCount = Math.max(...bookingsLast7Days.map((d) => d.count))

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1)
    window.alert('Đã làm mới dữ liệu (mock)')
  }

  return (
    <div className="w-full" key={refreshKey}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-sora text-2xl font-semibold text-on-surface">Dashboard</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            KPI vận hành & loyalty overview — BR-07
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-variant"
          onClick={handleRefresh}
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
          Làm mới
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {adminKpiCards.map((card) => (
          <KpiCard
            key={card.id}
            label={card.label}
            value={card.value}
            format={card.format}
            icon={card.icon}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <h2 className="font-sora mb-4 text-lg font-semibold text-on-surface">
            Booking 7 ngày gần nhất
          </h2>
          <div className="flex h-48 items-end gap-3">
            {bookingsLast7Days.map((day) => (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-medium text-on-surface">{day.count}</span>
                <div
                  className="w-full rounded-t-lg bg-primary-container transition-all"
                  style={{ height: `${(day.count / maxBookingCount) * 100}%`, minHeight: '8px' }}
                />
                <span className="text-[10px] text-on-surface-variant">{day.date}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <h2 className="font-sora mb-4 text-lg font-semibold text-on-surface">Top dịch vụ</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                  <th className="pb-3 pr-4">Dịch vụ</th>
                  <th className="pb-3 pr-4">Lượt</th>
                  <th className="pb-3">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {topServices.map((row) => (
                  <tr key={row.serviceName}>
                    <td className="py-3 pr-4 font-medium text-on-surface">{row.serviceName}</td>
                    <td className="py-3 pr-4 text-on-surface-variant">{row.count}</td>
                    <td className="py-3 text-on-surface">{formatVnd(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-6 xl:col-span-2">
          <h2 className="font-sora mb-4 text-lg font-semibold text-on-surface">
            Hoạt động gần đây
          </h2>
          <ul className="divide-y divide-outline-variant/60">
            {recentActivities.map((activity) => (
              <li key={activity.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className="material-symbols-outlined mt-0.5 shrink-0 text-primary">
                  {activity.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-on-surface">{activity.message}</p>
                  <p className="text-xs text-on-surface-variant">{activity.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
