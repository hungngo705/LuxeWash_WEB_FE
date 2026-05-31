import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchDashboardStats } from '../../api'
import KpiCard from '../../components/admin/dashboard/KpiCard'
import { formatVnd } from '../../utils/format'

const EMPTY_DASHBOARD = {
  kpiCards: [],
  bookingsLast7Days: [],
  topServices: [],
  recentActivities: [],
}

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setLoadError('')

    try {
      const data = await fetchDashboardStats()
      setDashboard(data)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    const timer = setInterval(() => loadDashboard(true), 60000)
    return () => clearInterval(timer)
  }, [loadDashboard])

  const maxBookingCount = Math.max(
    ...dashboard.bookingsLast7Days.map((d) => d.count),
    1,
  )

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-sora text-2xl font-semibold text-on-surface">Dashboard</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            KPI vận hành & loyalty overview — BR-07
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-variant disabled:opacity-50"
          disabled={refreshing}
          onClick={() => loadDashboard(true)}
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
          {refreshing ? 'Đang làm mới…' : 'Làm mới'}
        </button>
      </div>

      {loadError && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="rounded-lg border border-error/30 px-3 py-1.5 text-sm font-medium text-error hover:bg-error-container/20"
            onClick={() => loadDashboard(true)}
          >
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải dashboard…</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {dashboard.kpiCards.map((card) => (
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
              {dashboard.bookingsLast7Days.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Chưa có dữ liệu booking.</p>
              ) : (
                <div className="flex h-48 items-end gap-3">
                  {dashboard.bookingsLast7Days.map((day) => (
                    <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-xs font-medium text-on-surface">{day.count}</span>
                      <div
                        className="w-full rounded-t-lg bg-primary-container transition-all"
                        style={{
                          height: `${(day.count / maxBookingCount) * 100}%`,
                          minHeight: day.count > 0 ? '8px' : '0',
                        }}
                      />
                      <span className="text-[10px] text-on-surface-variant">{day.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
              <h2 className="font-sora mb-4 text-lg font-semibold text-on-surface">Top dịch vụ</h2>
              {dashboard.topServices.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Chưa có dữ liệu dịch vụ.</p>
              ) : (
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
                      {dashboard.topServices.map((row) => (
                        <tr key={row.serviceName}>
                          <td className="py-3 pr-4 font-medium text-on-surface">{row.serviceName}</td>
                          <td className="py-3 pr-4 text-on-surface-variant">{row.count}</td>
                          <td className="py-3 text-on-surface">{formatVnd(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-6 xl:col-span-2">
              <h2 className="font-sora mb-4 text-lg font-semibold text-on-surface">
                Hoạt động gần đây
              </h2>
              {dashboard.recentActivities.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Chưa có hoạt động gần đây.</p>
              ) : (
                <ul className="divide-y divide-outline-variant/60">
                  {dashboard.recentActivities.map((activity) => (
                    <li
                      key={activity.id}
                      className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                    >
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
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
