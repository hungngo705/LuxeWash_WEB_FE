import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createBranch,
  fetchAdminBranches,
  updateBranch,
} from '../../api'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import Input from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'

const emptyForm = { name: '', address: '', isActive: true }

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const loadBranches = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setBranches(await fetchAdminBranches())
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
        toast.success('Đã cập nhật chi nhánh')
      } else {
        await createBranch(payload)
        toast.success('Đã thêm chi nhánh')
      }
      setModalOpen(false)
      await loadBranches()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không lưu được chi nhánh')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Cơ sở vật hành"
        title="Chi nhánh"
        description="Quản lý chi nhánh — tạo trước khi cấu hình làn rửa"
        actionLabel="Thêm chi nhánh"
        actionIcon="add_business"
        onAction={openCreate}
      />

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="rounded-lg border border-error/40 px-3 py-1.5 text-sm font-medium text-error transition-colors hover:bg-error-container/40"
            onClick={loadBranches}
          >
            Thử lại
          </button>
        </div>
      )}

      <DataTable
        data={branches}
        loading={loading}
        minWidth="640px"
        emptyIcon="store"
        emptyTitle="Chưa có chi nhánh"
        emptyMessage="Thêm chi nhánh đầu tiên để bắt đầu cấu hình làn rửa."
        emptyAction={
          !loadError
            ? {
                label: 'Thêm chi nhánh',
                icon: 'add_business',
                onClick: openCreate,
              }
            : undefined
        }
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
            label: 'Tên',
            render: (row) => <span className="font-medium">{row.name}</span>,
          },
          {
            key: 'address',
            label: 'Địa chỉ',
            render: (row) => row.address || '—',
            tdClassName: 'text-on-surface-variant',
          },
          {
            key: 'isActive',
            label: 'Trạng thái',
            width: '160px',
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
        title={editingId ? 'Sửa chi nhánh' : 'Thêm chi nhánh'}
        submitLabel={saving ? 'Đang lưu…' : 'Lưu'}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <Input
            label="Tên chi nhánh"
            required
            maxLength={100}
            value={form.name}
            disabled={saving}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            iconLeft="store"
          />
          <Input
            label="Địa chỉ"
            maxLength={255}
            value={form.address}
            disabled={saving}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            iconLeft="location_on"
          />
          {editingId && (
            <label className="flex items-center gap-2.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface cursor-pointer hover:bg-surface-variant/40">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-outline-variant accent-primary"
                checked={form.isActive}
                disabled={saving}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              <span className="font-medium">Đang hoạt động</span>
            </label>
          )}
        </div>
      </FormModal>
    </div>
  )
}