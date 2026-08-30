import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createVehicleType,
  deleteVehicleType,
  fetchServices,
  fetchVehicleTypes,
  updateVehicleType,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import DataTable from '../../components/ui/DataTable'
import Input from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'

const emptyForm = { name: '', description: '' }

export default function AdminVehicleTypesPage() {
  const [vehicleTypes, setVehicleTypes] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  const loadVehicleTypes = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [typesData, servicesData] = await Promise.all([fetchVehicleTypes(), fetchServices()])
      setVehicleTypes(Array.isArray(typesData) ? typesData : [])
      setServices(Array.isArray(servicesData) ? servicesData : [])
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách loại xe')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVehicleTypes()
  }, [loadVehicleTypes])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (vt) => {
    setEditingId(vt.id)
    setForm({ name: vt.name, description: vt.description ?? '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || saving) return

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateVehicleType(editingId, payload)
        toast.success('Đã cập nhật loại xe')
      } else {
        await createVehicleType(payload)
        toast.success('Đã thêm loại xe mới')
      }

      setModalOpen(false)
      await loadVehicleTypes()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không lưu được loại xe')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return

    setDeleting(true)
    try {
      await deleteVehicleType(deleteTarget)
      setDeleteTarget(null)
      toast.success('Đã xóa loại xe')
      await loadVehicleTypes()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không xóa được loại xe')
    } finally {
      setDeleting(false)
    }
  }

  const countLinkedServices = (vehicleTypeId) =>
    services.filter((s) =>
      s.isActive !== false && s.prices?.some((p) => p.vehicleTypeId === vehicleTypeId),
    ).length

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Dịch vụ & Xe"
        title="Loại xe"
        description="Quản lý danh mục loại xe phục vụ đặt giá dịch vụ"
        actionLabel="Thêm loại xe"
        actionIcon="directions_car"
        onAction={openCreate}
      />

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="rounded-lg border border-error/40 px-3 py-1.5 text-sm font-medium text-error transition-colors hover:bg-error-container/40"
            onClick={loadVehicleTypes}
          >
            Thử lại
          </button>
        </div>
      )}

      <DataTable
        data={vehicleTypes}
        loading={loading}
        minWidth="640px"
        emptyIcon="directions_car"
        emptyTitle="Chưa có loại xe"
        columns={[
          {
            key: 'id',
            label: 'ID',
            width: '80px',
            render: (vt) => <span className="font-mono text-on-surface-variant">#{vt.id}</span>,
          },
          {
            key: 'name',
            label: 'Tên',
            render: (vt) => <span className="font-medium">{vt.name}</span>,
          },
          {
            key: 'description',
            label: 'Mô tả',
            render: (vt) => vt.description || '—',
            tdClassName: 'text-on-surface-variant',
          },
          {
            key: 'linkedServices',
            label: 'Dịch vụ liên kết',
            width: '160px',
            align: 'center',
            render: (vt) => (
              <span className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded-full bg-primary-container/40 px-2 text-xs font-semibold text-primary">
                {countLinkedServices(vt.id)}
              </span>
            ),
          },
          {
            key: 'actions',
            label: 'Thao tác',
            width: '140px',
            align: 'right',
            renderActions: (vt) => (
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary-container/30"
                  onClick={() => openEdit(vt)}
                >
                  Sửa
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-error transition-colors hover:bg-error-container/30"
                  onClick={() => setDeleteTarget(vt.id)}
                >
                  Xóa
                </button>
              </div>
            ),
          },
        ]}
      />

      <FormModal
        open={modalOpen}
        title={editingId ? 'Sửa loại xe' : 'Thêm loại xe'}
        submitLabel={saving ? 'Đang lưu…' : 'Lưu'}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <Input
            label="Tên loại xe"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={saving}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
              Mô tả
            </span>
            <textarea
              className="rounded-lg border border-outline-variant bg-white px-3.5 py-2 text-sm text-on-surface focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={saving}
            />
          </label>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa loại xe"
        message="Bạn chắc chắn muốn xóa loại xe này?"
        confirmLabel={deleting ? 'Đang xóa…' : 'Xóa'}
        loading={deleting}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  )
}