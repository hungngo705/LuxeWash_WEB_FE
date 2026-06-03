import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createBranch,
  fetchBranches,
  updateBranch,
} from '../../api'
import FormModal from '../../components/admin/shared/FormModal'
import EmptyState from '../../components/admin/shared/EmptyState'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'

const emptyForm = { name: '', address: '', isActive: true }

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadBranches = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setBranches(await fetchBranches())
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách chi nhánh')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (branch) => {
    setEditingId(branch.id)
    setForm({
      name: branch.name,
      address: branch.address ?? '',
      isActive: branch.isActive !== false,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || saving) return

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
      }
      if (editingId) {
        await updateBranch(editingId, { ...payload, isActive: form.isActive })
        showToast('Đã cập nhật chi nhánh')
      } else {
        await createBranch(payload)
        showToast('Đã thêm chi nhánh')
      }
      setModalOpen(false)
      await loadBranches()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không lưu được chi nhánh')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Chi nhánh"
        description="Quản lý chi nhánh — tạo trước khi cấu hình làn rửa"
        actionLabel="Thêm chi nhánh"
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
          <button type="button" className="text-sm text-error" onClick={loadBranches}>
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải…</p>
      ) : branches.length === 0 && !loadError ? (
        <EmptyState icon="store" title="Chưa có chi nhánh" />
      ) : (
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Địa chỉ</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 text-on-surface-variant">#{branch.id}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">{branch.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{branch.address || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={branch.isActive !== false ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-primary hover:bg-primary-container/20"
                      onClick={() => openEdit(branch)}
                    >
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormModal
        open={modalOpen}
        title={editingId ? 'Sửa chi nhánh' : 'Thêm chi nhánh'}
        submitLabel={saving ? 'Đang lưu…' : 'Lưu'}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Tên</span>
            <input
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.name}
              maxLength={100}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Địa chỉ</span>
            <input
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.address}
              maxLength={255}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
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
    </div>
  )
}
