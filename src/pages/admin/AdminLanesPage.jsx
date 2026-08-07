import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createBusinessLane,
  createLane,
  fetchBranches,
  fetchLanes,
  updateLane,
} from '../../api'
import FormModal from '../../components/admin/shared/FormModal'
import EmptyState from '../../components/admin/shared/EmptyState'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'

const emptyForm = {
  name: '',
  branchId: '',
  isActive: true,
  isBusinessLane: false,
}

export default function AdminLanesPage() {
  const [lanes, setLanes] = useState([])
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

  const branchName = (branchId) =>
    branches.find((b) => b.id === branchId)?.name ?? `#${branchId}`

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [lanesData, branchesData] = await Promise.all([fetchLanes(), fetchBranches()])
      setLanes(lanesData)
      setBranches(branchesData)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách làn rửa')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openCreate = () => {
    setEditingId(null)
    setForm({
      ...emptyForm,
      branchId: branches[0]?.id ? String(branches[0].id) : '',
    })
    setModalOpen(true)
  }

  const openEdit = (lane) => {
    setEditingId(lane.id)
    setForm({
      name: lane.name,
      branchId: String(lane.branchId),
      isActive: lane.isActive !== false,
      isBusinessLane: lane.isBusinessLane === true,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.branchId || saving) return

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        branchId: Number(form.branchId),
        isBusinessLane: form.isBusinessLane,
      }
      if (editingId) {
        await updateLane(editingId, {
          ...payload,
          isActive: form.isActive,
        })
        showToast('Đã cập nhật làn rửa')
      } else if (form.isBusinessLane) {
        await createBusinessLane(payload)
        showToast('Đã thêm làn doanh nghiệp')
      } else {
        await createLane(payload)
        showToast('Đã thêm làn rửa')
      }
      setModalOpen(false)
      await loadData()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không lưu được làn rửa')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Làn rửa"
        description="Làn rửa gắn với chi nhánh — dùng cho phân công Manager"
        actionLabel="Thêm làn"
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

      {loadError && (
        <div className="mb-4 flex justify-between rounded-lg border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{loadError}</p>
          <button type="button" className="text-sm text-error" onClick={loadData}>
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải…</p>
      ) : lanes.length === 0 && !loadError ? (
        <EmptyState icon="garage" title="Chưa có làn rửa" />
      ) : (
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Tên làn</th>
                <th className="px-4 py-3">Chi nhánh</th>
                <th className="px-4 py-3">Loại làn</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {lanes.map((lane) => (
                <tr key={lane.id} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 text-on-surface-variant">#{lane.id}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">{lane.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {lane.branchName ?? branchName(lane.branchId)}
                  </td>
                  <td className="px-4 py-3">
                    {lane.isBusinessLane ? (
                      <span className="inline-flex items-center rounded-full border border-secondary/30 bg-secondary-container/40 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-on-secondary-container uppercase">
                        Doanh nghiệp
                      </span>
                    ) : (
                      <span className="text-on-surface-variant">Tiêu dùng</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lane.isActive !== false ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-primary hover:bg-primary-container/20"
                      onClick={() => openEdit(lane)}
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
        title={editingId ? 'Sửa làn rửa' : 'Thêm làn rửa'}
        submitLabel={saving ? 'Đang lưu…' : 'Lưu'}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Tên làn</span>
            <input
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.name}
              maxLength={50}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Chi nhánh</span>
            <select
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.branchId}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
              required
            >
              <option value="">— Chọn chi nhánh —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          {!editingId && (
            <label className="flex items-start gap-2 text-sm text-on-surface">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={form.isBusinessLane}
                disabled={saving}
                onChange={(e) => setForm((f) => ({ ...f, isBusinessLane: e.target.checked }))}
              />
              <span>
                <span className="font-medium">Làn doanh nghiệp (phục vụ fleet)</span>
                <span className="block text-xs text-on-surface-variant">
                  Tạo qua API riêng — làn này chỉ dùng cho đặt lịch của doanh nghiệp.
                </span>
              </span>
            </label>
          )}
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
