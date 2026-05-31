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

function toApprovePayload(item) {
  const payload = {}
  if (item.requestedTypeName && item.requestedTypeName !== '—') {
    payload.customizedTypeName = item.requestedTypeName
  }
  if (item.userNote && item.userNote !== '—') {
    payload.description = item.userNote
  }
  return payload
}

export default function AdminVehicleApprovalsPage() {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [processingPlate, setProcessingPlate] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
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
      await approveNewVehicleType(item.licensePlate, toApprovePayload(item))
      showToast('Đã duyệt — loại xe mới đã được thêm')
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
        title="Duyệt loại xe"
        description="Yêu cầu khách hàng đăng ký loại xe mới"
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
          message="Tất cả yêu cầu đã được xử lý."
        />
      ) : (
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">Biển số</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Loại xe yêu cầu</th>
                <th className="px-4 py-3">Ghi chú</th>
                <th className="px-4 py-3">Ngày gửi</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {approvals.map((item) => {
                const isProcessing = processingPlate === item.licensePlate

                return (
                  <tr key={item.licensePlate} className="hover:bg-surface-container-low/50">
                    <td className="px-4 py-3 font-medium text-on-surface">{item.licensePlate}</td>
                    <td className="px-4 py-3">
                      <p className="text-on-surface">{item.customerName}</p>
                      <p className="text-xs text-on-surface-variant">{item.phoneMasked}</p>
                    </td>
                    <td className="px-4 py-3 text-on-surface">{item.requestedTypeName}</td>
                    <td className="max-w-xs px-4 py-3 text-on-surface-variant">{item.userNote}</td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {formatDateTime(item.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary disabled:opacity-50"
                          disabled={Boolean(processingPlate)}
                          onClick={() => handleApprove(item)}
                        >
                          {isProcessing ? 'Đang xử lý…' : 'Duyệt'}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-error/30 px-3 py-1.5 text-xs font-semibold text-error disabled:opacity-50"
                          disabled={Boolean(processingPlate)}
                          onClick={() => setRejectTarget(item.licensePlate)}
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

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title="Từ chối yêu cầu"
        message={
          <label className="mt-3 block space-y-1">
            <span className="text-xs font-semibold text-on-surface-variant">Lý do từ chối</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface"
              rows={3}
              value={rejectReason}
              disabled={Boolean(processingPlate)}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do (chỉ hiển thị nội bộ)..."
            />
          </label>
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
