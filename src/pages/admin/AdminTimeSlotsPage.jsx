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
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import DataTable from '../../components/ui/DataTable'
import Input from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'

const emptyForm = {
  startTime: '00:00',
  endTime: '00:00',
  maxCapacity: '3',
}

function toApiPayload(form, branchId) {
  return {
    branchId: Number(branchId),
    startTime: toApiTimeValue(form.startTime),
    endTime: toApiTimeValue(form.endTime),
    maxCapacity: Number(form.maxCapacity || 0),
  }
}

function validateForm(form) {
  if (!form.startTime || !form.endTime) return 'Vui lòng chọn giờ bắt đầu và kết thúc'
  if (form.startTime >= form.endTime) return 'Thời gian kết thúc phải sau thời gian bắt đầu'
  if (!form.maxCapacity || Number(form.maxCapacity) < 1) return 'Sức chứa phải ít nhất 1'
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
  const [branchBeforeEdit, setBranchBeforeEdit] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()
  const [formError, setFormError] = useState('')

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
    setFormError('')
    setBranchBeforeEdit(null)
    setModalOpen(true)
  }

  const openEdit = (slot) => {
    setEditingId(slot.slotId)
    setBranchBeforeEdit(selectedBranchId)
    if (slot.branchId != null) {
      setSelectedBranchId(String(slot.branchId))
    }
    setForm({
      startTime: toTimeInputValue(slot.startTime),
      endTime: toTimeInputValue(slot.endTime),
      maxCapacity: String(slot.maxCapacity ?? ''),
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (saving) return

    if (!selectedBranchId) {
      setFormError('Vui lòng chọn chi nhánh trước khi lưu')
      return
    }

    setFormError('')

    const validationError = validateForm(form)
    if (validationError) {
      setFormError(validationError)
      return
    }

    const payload = toApiPayload(form, selectedBranchId)

    setSaving(true)
    try {
      if (editingId) {
        await updateTimeSlot(editingId, payload)
        toast.success('Đã cập nhật khung giờ')
      } else {
        await createTimeSlot(payload)
        toast.success('Đã thêm khung giờ mới')
      }
      if (branchBeforeEdit !== null) {
        setSelectedBranchId(branchBeforeEdit)
        setBranchBeforeEdit(null)
      }
      setEditingId(null)
      setForm(emptyForm)
      setModalOpen(false)
      await loadSlots()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không lưu được khung giờ')
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
      toast.success('Đã xóa khung giờ')
      await loadSlots()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không xóa được khung giờ')
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { key: 'slotId', label: 'ID', width: '80px', render: (slot) => <span className="text-on-surface-variant">#{slot.slotId}</span> },
    { key: 'branchId', label: 'Chi nhánh', render: (slot) => branchName(slot.branchId) },
    { key: 'startTime', label: 'Thời gian bắt đầu', render: (slot) => toTimeInputValue(slot.startTime) },
    { key: 'endTime', label: 'Thời gian kết thúc', render: (slot) => toTimeInputValue(slot.endTime) },
    { key: 'maxCapacity', label: 'Sức chứa' },
    {
      key: 'actions',
      label: 'Thao tác',
      width: '160px',
      renderActions: (slot) => (
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-primary hover:bg-primary-container/20"
            onClick={() => openEdit(slot)}
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 0" }}>
              edit
            </span>
            Sửa
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-error hover:bg-error-container/20"
            onClick={() => setDeleteTarget(slot.slotId)}
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 0" }}>
              delete
            </span>
            Xóa
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Cơ sở vật hành"
        title="Khung giờ đặt lịch"
        description=""
        actionLabel="Thêm khung giờ"
        actionIcon="add"
        onAction={openCreate}
      />

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

      <DataTable
        columns={columns}
        data={slots}
        loading={loading}
        emptyIcon="schedule"
        emptyTitle="Chưa có khung giờ"
        minWidth="700px"
      />

      <FormModal
        open={modalOpen}
        title={editingId ? 'Sửa khung giờ' : 'Thêm khung giờ'}
        submitLabel={saving ? 'Đang lưu...' : 'Lưu'}
        onClose={() => {
          if (!saving) {
            setModalOpen(false)
            setFormError('')
            if (branchBeforeEdit !== null) {
              setSelectedBranchId(branchBeforeEdit)
              setBranchBeforeEdit(null)
            }
            setEditingId(null)
            setForm(emptyForm)
          }
        }}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          {branches.length > 0 && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Chi nhánh <span className="text-error">*</span></span>
              <select
                className={`w-full rounded-lg border bg-surface-container-lowest px-3 py-2 ${
                  formError && !selectedBranchId ? 'border-error' : 'border-outline-variant'
                }`}
                value={selectedBranchId}
                disabled={saving}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value)
                  if (e.target.value) setFormError('')
                }}
              >
                <option value="">Chọn chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {formError && !selectedBranchId && (
                <p className="mt-1 text-xs text-error">{formError}</p>
              )}
            </label>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="time"
              label="Thời gian bắt đầu"
              value={form.startTime}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            />
            <Input
              type="time"
              label="Thời gian kết thúc"
              value={form.endTime}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
            />
          </div>
          <Input
            type="number"
            min="1"
            label="Sức chứa (xe)"
            placeholder="VD: 3"
            value={form.maxCapacity}
            disabled={saving}
            onChange={(e) => setForm((f) => ({ ...f, maxCapacity: e.target.value }))}
          />
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa khung giờ"
        message="Bạn chắc chắn muốn xóa khung giờ này?"
        confirmLabel={deleting ? 'Đang xóa...' : 'Xóa'}
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  )
}