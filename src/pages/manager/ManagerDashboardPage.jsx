import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchManagerBookings } from '../../api'
import KpiCard from '../../components/admin/dashboard/KpiCard'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import RevenueStimulusPanel from '../../components/manager/RevenueStimulusPanel'

export default function ManagerDashboardPage() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    checkedIn: 0,
    processing: 0,
    completed: 0,
    revenue: 0,
  })
  const [recentBookings, setRecentBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchManagerBookings()
      const list = Array.isArray(data) ? data : []
      setRecentBookings(list.slice(0, 8))
      setStats({
        total: list.length,
        pending: list.filter((b) => b.status === 'Pending').length,
        checkedIn: list.filter((b) => b.status === 'Checked-in').length,
        processing: list.filter((b) => b.status === 'Processing').length,
        completed: list.filter((b) => b.status === 'Completed').length,
        revenue: list
          .filter((b) => b.status === 'Completed')
          .reduce((sum, b) => sum + (Number(b.finalAmount) || 0), 0),
      })
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async dashboard load
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [loadData])

  const kpiCards = [
    { id: 'pending', label: 'Chờ check-in', value: stats.pending, format: 'number', icon: 'hourglass_top' },
    { id: 'checkedin', label: 'Đã check-in', value: stats.checkedIn, format: 'number', icon: 'login' },
    { id: 'processing', label: 'Đang rửa', value: stats.processing, format: 'number', icon: 'wash' },
    { id: 'completed', label: 'Hoàn thành hôm nay', value: stats.completed, format: 'number', icon: 'check_circle' },
  ]

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="font-sora text-2xl font-semibold text-on-surface">Tổng quan chi nhánh</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Thông tin vận hành và hoạt động hôm nay
        </p>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-error-container/40 bg-error-container/10 px-4 py-3 text-sm text-error">
          {loadError}
          <button className="ml-3 underline" onClick={loadData}>Thử lại</button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {loading
          ? kpiCards.map((card) => (
              <div key={card.id} className="glass-panel rounded-xl border border-outline-variant bg-surface-container-lowest p-5 animate-pulse">
                <div className="h-3 w-20 rounded bg-surface-variant mb-2" />
                <div className="h-8 w-12 rounded bg-surface-variant mb-1" />
              </div>
            ))
          : kpiCards.map((card) => (
              <KpiCard
                key={card.id}
                label={card.label}
                value={card.value}
                format={card.format}
                icon={card.icon}
              />
            ))}
      </div>

      {/* Recent bookings */}
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-sora text-lg font-semibold text-on-surface">Hoạt động gần đây</h2>
          <button
            className="text-sm text-secondary hover:underline"
            onClick={loadData}
          >
            Làm mới
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="glass-panel rounded-xl border border-outline-variant bg-surface-container-lowest p-4 animate-pulse">
                <div className="h-4 w-40 rounded bg-surface-variant mb-2" />
                <div className="h-3 w-60 rounded bg-surface-variant" />
              </div>
            ))}
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-outline">calendar_month</span>
            <p className="text-sm text-on-surface-variant">Chưa có booking nào hôm nay</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentBookings.map((b) => (
              <div
                key={b.bookingId}
                className="glass-panel flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest px-5 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-container/30">
                    <span className="material-symbols-outlined text-secondary">directions_car</span>
                  </div>
                  <div>
                    <p className="font-mono font-semibold text-on-surface">{b.licensePlate}</p>
                    <p className="text-xs text-on-surface-variant">
                      {b.customerName} · {b.serviceName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={b.status} />
                  <p className="mt-1 text-xs text-on-surface-variant">{b.slotLabel}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RevenueStimulusPanel />
    </div>
  )
}
