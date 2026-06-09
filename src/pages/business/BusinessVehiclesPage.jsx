import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchFleetVehicles, fetchPendingVehicles } from '../../api/business.api'

function StatusBadge({ status }) {
  const map = {
    Active: { label: 'Hoạt động', className: 'bg-green-100 text-green-800' },
    PendingApproval: { label: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-800' },
    Rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-800' },
    Inactive: { label: 'Không hoạt động', className: 'bg-gray-100 text-gray-600' },
  }
  const style = map[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  )
}

export default function BusinessVehiclesPage() {
  const [activeTab, setActiveTab] = useState('active')
  const [activeVehicles, setActiveVehicles] = useState([])
  const [pendingVehicles, setPendingVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchFleetVehicles(), fetchPendingVehicles()])
      .then(([active, pending]) => {
        setActiveVehicles(Array.isArray(active) ? active : [])
        setPendingVehicles(Array.isArray(pending) ? pending : [])
      })
      .catch(() => setError('Không thể tải danh sách xe.'))
      .finally(() => setLoading(false))
  }, [])

  const VehicleTable = ({ vehicles, showActions }) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-outline-variant">
            <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Biển số</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Loại xe</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Hãng / Dòng</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tài xế</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Mã NV</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Trạng thái</th>
            {showActions && <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Thao tác</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {vehicles.length === 0 ? (
            <tr>
              <td colSpan={showActions ? 7 : 6} className="px-4 py-8 text-center text-sm text-on-surface-variant">
                Không có xe nào.
              </td>
            </tr>
          ) : (
            vehicles.map((vehicle) => (
              <tr key={vehicle.fleetVehicleId} className="hover:bg-surface-container transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-primary">{vehicle.licensePlate}</td>
                <td className="px-4 py-3 text-sm text-on-surface">{vehicle.vehicleType}</td>
                <td className="px-4 py-3 text-sm text-on-surface">
                  {vehicle.brand} {vehicle.model && `/ ${vehicle.model}`}
                </td>
                <td className="px-4 py-3 text-sm text-on-surface-variant">{vehicle.driverName || '—'}</td>
                <td className="px-4 py-3 text-sm text-on-surface-variant">{vehicle.employeeCode || '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={vehicle.status} />
                </td>
                {showActions && (
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/business/vehicles/${vehicle.fleetVehicleId}`}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Chi tiết
                    </Link>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )

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
          <h2 className="font-sora text-lg font-semibold text-on-surface">Quản lý xe</h2>
          <p className="text-sm text-on-surface-variant">
            {activeVehicles.length} xe hoạt động, {pendingVehicles.length} xe chờ duyệt
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/business/vehicles/history"
            className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-xl hover:bg-primary/5 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">history</span>
            Lịch sử nhập
          </Link>
          <Link
            to="/business/vehicles/import"
            className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">upload_file</span>
            Nhập Excel
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
        <div className="flex border-b border-outline-variant">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'active'
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Xe hoạt động ({activeVehicles.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'pending'
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Xe chờ duyệt ({pendingVehicles.length})
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'active' ? (
            <VehicleTable vehicles={activeVehicles} showActions />
          ) : (
            <VehicleTable vehicles={pendingVehicles} showActions={false} />
          )}
        </div>
      </div>
    </div>
  )
}
