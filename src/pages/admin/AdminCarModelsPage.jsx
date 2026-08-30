import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createCarModel,
  deleteCarModel,
  fetchCarModels,
  updateCarModel,
  fetchVehicleTypes,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import Input from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'

const emptyForm = { brand: '', name: '', productionYear: '', version: '', isActive: true, vehicleTypeId: '' }

export default function AdminCarModelsPage() {
  const [models, setModels] = useState([])
  const [vehicleTypes, setVehicleTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [fetchedModels, fetchedTypes] = await Promise.all([
        fetchCarModels(),
        fetchVehicleTypes(),
      ])
      setModels(fetchedModels)
      setVehicleTypes(Array.isArray(fetchedTypes) ? fetchedTypes : [])
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (model) => {
    setEditingId(model.id)
    setForm({
      brand: model.brand ?? '',
      name: model.name ?? '',
      productionYear: model.productionYear != null ? String(model.productionYear) : '',
      version: model.version ?? '',
      isActive: model.isActive !== false,
      vehicleTypeId: model.vehicleTypeId != null ? String(model.vehicleTypeId) : '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (saving) return

    const trimmedBrand = form.brand.trim()
    const trimmedName = form.name.trim()

    if (!trimmedBrand) {
      toast.warning('Vui lòng nhập tên hãng xe')
      return
    }
    if (!trimmedName) {
      toast.warning('Vui lòng nhập tên dòng xe')
      return
    }

    setSaving(true)
    try {
      const payload = {
        brand: trimmedBrand,
        name: trimmedName,
        productionYear: form.productionYear ? Number(form.productionYear) : null,
        version: form.version.trim() || null,
        vehicleTypeId: form.vehicleTypeId ? Number(form.vehicleTypeId) : null,
      }
      if (editingId) {
        await updateCarModel(editingId, { ...payload, isActive: form.isActive })
        toast.success('Đã cập nhật mẫu xe')
      } else {
        await createCarModel(payload)
        toast.success('Đã thêm mẫu xe')
      }
      setModalOpen(false)
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không lưu được mẫu xe')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await deleteCarModel(deleteTarget)
      setDeleteTarget(null)
      toast.success('Đã xóa mẫu xe')
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không xóa được mẫu xe')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Dịch vụ & Xe"
        title="Mẫu xe (hãng / dòng)"
        description="Quản lý CarModels cho khách chọn khi đăng ký xe. Mẫu mới do user gửi cần Staff xác minh tại Duyệt loại xe trước khi dùng chính thức."
        actionLabel="Thêm mẫu xe"
        actionIcon="add_circle"
        onAction={openCreate}
      />

      {loadError && (
        <div className="mb-4 flex justify-between rounded-lg border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{loadError}</p>
          <button type="button" className="text-sm text-error" onClick={loadData}>
            Thử lại
          </button>
        </div>
      )}

      <DataTable
        data={models}
        loading={loading}
        minWidth="560px"
        emptyIcon="commute"
        emptyTitle="Chưa có mẫu xe"
        columns={[
          {
            key: 'id',
            label: 'ID',
            width: '80px',
            render: (row) => (
              <span className="font-mono text-on-surface-variant">#{row.id}</span>
            ),
          },
          {
            key: 'brand',
            label: 'Hãng',
            render: (row) => row.brand || '—',
          },
          {
            key: 'name',
            label: 'Dòng xe',
            render: (row) => (
              <span className="font-medium text-on-surface">{row.name || '—'}</span>
            ),
          },
          {
            key: 'productionYear',
            label: 'Năm SX',
            render: (row) => row.productionYear ?? '—',
            tdClassName: 'text-on-surface-variant',
          },
          {
            key: 'version',
            label: 'Phiên bản',
            render: (row) => row.version || '—',
            tdClassName: 'text-on-surface-variant',
          },
          {
            key: 'vehicleTypeId',
            label: 'Loại xe',
            render: (row) =>
              row.vehicleTypeId
                ? vehicleTypes.find((t) => t.id === row.vehicleTypeId)?.name || '—'
                : '—',
          },
          {
            key: 'isActive',
            label: 'Trạng thái',
            width: '140px',
            render: (row) => (
              <StatusBadge status={row.isActive !== false ? 'Active' : 'Inactive'} />
            ),
          },
          {
            key: 'actions',
            label: 'Thao tác',
            width: '140px',
            align: 'right',
            renderActions: (row) => (
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary-container/30"
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
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-error transition-colors hover:bg-error-container/30"
                  onClick={() => setDeleteTarget(row.id)}
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
        title={editingId ? 'Sửa mẫu xe' : 'Thêm mẫu xe'}
        submitLabel={saving ? 'Đang lưu…' : 'Lưu'}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <Input
            label="Hãng"
            required
            value={form.brand}
            disabled={saving}
            onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            iconLeft="directions_car"
          />
          <Input
            label="Dòng xe"
            required
            value={form.name}
            disabled={saving}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            iconLeft="commute"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Năm sản xuất"
              type="number"
              min={1980}
              max={2100}
              placeholder="2024"
              value={form.productionYear}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, productionYear: e.target.value }))}
            />
            <Input
              label="Phiên bản"
              placeholder="VD: 2.5Q, XLE"
              value={form.version}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
            />
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Loại xe</span>
            <select
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.vehicleTypeId}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, vehicleTypeId: e.target.value }))}
            >
              <option value="">— Chưa chọn —</option>
              {vehicleTypes.map((vt) => (
                <option key={vt.id} value={vt.id}>
                  {vt.name} {vt.description ? `— ${vt.description}` : ''}
                </option>
              ))}
            </select>
          </label>
          {editingId && (
            <label className="flex items-center gap-2 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={form.isActive}
                disabled={saving}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Đang hoạt động
            </label>
          )}
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa mẫu xe"
        message="Bạn chắc chắn muốn xóa mẫu xe này?"
        confirmLabel={deleting ? 'Đang xóa…' : 'Xóa'}
        loading={deleting}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  )
}