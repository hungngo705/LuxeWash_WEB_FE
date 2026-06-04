import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createCarModel,
  deleteCarModel,
  fetchCarModels,
  updateCarModel,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'

const emptyForm = { brand: '', name: '', isActive: true }

export default function AdminCarModelsPage() {
  const [models, setModels] = useState([])
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

  const loadModels = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setModels(await fetchCarModels())
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được mẫu xe')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadModels()
  }, [loadModels])

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
      isActive: model.isActive !== false,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (saving) return

    const trimmedBrand = form.brand.trim()
    const trimmedName = form.name.trim()

    if (!trimmedBrand) {
      showToast('Vui lòng nhập tên hãng xe')
      return
    }
    if (!trimmedName) {
      showToast('Vui lòng nhập tên dòng xe')
      return
    }

    setSaving(true)
    try {
      const payload = { brand: trimmedBrand, name: trimmedName }
      if (editingId) {
        await updateCarModel(editingId, { ...payload, isActive: form.isActive })
        showToast('Đã cập nhật mẫu xe')
      } else {
        await createCarModel(payload)
        showToast('Đã thêm mẫu xe')
      }
      setModalOpen(false)
      await loadModels()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không lưu được mẫu xe')
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
      showToast('Đã xóa mẫu xe')
      await loadModels()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không xóa được mẫu xe')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Mẫu xe (hãng / dòng)"
        description="Danh mục CarModels — khác Loại xe (vehicle-types) dùng cho giá dịch vụ"
        actionLabel="Thêm mẫu xe"
        onAction={openCreate}
      />

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      {loadError && (
        <div className="mb-4 flex justify-between rounded-lg border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{loadError}</p>
          <button type="button" className="text-sm text-error" onClick={loadModels}>
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải…</p>
      ) : models.length === 0 && !loadError ? (
        <EmptyState icon="commute" title="Chưa có mẫu xe" />
      ) : (
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Hãng</th>
                <th className="px-4 py-3">Dòng xe</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {models.map((model) => (
                <tr key={model.id} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 text-on-surface-variant">#{model.id}</td>
                  <td className="px-4 py-3 text-on-surface">{model.brand || '—'}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">{model.name || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={model.isActive !== false ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-primary hover:bg-primary-container/20"
                        onClick={() => openEdit(model)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-error hover:bg-error-container/20"
                        onClick={() => setDeleteTarget(model.id)}
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
        title={editingId ? 'Sửa mẫu xe' : 'Thêm mẫu xe'}
        submitLabel={saving ? 'Đang lưu…' : 'Lưu'}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Hãng</span>
            <input
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.brand}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Dòng xe</span>
            <input
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.name}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
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
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  )
}
