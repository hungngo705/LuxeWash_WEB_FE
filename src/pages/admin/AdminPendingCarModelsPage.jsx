import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  approveCarModelRequest,
  fetchPendingCarModels,
  fetchVehicleTypes,
  rejectCarModelRequest,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'

export default function AdminPendingCarModelsPage() {
  const [pendingModels, setPendingModels] = useState([])
  const [vehicleTypes, setVehicleTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [processingId, setProcessingId] = useState(null)

  // Approve modal state
  const [approveTarget, setApproveTarget] = useState(null)
  const [selectedVehicleTypeId, setSelectedVehicleTypeId] = useState('')

  // Reject confirm state
  const [rejectTarget, setRejectTarget] = useState(null)

  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [models, types] = await Promise.all([
        fetchPendingCarModels(),
        fetchVehicleTypes(),
      ])
      setPendingModels(models)
      setVehicleTypes(Array.isArray(types) ? types : [])
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : 'Không tải được danh sách mẫu xe chờ duyệt',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openApproveModal = (model) => {
    setApproveTarget(model)
    setSelectedVehicleTypeId(model.vehicleTypeId ? String(model.vehicleTypeId) : '')
  }

  const handleApprove = async () => {
    if (!approveTarget || processingId) return
    if (!selectedVehicleTypeId) {
      showToast('Vui lòng chọn loại xe trước khi duyệt')
      return
    }

    setProcessingId(approveTarget.id)
    try {
      await approveCarModelRequest(approveTarget.id, {
        vehicleTypeId: Number(selectedVehicleTypeId),
      })
      const typeName =
        vehicleTypes.find((t) => t.id === Number(selectedVehicleTypeId))?.name ?? selectedVehicleTypeId
      showToast(
        `Đã duyệt mẫu xe "${approveTarget.brand} ${approveTarget.name}" — loại xe: ${typeName}`,
      )
      setApproveTarget(null)
      setSelectedVehicleTypeId('')
      await loadData()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không duyệt được mẫu xe')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget || processingId) return

    setProcessingId(rejectTarget.id)
    try {
      await rejectCarModelRequest(rejectTarget.id)
      showToast(`Đã từ chối mẫu xe "${rejectTarget.brand} ${rejectTarget.name}"`)
      setRejectTarget(null)
      await loadData()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không từ chối được mẫu xe')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Duyệt mẫu xe đóng góp"
        description="Người dùng đóng góp mẫu xe mới sẽ xuất hiện ở đây. Chọn đúng loại xe (Sedan, SUV,…) rồi duyệt để mẫu xe có hiệu lực chính thức."
      />

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      {loadError && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="rounded-lg border border-error/30 px-3 py-1.5 text-sm font-medium text-error hover:bg-error-container/20"
            onClick={loadData}
          >
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải mẫu xe chờ duyệt…</p>
      ) : pendingModels.length === 0 && !loadError ? (
        <EmptyState
          icon="fact_check"
          title="Không có mẫu xe chờ duyệt"
          message="Khi người dùng đóng góp mẫu xe mới, chúng sẽ xuất hiện ở đây để bạn kiểm tra."
        />
      ) : (
        <div className="space-y-4">
          {pendingModels.map((model) => {
            const isProcessing = processingId === model.id
            const currentType = model.vehicleTypeId
              ? vehicleTypes.find((t) => t.id === model.vehicleTypeId)
              : null

            return (
              <div
                key={model.id}
                className="glass-panel soft-shadow overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest"
              >
                <div className="flex items-start gap-4 p-5">
                  <div className="flex flex-1 flex-wrap gap-x-6 gap-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        ID
                      </p>
                      <p className="font-mono text-base font-bold text-primary">#{model.id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Hãng xe
                      </p>
                      <p className="text-sm font-medium text-on-surface">
                        {model.brand || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Dòng xe
                      </p>
                      <p className="text-sm font-medium text-on-surface">
                        {model.name || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Loại xe hiện tại
                      </p>
                      <p className="text-sm text-on-surface">
                        {currentType ? (
                          <span className="text-primary">{currentType.name}</span>
                        ) : (
                          <span className="italic text-on-surface-variant">Chưa gán</span>
                        )}
                      </p>
                    </div>
                    {model.requestedByUserId && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                          Người gửi
                        </p>
                        <p className="text-sm text-on-surface-variant">
                          User #{model.requestedByUserId}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Trạng thái
                      </p>
                      <StatusBadge status={model.status} />
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
                      disabled={Boolean(processingId)}
                      onClick={() => openApproveModal(model)}
                    >
                      {isProcessing ? 'Đang xử lý…' : 'Duyệt'}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-error/30 px-4 py-2 text-xs font-semibold text-error transition-colors hover:bg-error-container/20 disabled:opacity-50"
                      disabled={Boolean(processingId)}
                      onClick={() => setRejectTarget(model)}
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Approve Modal — chọn VehicleType */}
      <FormModal
        open={Boolean(approveTarget)}
        title="Duyệt mẫu xe"
        submitLabel={processingId ? 'Đang duyệt…' : 'Xác nhận duyệt'}
        onClose={() => {
          if (!processingId) {
            setApproveTarget(null)
            setSelectedVehicleTypeId('')
          }
        }}
        onSubmit={handleApprove}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Hãng
                </p>
                <p className="font-medium text-on-surface">
                  {approveTarget?.brand || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Dòng xe
                </p>
                <p className="font-medium text-on-surface">
                  {approveTarget?.name || '—'}
                </p>
              </div>
            </div>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">
              Loại xe (bắt buộc) <span className="text-error">*</span>
            </span>
            <select
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface"
              value={selectedVehicleTypeId}
              disabled={Boolean(processingId)}
              onChange={(e) => setSelectedVehicleTypeId(e.target.value)}
            >
              <option value="">— Chọn loại xe —</option>
              {vehicleTypes.map((vt) => (
                <option key={vt.id} value={vt.id}>
                  {vt.name}
                  {vt.description ? ` — ${vt.description}` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-on-surface-variant">
              Chọn loại xe chuẩn (Sedan, SUV, Hatchback,…) để tính giá dịch vụ chính xác.
            </p>
          </label>
        </div>
      </FormModal>

      {/* Reject Confirm */}
      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title="Từ chối mẫu xe"
        message={
          <p className="text-sm text-on-surface-variant">
            Bạn chắc chắn muốn từ chối mẫu xe{' '}
            <strong className="text-on-surface">
              {rejectTarget?.brand} {rejectTarget?.name}
            </strong>
            ? Mẫu xe sẽ bị ẩn khỏi hệ thống.
          </p>
        }
        confirmLabel={processingId ? 'Đang xử lý…' : 'Từ chối'}
        variant="danger"
        onConfirm={handleReject}
        onCancel={() => {
          if (!processingId) setRejectTarget(null)
        }}
      />
    </div>
  )
}
