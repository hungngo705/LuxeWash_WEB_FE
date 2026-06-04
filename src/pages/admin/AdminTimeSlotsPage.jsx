import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createTimeSlot,
  deleteTimeSlot,
  fetchBranches,
  fetchTimeSlots,
  toApiTimeValue,
  toTimeInputValue,
  updateTimeSlot,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'

const emptyForm = {
  startTime: '07:00',
  endTime: '07:20',
  maxCapacity: 3,
  isVipOnly: false,
}

function toApiPayload(form, branchId) {
  return {
    startTime: toApiTimeValue(form.startTime),
    endTime: toApiTimeValue(form.endTime),
    maxCapacity: Number(form.maxCapacity),
    isVipOnly: Boolean(form.isVipOnly),
    branchId: branchId ? Number(branchId) : undefined,
  }
}

function validateForm(form) {
  if (!form.startTime || !form.endTime) return 'Vui lòng chọn giờ bắt đầu và kết thúc'
  if (form.startTime >= form.endTime) return 'Giờ kết thúc phải sau giờ bắt đầu'
  if (Number(form.maxCapacity) < 1) return 'Sức chứa phải ít nhất 1'
  return null
}

export default function AdminTimeSlotsPage() {
  const [slots, setSlots] = useState([])
  const [branches, setBranches] = useState([])
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const branchName = (branchId) =>
    branches.find((b) => b.id === Number(branchId))?.name ?? `#${branchId}`

  const loadSlots = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [slotsData, branchesData] = await Promise.all([
        fetchTimeSlots(selectedBranchId ? { branchId: selectedBranchId } : {}),
        fetchBranches(),
      ])
      setSlots(Array.isArray(slotsData) ? slotsData : [])
      setBranches(Array.isArray(branchesData) ? branchesData : [])
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách khung giờ')
    } finally {
      setLoading(false)
    }
  }, [selectedBranchId])

  useEffect(() => {
    loadSlots()
  }, [loadSlots])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (slot) => {
    setEditingId(slot.slotId)
    setForm({
      startTime: toTimeInputValue(slot.startTime),
      endTime: toTimeInputValue(slot.endTime),
      maxCapacity: slot.maxCapacity,
      isVipOnly: slot.isVipOnly,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (saving) return

    if (!selectedBranchId && !editingId) {
      showToast('Vui lòng chọn chi nhánh trước khi thêm khung giờ')
      return
    }

    const validationError = validateForm(form)
    if (validationError) {
      showToast(validationError)
      return
    }

    const payload = toApiPayload(form, selectedBranchId)

    setSaving(true)
    try {
      if (editingId) {
        await updateTimeSlot(editingId, payload)
        showToast('Đã cập nhật khung giờ')
      } else {
        await createTimeSlot(payload)
        showToast('Đã thêm khung giờ mới')
      }
      setModalOpen(false)
      await loadSlots()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không lưu được khung giờ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return

    setDeleting(true)
    try {
      await deleteTimeSlot(deleteTarget)
      setDeleteTarget(null)
      showToast('Đã xóa khung giờ')
      await loadSlots()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không xóa được khung giờ')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Khung giờ đặt lịch"
        description="Cấu hình slot trong ngày và capacity"
        actionLabel="Thêm khung giờ"
        onAction={openCreate}
      />

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      {!loading && branches.length === 0 && (
        <p className="mb-4 rounded-lg border border-tertiary/30 bg-tertiary-container/20 px-4 py-2 text-sm text-on-surface">
          Chưa có chi nhánh — hãy tạo chi nhánh trước.
        </p>
      )}

      {!loading && branches.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-base">store</span>
            Chi nhánh:
          </label>
          <select
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            <option value="">Tất cả chi nhánh</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loadError && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="rounded-lg border border-error/30 px-3 py-1.5 text-sm font-medium text-error hover:bg-error-container/20"
            onClick={loadSlots}
          >
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải khung giờ...</p>
      ) : slots.length === 0 && !loadError ? (
        <EmptyState icon="schedule" title="Chưa có khung giờ" />
      ) : (
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Chi nhánh</th>
                <th className="px-4 py-3">Giờ bắt đầu</th>
                <th className="px-4 py-3">Giờ kết thúc</th>
                <th className="px-4 py-3">Sức chứa</th>
                <th className="px-4 py-3">Phân loại</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {slots.map((slot) => (
                <tr key={slot.slotId} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 text-on-surface-variant">#{slot.slotId}</td>
                  <td className="px-4 py-3 text-on-surface">{branchName(slot.branchId)}</td>
                  <td className="px-4 py-3 text-on-surface">{toTimeInputValue(slot.startTime)}</td>
                  <td className="px-4 py-3 text-on-surface">{toTimeInputValue(slot.endTime)}</td>
                  <td className="px-4 py-3 text-on-surface">{slot.maxCapacity}</td>
                  <td className="px-4 py-3">
                    {slot.isVipOnly ? (
                      <span className="rounded-full bg-tertiary-container px-2 py-0.5 text-xs font-semibold text-on-tertiary-container">
                        VIP
                      </span>
                    ) : (
                      <span className="text-on-surface-variant">Thường</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-primary hover:bg-primary-container/20"
                        onClick={() => openEdit(slot)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-error hover:bg-error-container/20"
                        onClick={() => setDeleteTarget(slot.slotId)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormModal
        open={modalOpen}
        title={editingId ? 'Sửa khung giờ' : 'Thêm khung giờ'}
        submitLabel={saving ? 'Đang lưu...' : 'Lưu'}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          {branches.length > 0 && !editingId && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Chi nhánh</span>
              <select
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={selectedBranchId}
                disabled={saving}
                onChange={(e) => setSelectedBranchId(e.target.value)}
              >
                <option value="">Chọn chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Giờ bắt đầu
              </span>
              <input
                type="time"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={form.startTime}
                disabled={saving}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Giờ kết thúc
              </span>
              <input
                type="time"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={form.endTime}
                disabled={saving}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Sức chứa (xe)
            </span>
            <input
              type="number"
              min="1"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.maxCapacity}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, maxCapacity: Number(e.target.value) }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={form.isVipOnly}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, isVipOnly: e.target.checked }))}
            />
            Chỉ dành cho khách VIP
          </label>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa khung giờ"
        message="Bạn chắc chắn muốn xóa khung giờ này?"
        confirmLabel={deleting ? 'Đang xóa...' : 'Xóa'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  )
}
