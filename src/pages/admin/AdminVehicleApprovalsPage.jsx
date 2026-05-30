import { useState } from 'react'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import { initialPendingVehicleApprovals } from '../../data/mockAdminVehicleApprovals'
import { formatDateTime } from '../../utils/format'

export default function AdminVehicleApprovalsPage() {
  const [approvals, setApprovals] = useState(initialPendingVehicleApprovals)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const handleApprove = (id) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id))
    window.alert('Đã duyệt — loại xe mới đã thêm (mock)')
  }

  const handleReject = () => {
    setApprovals((prev) => prev.filter((a) => a.id !== rejectTarget))
    window.alert(`Đã từ chối yêu cầu (mock). Lý do: ${rejectReason || 'Không phù hợp'}`)
    setRejectTarget(null)
    setRejectReason('')
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Duyệt loại xe"
        description="Yêu cầu khách hàng đăng ký loại xe mới"
      />

      {approvals.length === 0 ? (
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
              {approvals.map((item) => (
                <tr key={item.id} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 font-medium text-on-surface">{item.licensePlate}</td>
                  <td className="px-4 py-3">
                    <p className="text-on-surface">{item.customerName}</p>
                    <p className="text-xs text-on-surface-variant">{item.phoneMasked}</p>
                  </td>
                  <td className="px-4 py-3 text-on-surface">{item.requestedTypeName}</td>
                  <td className="max-w-xs px-4 py-3 text-on-surface-variant">{item.userNote}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{formatDateTime(item.submittedAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary"
                        onClick={() => handleApprove(item.id)}
                      >
                        Duyệt
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-error/30 px-3 py-1.5 text-xs font-semibold text-error"
                        onClick={() => setRejectTarget(item.id)}
                      >
                        Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do..."
            />
          </label>
        }
        confirmLabel="Từ chối"
        variant="danger"
        onConfirm={handleReject}
        onCancel={() => {
          setRejectTarget(null)
          setRejectReason('')
        }}
      />
    </div>
  )
}
