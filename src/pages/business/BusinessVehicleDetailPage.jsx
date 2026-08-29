import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchFleetVehicleDetail, fetchBusinessHistory } from '../../api/business.api'
import { formatDateTime, formatVnd } from '../../utils/format'

function StatusBadge({ status }) {
  const map = {
    Active: { label: 'Hoạt động', className: 'bg-green-100 text-green-800' },
    PendingApproval: { label: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-800' },
    Rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-800' },
    Inactive: { label: 'Không hoạt động', className: 'bg-gray-100 text-gray-600' },
  }
  const style = map[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  )
}

export default function BusinessVehicleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    fetchFleetVehicleDetail(id)
      .then(async (v) => {
        if (!active) return
        setVehicle(v)
        // Lịch sử rửa là phụ — lỗi ở đây không được che mất chi tiết xe.
        try {
          const h = await fetchBusinessHistory({ fleetVehicleId: id, pageSize: 10 })
          if (active) setHistory(h.items ?? [])
        } catch {
          if (active) setHistory([])
        }
      })
      .catch((err) => {
        if (!active) return
        setError(
          err?.statusCode === 404
            ? 'Không tìm thấy xe này trong đội xe của bạn.'
            : 'Không thể tải chi tiết xe.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !vehicle) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-700">{error || 'Không tìm thấy xe.'}</p>
        <button onClick={() => navigate('/business/vehicles')} className="text-sm text-primary hover:underline">
          ← Quay lại danh sách xe
        </button>
      </div>
    )
  }

  const washCount30d = history.length

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/business/vehicles')} className="text-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Quay lại danh sách xe
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-primary">directions_car</span>
              </div>
              <div>
                <p className="font-sora text-lg font-bold text-on-surface">{vehicle.licensePlate}</p>
                <StatusBadge status={vehicle.status} />
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Loại xe</span>
                <span className="text-on-surface font-medium">{vehicle.vehicleType}</span>
              </div>
              {vehicle.brand && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Hãng</span>
                  <span className="text-on-surface">{vehicle.brand}</span>
                </div>
              )}
              {vehicle.model && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Dòng xe</span>
                  <span className="text-on-surface">{vehicle.model}</span>
                </div>
              )}
              {vehicle.driverName && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Tài xế</span>
                  <span className="text-on-surface">{vehicle.driverName}</span>
                </div>
              )}
              {vehicle.employeeCode && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Mã nhân viên</span>
                  <span className="text-on-surface">{vehicle.employeeCode}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6">
            <h3 className="font-medium text-on-surface mb-3 text-sm">Thống kê 30 ngày</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{washCount30d}</p>
                <p className="text-xs text-on-surface-variant">Lần rửa</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatVnd(history.reduce((sum, h) => sum + (h.totalAmount ?? h.cost ?? h.washCost ?? 0), 0))}
                </p>
                <p className="text-xs text-on-surface-variant">Chi phí</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
            <div className="px-5 py-3 border-b border-outline-variant">
              <h3 className="font-medium text-on-surface text-sm">Lịch sử rửa xe</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Ngày</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Chi nhánh</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Trạng thái</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-on-surface-variant">Chi phí</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-xs text-on-surface-variant">
                        Chưa có lịch sử rửa xe.
                      </td>
                    </tr>
                  ) : (
                    history.map((item) => (
                      <tr key={item.fleetWashLogId || item.id} className="hover:bg-surface-container">
                        <td className="px-4 py-2 text-xs text-on-surface">
                          {formatDateTime(item.completedAt || item.createdAt)}
                        </td>
                        <td className="px-4 py-2 text-xs text-on-surface">
                          {item.branchName || '—'}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-right font-medium text-primary">
                          {formatVnd(item.totalAmount ?? item.cost ?? item.washCost ?? 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
