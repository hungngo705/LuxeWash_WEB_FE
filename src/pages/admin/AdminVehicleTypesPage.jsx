import { useMemo, useState } from 'react'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import { initialAdminServices } from '../../data/mockAdminServices'
import { initialAdminVehicleTypes } from '../../data/mockAdminVehicleTypes'

const emptyForm = { name: '', description: '' }

export default function AdminVehicleTypesPage() {
  const [vehicleTypes, setVehicleTypes] = useState(initialAdminVehicleTypes)
  const [services] = useState(initialAdminServices)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState('')

  const nextId = useMemo(
    () => (vehicleTypes.length ? Math.max(...vehicleTypes.map((v) => v.vehicleTypeId)) + 1 : 1),
    [vehicleTypes],
  )

  const countLinkedServices = (vehicleTypeId) =>
    services.filter((s) => s.prices.some((p) => p.vehicleTypeId === vehicleTypeId)).length

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (vt) => {
    setEditingId(vt.vehicleTypeId)
    setForm({ name: vt.name, description: vt.description })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return

    if (editingId) {
      setVehicleTypes((prev) =>
        prev.map((v) =>
          v.vehicleTypeId === editingId ? { ...v, name: form.name, description: form.description } : v,
        ),
      )
    } else {
      setVehicleTypes((prev) => [
        ...prev,
        { vehicleTypeId: nextId, name: form.name, description: form.description },
      ])
    }

    setModalOpen(false)
    showToast('Đã lưu (mock)')
  }

  const handleDelete = () => {
    setVehicleTypes((prev) => prev.filter((v) => v.vehicleTypeId !== deleteTarget))
    setDeleteTarget(null)
    showToast('Đã xóa loại xe (mock)')
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

      {vehicleTypes.length === 0 ? (
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
                <tr key={vt.vehicleTypeId} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 text-on-surface-variant">#{vt.vehicleTypeId}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">{vt.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{vt.description}</td>
                  <td className="px-4 py-3 text-on-surface">{countLinkedServices(vt.vehicleTypeId)}</td>
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
                        onClick={() => setDeleteTarget(vt.vehicleTypeId)}
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
        onClose={() => setModalOpen(false)}
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
            />
          </label>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa loại xe"
        message="Bạn chắc chắn muốn xóa loại xe này?"
        confirmLabel="Xóa"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
