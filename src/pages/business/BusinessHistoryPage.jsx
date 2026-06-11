import { useEffect, useState } from 'react'
import { fetchBusinessHistory, fetchFleetVehicles } from '../../api/business.api'
import { fetchBranches } from '../../api/admin.branches.api'
import { formatVnd, formatDateTime } from '../../utils/format'

export default function BusinessHistoryPage() {
  const [history, setHistory] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState({
    fromDate: '',
    toDate: '',
    fleetVehicleId: '',
    branchId: '',
    status: '',
  })

  useEffect(() => {
    Promise.all([fetchFleetVehicles(), fetchBranches()])
      .then(([v, b]) => {
        setVehicles(Array.isArray(v) ? v : [])
        setBranches(Array.isArray(b) ? b : [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = {
      page,
      pageSize: 20,
      ...(filter.fromDate && { fromDate: filter.fromDate }),
      ...(filter.toDate && { toDate: filter.toDate }),
      ...(filter.fleetVehicleId && { fleetVehicleId: filter.fleetVehicleId }),
      ...(filter.branchId && { branchId: filter.branchId }),
      ...(filter.status && { status: filter.status }),
    }
    fetchBusinessHistory(params)
      .then((data) => {
        setHistory(data.items ?? [])
        setTotalPages(data.totalPages || 1)
      })
      .catch(() => setError('Không thể tải lịch sử.'))
      .finally(() => setLoading(false))
  }, [page, filter])

  const handleFilterChange = (key, value) => {
    setFilter((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-sora text-lg font-semibold text-on-surface">Lịch sử rửa xe</h2>
        <p className="text-sm text-on-surface-variant">Xem chi tiết các lần rửa xe đã hoàn thành</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-on-surface-variant mb-1 block">Từ ngày</label>
            <input
              type="date"
              value={filter.fromDate}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface"
            />
          </div>
          <div>
            <label className="text-xs text-on-surface-variant mb-1 block">Đến ngày</label>
            <input
              type="date"
              value={filter.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface"
            />
          </div>
          <div>
            <label className="text-xs text-on-surface-variant mb-1 block">Xe</label>
            <select
              value={filter.fleetVehicleId}
              onChange={(e) => handleFilterChange('fleetVehicleId', e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface"
            >
              <option value="">Tất cả xe</option>
              {vehicles.map((v) => (
                <option key={v.fleetVehicleId || v.id} value={v.fleetVehicleId || v.id}>{v.licensePlate}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-on-surface-variant mb-1 block">Chi nhánh</label>
            <select
              value={filter.branchId}
              onChange={(e) => handleFilterChange('branchId', e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface"
            >
              <option value="">Tất cả</option>
              {branches.map((b) => (
                <option key={b.branchId || b.id} value={b.branchId || b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-on-surface-variant mb-1 block">Trạng thái</label>
            <select
              value={filter.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface"
            >
              <option value="">Tất cả</option>
              <option value="Completed">Hoàn tất</option>
              <option value="Processing">Đang rửa</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Biển số</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Loại xe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Chi nhánh</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Check-in</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Hoàn thành</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant uppercase">Chi phí</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-on-surface-variant">
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.fleetWashLogId || item.id} className="hover:bg-surface-container transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-primary">
                      {item.licensePlate}
                    </td>
                    <td className="px-4 py-3 text-sm text-on-surface">{item.vehicleType || '—'}</td>
                    <td className="px-4 py-3 text-sm text-on-surface">{item.branchName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-on-surface">{formatDateTime(item.checkInTime || item.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-on-surface">{formatDateTime(item.completedTime || item.completedAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        item.status === 'Processing' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-primary">
                      {formatVnd(item.totalAmount || item.cost || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-outline-variant flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">
              Trang {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-xs font-medium border border-outline-variant rounded-lg disabled:opacity-50 hover:bg-surface-container"
              >
                ← Trước
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-xs font-medium border border-outline-variant rounded-lg disabled:opacity-50 hover:bg-surface-container"
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
