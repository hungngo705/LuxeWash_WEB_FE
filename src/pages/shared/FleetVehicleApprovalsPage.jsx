import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../api'
import {
  approveAdminFleetVehicle,
  fetchAdminPendingFleetVehicles,
  rejectAdminFleetVehicle,
} from '../../api/fleet.api'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'

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
  const toast = useToast()

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
        setLoadError(
          err instanceof ApiError ? err.message : 'Không tải được danh sách xe chờ duyệt.',
        )
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
      toast.success(`Đã duyệt xe ${vehicle.licensePlate}`)
      await loadVehicles()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không duyệt được xe.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget || processingId) return
    if (!rejectReason.trim()) {
      toast.warning('Vui lòng nhập lý do từ chối.')
      return
    }

    setProcessingId(rejectTarget.fleetVehicleId)
    try {
      await rejectAdminFleetVehicle(rejectTarget.fleetVehicleId, rejectReason.trim())
      setRejectTarget(null)
      setRejectReason('')
      toast.success(`Đã từ chối xe ${rejectTarget.licensePlate}`)
      await loadVehicles()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không từ chối được xe.')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Đối tác DN"
        title={title}
        description={description}
        actionLabel="Làm mới"
        actionIcon="refresh"
        onAction={loadVehicles}
      />

      {loadError && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3 text-sm text-error">
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            error
          </span>
          {loadError}
        </div>
      )}

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <span
          className="material-symbols-outlined mt-0.5"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          info
        </span>
        <p>
          Xe có <span className="font-medium">hãng / dòng / loại phương tiện</span> đã tồn tại và
          đang hoạt động trong hệ thống sẽ được{' '}
          <span className="font-medium">tự động duyệt</span> ngay khi doanh nghiệp nhập — những xe
          này <span className="font-medium">không xuất hiện</span> trong danh sách chờ duyệt.
        </p>
      </div>

      <DataTable
        data={vehicles}
        loading={loading}
        emptyIcon="local_shipping"
        emptyTitle="Không có xe chờ duyệt"
        emptyMessage="Tất cả xe fleet đã được xử lý."
        columns={[
          {
            key: 'licensePlate',
            label: 'Biển số',
            render: (v) => (
              <span className="font-semibold tracking-wide text-primary">{v.licensePlate}</span>
            ),
          },
          {
            key: 'vehicleType',
            label: 'Loại xe',
            render: (v) => v.vehicleType || '—',
          },
          {
            key: 'brand',
            label: 'Hãng / Dòng',
            render: (v) =>
              v.brand ? (
                <>
                  {v.brand}
                  {v.model ? ` / ${v.model}` : ''}
                </>
              ) : (
                '—'
              ),
          },
          {
            key: 'driverName',
            label: 'Tài xế',
            render: (v) => v.driverName || '—',
            tdClassName: 'text-on-surface-variant',
          },
          {
            key: 'employeeCode',
            label: 'Mã NV',
            render: (v) => v.employeeCode || '—',
            tdClassName: 'text-on-surface-variant',
          },
          {
            key: 'status',
            label: 'Trạng thái',
            width: '140px',
            render: (v) => <StatusBadge status={v.status} />,
          },
          {
            key: 'actions',
            label: 'Thao tác',
            width: '180px',
            align: 'right',
            renderActions: (vehicle) => {
              const busy = processingId === vehicle.fleetVehicleId
              return (
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    disabled={Boolean(processingId)}
                    onClick={() => handleApprove(vehicle)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-on-primary transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? (
                      <span
                        className="material-symbols-outlined lw-spin text-[12px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        progress_activity
                      </span>
                    ) : (
                      <span
                        className="material-symbols-outlined text-[12px]"
                        style={{ fontVariationSettings: "'FILL' 0" }}
                      >
                        check
                      </span>
                    )}
                    {busy ? 'Đang xử lý…' : 'Duyệt'}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(processingId)}
                    onClick={() => setRejectTarget(vehicle)}
                    className="inline-flex items-center gap-1 rounded-lg border border-error/40 px-2.5 py-1 text-xs font-semibold text-error transition-colors hover:bg-error-container/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span
                      className="material-symbols-outlined text-[12px]"
                      style={{ fontVariationSettings: "'FILL' 0" }}
                    >
                      close
                    </span>
                    Từ chối
                  </button>
                </div>
              )
            },
          },
        ]}
      />

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Đóng"
            onClick={() => {
              setRejectTarget(null)
              setRejectReason('')
            }}
          />
          <div className="lw-panel-enter relative w-full max-w-md rounded-xl border border-outline-variant bg-white p-6 shadow-lw-xl">
            <h3 className="font-sora text-lg font-semibold text-on-surface">Từ chối xe</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              Biển số:{' '}
              <span className="font-medium text-on-surface">{rejectTarget.licensePlate}</span>
            </p>
            <label className="mt-4 block text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
              Lý do từ chối <span className="text-error">*</span>
            </label>
            <textarea
              className="mt-1 w-full rounded-lg border border-outline-variant bg-white px-3.5 py-2 text-sm text-on-surface focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
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
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-variant disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={handleReject}
                className="inline-flex items-center gap-1.5 rounded-lg bg-error px-4 py-2 text-sm font-semibold text-on-error transition-all hover:bg-error/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processingId && (
                  <span
                    className="material-symbols-outlined lw-spin text-[16px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    progress_activity
                  </span>
                )}
                {processingId ? 'Đang xử lý…' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}