import { useEffect, useState, useCallback } from 'react'
import { assignWashLogLane, fetchFleetQueue, fetchCurrentVehicles } from '../../api/business.api'
import { fetchBranches } from '../../api/admin.branches.api'
import FormModal from '../../components/admin/shared/FormModal'
import { formatDateTime } from '../../utils/format'

function StatusBadge({ status }) {
  const map = {
    Queued: { label: 'Trong hàng đợi', className: 'bg-yellow-100 text-yellow-800' },
    Assigned: { label: 'Đã gán làn', className: 'bg-blue-100 text-blue-800' },
    Processing: { label: 'Đang rửa', className: 'bg-orange-100 text-orange-800' },
    Completed: { label: 'Hoàn tất', className: 'bg-green-100 text-green-800' },
  }
  const style = map[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  )
}

export default function BusinessFleetQueuePage() {
  const [queue, setQueue] = useState([])
  const [processing, setProcessing] = useState([])
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [usingBookingFallback, setUsingBookingFallback] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)
  const [laneId, setLaneId] = useState('')
  const [staffUserId, setStaffUserId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    try {
      const [q, p] = await Promise.all([
        fetchFleetQueue(selectedBranch || undefined),
        fetchCurrentVehicles(selectedBranch || undefined),
      ])
      setQueue(Array.isArray(q) ? q : [])
      setProcessing(Array.isArray(p) ? p : [])
      setUsingBookingFallback(false)
      setLastUpdated(new Date())
      setError('')
    } catch (err) {
      if (err?.statusCode === 403 || err?.isForbidden) {
        setUsingBookingFallback(true)
        setError('')
      } else {
        setError('Không thể tải dữ liệu hàng đợi.')
      }
    } finally {
      setLoading(false)
    }
  }, [selectedBranch])

  useEffect(() => {
    fetchBranches()
      .then((data) => setBranches(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [load])

  const handleAssignLane = async () => {
    if (!assignTarget || !laneId || assigning) return
    setAssigning(true)
    try {
      await assignWashLogLane(assignTarget.fleetWashLogId ?? assignTarget.id, {
        laneId: Number(laneId),
        staffUserId: staffUserId ? Number(staffUserId) : null,
      })
      setToast('Đã gán làn thành công')
      setAssignTarget(null)
      setLaneId('')
      setStaffUserId('')
      await load()
    } catch {
      setToast('Không gán được làn. Kiểm tra ID làn và quyền truy cập.')
    } finally {
      setAssigning(false)
      setTimeout(() => setToast(''), 2500)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sora text-lg font-semibold text-on-surface">Hàng đợi Fleet</h2>
          <p className="text-sm text-on-surface-variant">
            Theo dõi xe trong hàng đợi thời gian thực (tự động cập nhật mỗi 10 giây)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface"
          >
            <option value="">Tất cả chi nhánh</option>
            {branches.map((b) => (
              <option key={b.branchId || b.id} value={b.branchId || b.id}>{b.name}</option>
            ))}
          </select>
          {lastUpdated && (
            <span className="text-xs text-on-surface-variant">
              Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN')}
            </span>
          )}
          <button
            onClick={load}
            className="p-2 text-on-surface-variant hover:text-primary transition-colors"
            title="Làm mới"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </div>

      {usingBookingFallback && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Đang hiển thị đặt lịch đang chờ/xử lý (Business không truy cập trực tiếp API hàng đợi Fleet).
        </div>
      )}

      {toast && (
        <p className="rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
          <div className="px-5 py-3 border-b border-outline-variant bg-yellow-50">
            <h3 className="font-medium text-yellow-800 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-base">pending_actions</span>
              Trong hàng đợi ({queue.length})
            </h3>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Biển số</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Loại</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Trạng thái</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Thời gian</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-on-surface-variant">Không có xe trong hàng đợi.</td>
                  </tr>
                ) : (
                  queue.map((item) => (
                    <tr key={item.fleetWashLogId || item.id} className="hover:bg-surface-container">
                      <td className="px-4 py-2 text-sm font-medium text-primary">{item.licensePlate}</td>
                      <td className="px-4 py-2 text-xs text-on-surface">
                        {item.washType || (item.isWalkIn ? 'Walk-in' : 'Đặt lịch')}
                      </td>
                      <td className="px-4 py-2"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-2 text-xs text-on-surface-variant">{formatDateTime(item.queuedAt || item.createdAt)}</td>
                      <td className="px-4 py-2">
                        {(item.fleetWashLogId || item.id) && !usingBookingFallback && (
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => {
                              setAssignTarget(item)
                              setLaneId('')
                              setStaffUserId('')
                            }}
                          >
                            Gán làn
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
          <div className="px-5 py-3 border-b border-outline-variant bg-orange-50">
            <h3 className="font-medium text-orange-800 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-base">local_car_wash</span>
              Đang xử lý ({processing.length})
            </h3>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Biển số</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Làn</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Trạng thái</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Bắt đầu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {processing.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-xs text-on-surface-variant">Không có xe đang xử lý.</td>
                  </tr>
                ) : (
                  processing.map((item) => (
                    <tr key={item.fleetWashLogId || item.id} className="hover:bg-surface-container">
                      <td className="px-4 py-2 text-sm font-medium text-primary">{item.licensePlate}</td>
                      <td className="px-4 py-2 text-xs text-on-surface">{item.laneName || '—'}</td>
                      <td className="px-4 py-2"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-2 text-xs text-on-surface-variant">{formatDateTime(item.startedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FormModal
        open={Boolean(assignTarget)}
        title={`Gán làn — ${assignTarget?.licensePlate ?? ''}`}
        submitLabel={assigning ? 'Đang gán…' : 'Gán làn'}
        onClose={() => !assigning && setAssignTarget(null)}
        onSubmit={handleAssignLane}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Lane ID</span>
            <input
              type="number"
              className="w-full rounded-lg border border-outline-variant px-3 py-2"
              value={laneId}
              onChange={(e) => setLaneId(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Staff User ID (tùy chọn)</span>
            <input
              type="number"
              className="w-full rounded-lg border border-outline-variant px-3 py-2"
              value={staffUserId}
              onChange={(e) => setStaffUserId(e.target.value)}
            />
          </label>
        </div>
      </FormModal>
    </div>
  )
}
