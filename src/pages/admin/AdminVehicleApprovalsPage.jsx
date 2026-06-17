import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  approveNewVehicleType,
  fetchPendingVehicleApprovals,
  normalizePendingApproval,
  rejectNewVehicleType,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import { formatDateTime } from '../../utils/format'

export default function AdminVehicleApprovalsPage() {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [processingPlate, setProcessingPlate] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [expandedPlate, setExpandedPlate] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadApprovals = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchPendingVehicleApprovals()
      const items = Array.isArray(data) ? data.map(normalizePendingApproval) : []
      setApprovals(items)
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : 'Không tải được danh sách yêu cầu duyệt',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadApprovals()
  }, [loadApprovals])

  const handleApprove = async (item) => {
    if (processingPlate) return

    setProcessingPlate(item.licensePlate)
    try {
      const payload = {}
      const typeName = item.userNote || item.carModel
      if (typeName) {
        payload.customizedTypeName = typeName
      }
      await approveNewVehicleType(item.licensePlate, payload)
      showToast(`Đã duyệt — loại xe "${typeName || item.vehicleTypeName}" đã được thêm vào hệ thống`)
      await loadApprovals()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không duyệt được yêu cầu')
    } finally {
      setProcessingPlate(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget || processingPlate) return

    setProcessingPlate(rejectTarget)
    try {
      await rejectNewVehicleType(rejectTarget)
      setRejectTarget(null)
      showToast(
        rejectReason.trim()
          ? `Đã từ chối yêu cầu. Lý do: ${rejectReason.trim()}`
          : 'Đã từ chối yêu cầu',
      )
      setRejectReason('')
      await loadApprovals()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không từ chối được yêu cầu')
    } finally {
      setProcessingPlate(null)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Duyệt loại xe mới"
        description="Khách hàng đăng ký xe với loại 'Khác' sẽ xuất hiện ở đây. Duyệt để tạo loại xe mới trong hệ thống, hoặc từ chối nếu thông tin không hợp lệ."
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
            onClick={loadApprovals}
          >
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải yêu cầu chờ duyệt…</p>
      ) : approvals.length === 0 && !loadError ? (
        <EmptyState
          icon="pending_actions"
          title="Không có yêu cầu chờ duyệt"
          message="Khi khách đăng ký xe mới với loại 'Khác', yêu cầu sẽ xuất hiện ở đây."
        />
      ) : (
        <div className="space-y-4">
          {approvals.map((item) => {
            const isProcessing = processingPlate === item.licensePlate
            const isExpanded = expandedPlate === item.licensePlate

            return (
              <div
                key={item.licensePlate}
                className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden"
              >
                <div className="flex items-start gap-4 p-5">
                  <div className="flex flex-1 flex-wrap gap-x-6 gap-y-3">
                    <div>
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Biển số</p>
                      <p className="text-base font-bold text-primary font-mono">{item.licensePlate}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Loại hiện tại</p>
                      <p className="text-sm font-medium text-on-surface">{item.vehicleTypeName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tên dòng xe khách yêu cầu</p>
                      <p className="text-sm font-medium text-on-surface">
                        {item.userNote || item.carModel ? (
                          <span className="text-primary">{item.userNote || item.carModel}</span>
                        ) : (
                          <span className="text-on-surface-variant italic">—</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Chủ xe</p>
                      <p className="text-sm text-on-surface">{item.ownerName}</p>
                      {item.ownerPhone && (
                        <p className="text-xs text-on-surface-variant">{item.ownerPhone}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Ngày gửi</p>
                      <p className="text-sm text-on-surface-variant">
                        {item.submittedAt ? formatDateTime(item.submittedAt) : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary disabled:opacity-50 hover:bg-primary/90 transition-colors"
                        disabled={Boolean(processingPlate)}
                        onClick={() => handleApprove(item)}
                      >
                        {isProcessing ? 'Đang xử lý…' : 'Duyệt tạo loại xe'}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-error/30 px-4 py-2 text-xs font-semibold text-error disabled:opacity-50 hover:bg-error-container/20 transition-colors"
                        disabled={Boolean(processingPlate)}
                        onClick={() => setRejectTarget(item.licensePlate)}
                      >
                        Từ chối
                      </button>
                    </div>
                    {item.registrationPhotoUrl && (
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setExpandedPlate(isExpanded ? null : item.licensePlate)}
                      >
                        {isExpanded ? 'Ẩn ảnh đăng ký' : 'Xem ảnh đăng ký'}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && item.registrationPhotoUrl && (
                  <div className="border-t border-outline-variant p-5 bg-surface-container-low">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                      Ảnh đăng ký xe — {item.licensePlate}
                    </p>
                    <img
                      src={item.registrationPhotoUrl}
                      alt={`Đăng ký xe ${item.licensePlate}`}
                      className="max-h-64 rounded-lg border border-outline-variant object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title="Từ chối yêu cầu"
        message={
          <div className="mt-2 space-y-2">
            <p className="text-sm text-on-surface-variant">
              Xe: <strong className="text-on-surface">{rejectTarget}</strong>
            </p>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-on-surface-variant">Lý do từ chối (nội bộ)</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface"
                rows={3}
                value={rejectReason}
                disabled={Boolean(processingPlate)}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối (không bắt buộc)…"
              />
            </label>
          </div>
        }
        confirmLabel={processingPlate ? 'Đang xử lý…' : 'Từ chối'}
        variant="danger"
        onConfirm={handleReject}
        onCancel={() => {
          if (!processingPlate) {
            setRejectTarget(null)
            setRejectReason('')
          }
        }}
      />
    </div>
  )
}
