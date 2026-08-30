import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchDashboardStats } from '../../api'
import KpiCard from '../../components/admin/dashboard/KpiCard'
import RevenueAnalyticsPanel from '../../components/admin/dashboard/RevenueAnalyticsPanel'
import PageHeader from '../../components/admin/shared/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async dashboard load
    loadDashboard()
    const timer = setInterval(() => loadDashboard(true), 60000)
    return () => clearInterval(timer)
  }, [loadDashboard])

  const maxBookingCount = Math.max(
    ...dashboard.bookingsLast7Days.map((d) => d.count),
    1,
  )

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Tổng quan"
        title="Dashboard"
        description="Theo dõi hoạt động kinh doanh tổng quan"
        actionLabel={refreshing ? 'Đang làm mới…' : 'Làm mới'}
        actionIcon="refresh"
        onAction={() => loadDashboard(true)}
      />

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="rounded-lg border border-error/40 px-3 py-1.5 text-sm font-medium text-error transition-colors hover:bg-error-container/40"
            onClick={() => loadDashboard(true)}
          >
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="lw-card p-5">
                <Skeleton width="60%" height="14px" className="mb-3" />
                <Skeleton width="40%" height="32px" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="lw-card p-6">
              <Skeleton width="40%" height="20px" className="mb-4" />
              <Skeleton height="180px" />
            </div>
            <div className="lw-card p-6">
              <Skeleton width="40%" height="20px" className="mb-4" />
              <Skeleton height="180px" />
            </div>
          </div>
        </div>
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
            <section className="lw-card p-6">
              <h2 className="font-sora mb-4 text-lg font-semibold text-on-surface">
                Booking 7 ngày gần nhất
              </h2>
              {dashboard.bookingsLast7Days.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Chưa có dữ liệu booking.</p>
              ) : (
                <div className="flex h-48 items-end gap-3">
                  {dashboard.bookingsLast7Days.map((day) => (
                    <div
                      key={day.date}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <span className="text-xs font-medium text-on-surface">{day.count}</span>
                      <div
                        className="w-full rounded-t-lg bg-primary-container transition-all duration-500 ease-out"
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

            <section className="lw-card p-6">
              <h2 className="font-sora mb-4 text-lg font-semibold text-on-surface">Top dịch vụ</h2>
              {dashboard.topServices.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Chưa có dữ liệu dịch vụ.</p>
              ) : (
                <div className="lw-table-container overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="lw-table-header">
                        <th>Dịch vụ</th>
                        <th>Lượt</th>
                        <th>Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.topServices.map((row) => (
                        <tr
                          key={row.serviceName}
                          className="lw-table-row border-t border-outline-variant/40"
                        >
                          <td className="font-medium text-on-surface">{row.serviceName}</td>
                          <td className="text-on-surface-variant">{row.count}</td>
                          <td className="text-on-surface">{formatVnd(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="lw-card p-6 xl:col-span-2">
              <h2 className="font-sora mb-4 text-lg font-semibold text-on-surface">
                Hoạt động gần đây
              </h2>
              {dashboard.recentActivities.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Chưa có hoạt động gần đây.</p>
              ) : (
                <ul className="divide-y divide-outline-variant/40">
                  {dashboard.recentActivities.map((activity) => (
                    <li
                      key={activity.id}
                      className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <span
                        className="material-symbols-outlined mt-0.5 shrink-0 text-primary"
                        style={{ fontVariationSettings: "'FILL' 0" }}
                      >
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
          <RevenueAnalyticsPanel />
        </>
      )}
    </div>
  )
}
