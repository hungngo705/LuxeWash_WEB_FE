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
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import Input from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'

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
  const toast = useToast()

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
        toast.success('Đã cập nhật làn rửa')
      } else if (form.isBusinessLane) {
        await createBusinessLane(payload)
        toast.success('Đã thêm làn doanh nghiệp')
      } else {
        await createLane(payload)
        toast.success('Đã thêm làn rửa')
      }
      setModalOpen(false)
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không lưu được làn rửa')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Cơ sở vật hành"
        title="Làn rửa"
        description="Làn rửa gắn với chi nhánh — dùng cho phân công Manager"
        actionLabel="Thêm làn"
        actionIcon="add_road"
        onAction={openCreate}
      />

      {!loading && branches.length === 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-tertiary/30 bg-tertiary-container/20 px-4 py-3 text-sm text-on-surface">
          <span
            className="material-symbols-outlined mt-0.5 shrink-0 text-tertiary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            info
          </span>
          <p>Chưa có chi nhánh — hãy tạo chi nhánh trước.</p>
        </div>
      )}

      {loadError && (
        <div className="mb-4 flex justify-between rounded-lg border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{loadError}</p>
          <button type="button" className="text-sm text-error" onClick={loadData}>
            Thử lại
          </button>
        </div>
      )}

      <DataTable
        data={lanes}
        loading={loading}
        minWidth="720px"
        emptyIcon="garage"
        emptyTitle="Chưa có làn rửa"
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
            key: 'name',
            label: 'Tên làn',
            render: (row) => <span className="font-medium text-on-surface">{row.name}</span>,
          },
          {
            key: 'branchId',
            label: 'Chi nhánh',
            render: (row) => row.branchName ?? branchName(row.branchId),
            tdClassName: 'text-on-surface-variant',
          },
          {
            key: 'isBusinessLane',
            label: 'Loại làn',
            render: (row) =>
              row.isBusinessLane ? (
                <span className="inline-flex items-center rounded-full border border-secondary/30 bg-secondary-container/40 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-on-secondary-container uppercase">
                  Doanh nghiệp
                </span>
              ) : (
                <span className="text-on-surface-variant">Tiêu dùng</span>
              ),
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
            width: '100px',
            align: 'right',
            renderActions: (row) => (
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
            ),
          },
        ]}
      />

      <FormModal
        open={modalOpen}
        title={editingId ? 'Sửa làn rửa' : 'Thêm làn rửa'}
        submitLabel={saving ? 'Đang lưu…' : 'Lưu'}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <Input
            label="Tên làn"
            required
            value={form.name}
            maxLength={50}
            disabled={saving}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            iconLeft="garage"
          />
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