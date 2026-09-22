import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createManagerTimeSlot,
  deleteManagerTimeSlot,
  fetchManagerTimeSlots,
  toTimeInputValue,
  updateManagerTimeSlot,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import DataTable from '../../components/ui/DataTable'
import Input from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'

const emptyForm = {
  startTime: '07:00',
  endTime: '07:20',
  maxCapacity: 3,
}

function validateForm(form) {
  if (!form.startTime || !form.endTime) return 'Vui lòng chọn thời gian bắt đầu và kết thúc'
  if (form.startTime >= form.endTime) return 'Thời gian kết thúc phải sau thời gian bắt đầu'
  if (Number(form.maxCapacity) < 1) return 'Sức chứa phải ít nhất 1'
  return null
}

export default function ManagerTimeSlotsPage() {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  const loadSlots = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchManagerTimeSlots()
      setSlots(Array.isArray(data) ? data : [])
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách khung giờ')
    } finally {
      setLoading(false)
    }
  }, [])

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
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (saving) return

    const validationError = validateForm(form)
    if (validationError) {
      toast.warning(validationError)
      return
    }

    const payload = {
      startTime: form.startTime,
      endTime: form.endTime,
      maxCapacity: Number(form.maxCapacity),
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateManagerTimeSlot(editingId, payload)
        toast.success('Đã cập nhật khung giờ')
      } else {
        await createManagerTimeSlot(payload)
        toast.success('Đã thêm khung giờ mới')
      }
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
      await deleteManagerTimeSlot(deleteTarget.slotId)
      setDeleteTarget(null)
      toast.success('Đã xóa khung giờ')
      await loadSlots()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không xóa được khung giờ')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Cấu hình chi nhánh"
        title="Khung giờ đặt lịch"
        description="Cấu hình khung giờ phục vụ tại chi nhánh của bạn"
        actionLabel="Thêm khung giờ"
        actionIcon="schedule"
        onAction={openCreate}
      />

      {loadError && (
        <div className="mb-4 flex justify-between rounded-lg border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{loadError}</p>
          <button type="button" className="text-sm text-error" onClick={loadSlots}>
            Thử lại
          </button>
        </div>
      )}

      <DataTable
        data={slots}
        loading={loading}
        minWidth="640px"
        emptyIcon="schedule"
        emptyTitle="Chưa có khung giờ"
        emptyMessage="Thêm khung giờ để khách hàng có thể đặt lịch."
        columns={[
          {
            key: 'id',
            label: 'ID',
            width: '80px',
            render: (row) => (
              <span className="font-mono text-on-surface-variant">#{row.slotId}</span>
            ),
          },
          {
            key: 'startTime',
            label: 'Thời gian bắt đầu',
            render: (row) => (
              <span className="text-on-surface">{toTimeInputValue(row.startTime)}</span>
            ),
          },
          {
            key: 'endTime',
            label: 'Thời gian kết thúc',
            render: (row) => (
              <span className="text-on-surface">{toTimeInputValue(row.endTime)}</span>
            ),
          },
          {
            key: 'maxCapacity',
            label: 'Sức chứa',
            render: (row) => <span className="text-on-surface">{row.maxCapacity}</span>,
          },
          {
            key: 'actions',
            label: 'Thao tác',
            width: '160px',
            align: 'right',
            renderActions: (row) => (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-primary transition-colors hover:bg-primary-container/20"
                  onClick={() => openEdit(row)}
                >
                  <span
                    className="material-symbols-outlined text-[14px]"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    edit
                  </span>
                  Sửa
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-error transition-colors hover:bg-error-container/20"
                  onClick={() => setDeleteTarget(row)}
                >
                  <span
                    className="material-symbols-outlined text-[14px]"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    delete
                  </span>
                  Xóa
                </button>
              </div>
            ),
          },
        ]}
      />

      <FormModal
        open={modalOpen}
        title={editingId ? 'Sửa khung giờ' : 'Thêm khung giờ'}
        submitLabel={saving ? 'Đang lưu...' : 'Lưu'}
        onClose={() => {
          if (!saving) {
            setModalOpen(false)
            setEditingId(null)
          }
        }}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Thời gian bắt đầu"
              type="time"
              value={form.startTime}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              iconLeft="schedule"
            />
            <Input
              label="Thời gian kết thúc"
              type="time"
              value={form.endTime}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              iconLeft="schedule"
            />
          </div>
          <Input
            label="Sức chứa (xe)"
            type="number"
            min="1"
            value={form.maxCapacity}
            disabled={saving}
            onChange={(e) => setForm((f) => ({ ...f, maxCapacity: Number(e.target.value) }))}
            iconLeft="group"
          />
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa khung giờ"
        message={
          deleteTarget
            ? `Bạn chắc chắn muốn xóa khung giờ ${toTimeInputValue(deleteTarget.startTime)} – ${toTimeInputValue(deleteTarget.endTime)}?`
            : ''
        }
        confirmLabel={deleting ? 'Đang xóa...' : 'Xóa'}
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  )
}
