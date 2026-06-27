import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../api'
import {
  approveAdminFleetVehicle,
  fetchAdminPendingFleetVehicles,
  rejectAdminFleetVehicle,
} from '../../api/fleet.api'

function StatusBadge({ status }) {
  const map = {
    PendingApproval: { label: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-800' },
    Active: { label: 'Hoạt động', className: 'bg-green-100 text-green-800' },
    Rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-800' },
  }
  const style = map[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  )
}

export default function FleetVehicleApprovalsPage({
  title = 'Duyệt xe doanh nghiệp',
  description = 'Phê duyệt phương tiện fleet do doanh nghiệp nhập từ Excel',
}) {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [processingId, setProcessingId] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  const loadVehicles = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const list = await fetchAdminPendingFleetVehicles()
      setVehicles(list)
    } catch (err) {
      if (err instanceof ApiError && err.isForbidden) {
        setLoadError(
          'Tài khoản chưa có quyền xem danh sách xe chờ duyệt. Vui lòng kiểm tra quyền Admin trên backend.',
        )
      } else {
        setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách xe chờ duyệt.')
      }
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVehicles()
  }, [loadVehicles])

  const handleApprove = async (vehicle) => {
    if (processingId) return
    setProcessingId(vehicle.fleetVehicleId)
    try {
      await approveAdminFleetVehicle(vehicle.fleetVehicleId)
      showToast(`Đã duyệt xe ${vehicle.licensePlate}`)
      await loadVehicles()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không duyệt được xe.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget || processingId) return
    if (!rejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối.')
      return
    }

    setProcessingId(rejectTarget.fleetVehicleId)
    try {
      await rejectAdminFleetVehicle(rejectTarget.fleetVehicleId, rejectReason.trim())
      setRejectTarget(null)
      setRejectReason('')
      showToast(`Đã từ chối xe ${rejectTarget.licensePlate}`)
      await loadVehicles()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không từ chối được xe.')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-sora text-lg font-semibold text-on-surface">{title}</h2>
          <p className="text-sm text-on-surface-variant mt-1">{description}</p>
        </div>
        <button
          type="button"
          onClick={loadVehicles}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          Làm mới
        </button>
      </div>

      {toast && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          {toast}
        </div>
      )}

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex items-start gap-2">
        <span className="material-symbols-outlined text-base mt-0.5">info</span>
        <p>
          Xe có <span className="font-medium">hãng / dòng / loại phương tiện</span> đã tồn tại và đang
          hoạt động trong hệ thống sẽ được <span className="font-medium">tự động duyệt</span> ngay khi
          doanh nghiệp nhập — những xe này <span className="font-medium">không xuất hiện</span> trong
          danh sách chờ duyệt.
        </p>
      </div>

      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : vehicles.length === 0 && !loadError ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">local_shipping</span>
            <p className="mt-3 text-sm font-medium text-on-surface">Không có xe chờ duyệt</p>
            <p className="text-xs text-on-surface-variant mt-1">Tất cả xe fleet đã được xử lý.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Biển số</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Loại xe</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Hãng / Dòng</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Tài xế</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Mã NV</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {vehicles.map((vehicle) => {
                  const busy = processingId === vehicle.fleetVehicleId
                  return (
                    <tr key={vehicle.fleetVehicleId} className="hover:bg-surface-container/50">
                      <td className="px-4 py-3 text-sm font-medium text-primary">{vehicle.licensePlate}</td>
                      <td className="px-4 py-3 text-sm text-on-surface">{vehicle.vehicleType || '—'}</td>
                      <td className="px-4 py-3 text-sm text-on-surface">
                        {vehicle.brand}
                        {vehicle.model ? ` / ${vehicle.model}` : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{vehicle.driverName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{vehicle.employeeCode || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={vehicle.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={Boolean(processingId)}
                            onClick={() => handleApprove(vehicle)}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary disabled:opacity-50"
                          >
                            {busy ? 'Đang xử lý…' : 'Duyệt'}
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(processingId)}
                            onClick={() => setRejectTarget(vehicle)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                          >
                            Từ chối
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl">
            <h3 className="font-sora text-lg font-semibold text-on-surface">Từ chối xe</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              Biển số: <span className="font-medium text-on-surface">{rejectTarget.licensePlate}</span>
            </p>
            <label className="mt-4 block text-xs font-medium text-on-surface-variant">
              Lý do từ chối <span className="text-red-500">*</span>
            </label>
            <textarea
              className="mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="VD: Biển số không hợp lệ..."
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={() => {
                  setRejectTarget(null)
                  setRejectReason('')
                }}
                className="rounded-xl border border-outline-variant px-4 py-2 text-sm text-on-surface-variant"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={handleReject}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {processingId ? 'Đang xử lý…' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
