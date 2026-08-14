import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createManagerShiftAssignment,
  createManagerWorkShift,
  deleteManagerShiftAssignment,
  fetchManagerOvertimeRequests,
  fetchManagerShiftAssignments,
  fetchManagerShiftSwapRequests,
  fetchManagerStaffs,
  fetchManagerWorkShifts,
  reviewManagerOvertimeRequest,
  reviewManagerShiftSwapRequest,
  toTimeInputValue,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import { formatDateTime } from '../../utils/format'

const TABS = [
  { id: 'shifts', label: 'Ca làm' },
  { id: 'assignments', label: 'Phân ca' },
  { id: 'overtime', label: 'Tăng ca' },
  { id: 'swap', label: 'Đổi ca' },
]

const emptyShiftForm = { shiftName: '', startTime: '07:00', endTime: '15:00' }
const emptyAssignForm = { staffUserId: '', workShiftId: '', workDate: '', note: '' }

export default function ManagerShiftsPage() {
  const [tab, setTab] = useState('shifts')
  const [workShifts, setWorkShifts] = useState([])
  const [assignments, setAssignments] = useState([])
  const [overtimeRequests, setOvertimeRequests] = useState([])
  const [swapRequests, setSwapRequests] = useState([])
  const [staffs, setStaffs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState('')

  const [shiftModalOpen, setShiftModalOpen] = useState(false)
  const [shiftForm, setShiftForm] = useState(emptyShiftForm)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignForm, setAssignForm] = useState(emptyAssignForm)
  const [saving, setSaving] = useState(false)
  const [deleteAssignId, setDeleteAssignId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadAll = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [shifts, assigns, overtime, swaps, staffList] = await Promise.all([
        fetchManagerWorkShifts(true),
        fetchManagerShiftAssignments(),
        fetchManagerOvertimeRequests('Pending'),
        fetchManagerShiftSwapRequests('Pending'),
        fetchManagerStaffs(),
      ])
      setWorkShifts(shifts)
      setAssignments(assigns)
      setOvertimeRequests(overtime)
      setSwapRequests(swaps)
      setStaffs(staffList)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu ca làm')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleCreateShift = async () => {
    if (!shiftForm.shiftName.trim()) {
      showToast('Vui lòng nhập tên ca')
      return
    }
    setSaving(true)
    try {
      await createManagerWorkShift(shiftForm)
      showToast('Đã tạo ca làm')
      setShiftModalOpen(false)
      setShiftForm(emptyShiftForm)
      await loadAll()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không tạo được ca làm')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateAssignment = async () => {
    if (!assignForm.staffUserId || !assignForm.workShiftId || !assignForm.workDate) {
      showToast('Vui lòng chọn nhân viên, ca và ngày')
      return
    }
    setSaving(true)
    try {
      await createManagerShiftAssignment(assignForm)
      showToast('Đã phân ca')
      setAssignModalOpen(false)
      setAssignForm(emptyAssignForm)
      await loadAll()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không phân ca được')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAssignment = async () => {
    if (!deleteAssignId) return
    setDeleting(true)
    try {
      await deleteManagerShiftAssignment(deleteAssignId)
      showToast('Đã xóa phân ca')
      setDeleteAssignId(null)
      await loadAll()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không xóa được phân ca')
    } finally {
      setDeleting(false)
    }
  }

  const handleReviewOvertime = async (id, isApproved) => {
    try {
      await reviewManagerOvertimeRequest(id, { isApproved })
      showToast(isApproved ? 'Đã duyệt tăng ca' : 'Đã từ chối tăng ca')
      await loadAll()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không xử lý được yêu cầu')
    }
  }

  const handleReviewSwap = async (id, isApproved) => {
    try {
      await reviewManagerShiftSwapRequest(id, { isApproved })
      showToast(isApproved ? 'Đã duyệt đổi ca' : 'Đã từ chối đổi ca')
      await loadAll()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không xử lý được yêu cầu')
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Quản lý ca làm"
        description="Ca làm, phân ca, duyệt tăng ca và đổi ca nhân viên"
        actionLabel={tab === 'assignments' ? 'Phân ca' : tab === 'shifts' ? 'Thêm ca' : undefined}
        onAction={
          tab === 'assignments'
            ? () => setAssignModalOpen(true)
            : tab === 'shifts'
            ? () => setShiftModalOpen(true)
            : undefined
        }
      />

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? 'bg-secondary text-on-secondary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-error-container bg-error-container/30 px-4 py-3 text-sm text-error">
          {loadError}
          <button type="button" className="ml-3 underline" onClick={loadAll}>
            Thử lại
          </button>
        </div>
      )}

      <div key={tab}>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Đang tải…</p>
        ) : tab === 'shifts' ? (
          workShifts.length === 0 ? (
            <EmptyState icon="schedule" title="Chưa có ca làm" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-xs uppercase text-on-surface-variant">
                    <th className="px-4 py-3">Tên ca</th>
                    <th className="px-4 py-3">Bắt đầu</th>
                    <th className="px-4 py-3">Kết thúc</th>
                    <th className="px-4 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {workShifts.map((shift) => (
                    <tr key={shift.workShiftId}>
                      <td className="px-4 py-3 font-medium">{shift.shiftName}</td>
                      <td className="px-4 py-3">{toTimeInputValue(shift.startTime)}</td>
                      <td className="px-4 py-3">{toTimeInputValue(shift.endTime)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={shift.isActive ? 'Active' : 'Cancelled'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : tab === 'assignments' ? (
          assignments.length === 0 ? (
            <EmptyState icon="badge" title="Chưa có phân ca" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-xs uppercase text-on-surface-variant">
                    <th className="px-4 py-3">Nhân viên</th>
                    <th className="px-4 py-3">Ca</th>
                    <th className="px-4 py-3">Ngày</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {assignments.map((row) => (
                    <tr key={row.shiftAssignmentId}>
                      <td className="px-4 py-3">{row.staffName}</td>
                      <td className="px-4 py-3">{row.shiftName}</td>
                      <td className="px-4 py-3">{formatDateTime(row.workDate)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-error hover:underline"
                          onClick={() => setDeleteAssignId(row.shiftAssignmentId)}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : tab === 'overtime' ? (
          overtimeRequests.length === 0 ? (
            <EmptyState icon="more_time" title="Không có yêu cầu tăng ca chờ duyệt" />
          ) : (
            <div className="space-y-3">
              {overtimeRequests.map((req) => (
                <div
                  key={req.overtimeRequestId}
                  className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-on-surface">{req.staffName}</p>
                      <p className="text-sm text-on-surface-variant">
                        {formatDateTime(req.workDate)} · {toTimeInputValue(req.startTime)} –{' '}
                        {toTimeInputValue(req.endTime)}
                      </p>
                      {req.reason && <p className="mt-1 text-sm text-on-surface-variant">{req.reason}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-primary px-3 py-1.5 text-sm text-on-primary"
                        onClick={() => handleReviewOvertime(req.overtimeRequestId, true)}
                      >
                        Duyệt
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm"
                        onClick={() => handleReviewOvertime(req.overtimeRequestId, false)}
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : swapRequests.length === 0 ? (
          <EmptyState icon="swap_horiz" title="Không có yêu cầu đổi ca chờ duyệt" />
        ) : (
          <div className="space-y-3">
            {swapRequests.map((req) => (
              <div
                key={req.shiftSwapRequestId}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-on-surface">{req.requesterName}</p>
                    <p className="text-sm text-on-surface-variant">
                      Ca #{req.fromAssignmentId} → Ca #{req.toAssignmentId}
                    </p>
                    {req.reason && <p className="mt-1 text-sm text-on-surface-variant">{req.reason}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm text-on-primary"
                      onClick={() => handleReviewSwap(req.shiftSwapRequestId, true)}
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm"
                      onClick={() => handleReviewSwap(req.shiftSwapRequestId, false)}
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FormModal
        open={shiftModalOpen}
        title="Thêm ca làm"
        submitLabel={saving ? 'Đang lưu…' : 'Lưu'}
        onClose={() => !saving && setShiftModalOpen(false)}
        onSubmit={handleCreateShift}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Tên ca</span>
            <input
              className="w-full rounded-lg border border-outline-variant px-3 py-2"
              value={shiftForm.shiftName}
              onChange={(e) => setShiftForm((f) => ({ ...f, shiftName: e.target.value }))}
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase text-on-surface-variant">Bắt đầu</span>
              <input
                type="time"
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                value={shiftForm.startTime}
                onChange={(e) => setShiftForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase text-on-surface-variant">Kết thúc</span>
              <input
                type="time"
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                value={shiftForm.endTime}
                onChange={(e) => setShiftForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </label>
          </div>
        </div>
      </FormModal>

      <FormModal
        open={assignModalOpen}
        title="Phân ca nhân viên"
        submitLabel={saving ? 'Đang lưu…' : 'Lưu'}
        onClose={() => !saving && setAssignModalOpen(false)}
        onSubmit={handleCreateAssignment}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Nhân viên</span>
            <select
              className="w-full rounded-lg border border-outline-variant px-3 py-2"
              value={assignForm.staffUserId}
              onChange={(e) => setAssignForm((f) => ({ ...f, staffUserId: e.target.value }))}
            >
              <option value="">— Chọn —</option>
              {staffs.map((s) => (
                <option key={s.userId ?? s.staffId} value={s.userId ?? s.staffId}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Ca làm</span>
            <select
              className="w-full rounded-lg border border-outline-variant px-3 py-2"
              value={assignForm.workShiftId}
              onChange={(e) => setAssignForm((f) => ({ ...f, workShiftId: e.target.value }))}
            >
              <option value="">— Chọn —</option>
              {workShifts.map((s) => (
                <option key={s.workShiftId} value={s.workShiftId}>
                  {s.shiftName} ({toTimeInputValue(s.startTime)} – {toTimeInputValue(s.endTime)})
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Ngày làm</span>
            <input
              type="date"
              className="w-full rounded-lg border border-outline-variant px-3 py-2"
              value={assignForm.workDate}
              onChange={(e) => setAssignForm((f) => ({ ...f, workDate: e.target.value }))}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Ghi chú</span>
            <input
              className="w-full rounded-lg border border-outline-variant px-3 py-2"
              value={assignForm.note}
              onChange={(e) => setAssignForm((f) => ({ ...f, note: e.target.value }))}
            />
          </label>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteAssignId)}
        title="Xóa phân ca"
        message="Bạn chắc chắn muốn xóa phân ca này?"
        confirmLabel={deleting ? 'Đang xóa…' : 'Xóa'}
        variant="danger"
        onConfirm={handleDeleteAssignment}
        onCancel={() => !deleting && setDeleteAssignId(null)}
      />
    </div>
  )
}
