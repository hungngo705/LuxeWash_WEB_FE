import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createVehicleType,
  deleteVehicleType,
  fetchVehicleTypes,
  updateVehicleType,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'

const emptyForm = { name: '', description: '' }

export default function AdminVehicleTypesPage() {
  const [vehicleTypes, setVehicleTypes] = useState([])
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

  const loadVehicleTypes = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchVehicleTypes()
      setVehicleTypes(Array.isArray(data) ? data : [])
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
        showToast('Đã cập nhật loại xe')
      } else {
        await createVehicleType(payload)
        showToast('Đã thêm loại xe mới')
      }

      setModalOpen(false)
      await loadVehicleTypes()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không lưu được loại xe')
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
      showToast('Đã xóa loại xe')
      await loadVehicleTypes()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không xóa được loại xe')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Loại xe"
        description="Quản lý danh mục loại xe phục vụ đặt giá dịch vụ"
        actionLabel="Thêm loại xe"
        onAction={openCreate}
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
            onClick={loadVehicleTypes}
          >
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải danh sách loại xe…</p>
      ) : vehicleTypes.length === 0 && !loadError ? (
        <EmptyState icon="directions_car" title="Chưa có loại xe" />
      ) : (
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Mô tả</th>
                <th className="px-4 py-3">Dịch vụ liên kết</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {vehicleTypes.map((vt) => (
                <tr key={vt.id} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 text-on-surface-variant">#{vt.id}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">{vt.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{vt.description || '—'}</td>
                  <td className="px-4 py-3 text-on-surface-variant">—</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-primary hover:bg-primary-container/20"
                        onClick={() => openEdit(vt)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-error hover:bg-error-container/20"
                        onClick={() => setDeleteTarget(vt.id)}
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
        title={editingId ? 'Sửa loại xe' : 'Thêm loại xe'}
        submitLabel={saving ? 'Đang lưu…' : 'Lưu'}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Tên loại xe
            </span>
            <input
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              disabled={saving}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Mô tả
            </span>
            <textarea
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
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
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  )
}
