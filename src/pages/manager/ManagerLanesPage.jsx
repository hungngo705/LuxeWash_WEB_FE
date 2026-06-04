import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createManagerLane,
  fetchManagerLanes,
} from '../../api'
import FormModal from '../../components/admin/shared/FormModal'
import EmptyState from '../../components/admin/shared/EmptyState'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'

const emptyForm = { name: '' }

export default function ManagerLanesPage() {
  const [lanes, setLanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadLanes = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setLanes(await fetchManagerLanes())
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách làn rửa')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLanes()
  }, [loadLanes])

  const openCreate = () => {
    setForm(emptyForm)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || saving) {
      showToast('Vui lòng nhập tên làn')
      return
    }

    setSaving(true)
    try {
      await createManagerLane({ name: form.name.trim() })
      showToast('Đã thêm làn rửa')
      setModalOpen(false)
      await loadLanes()
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
        description="Quản lý các làn rửa tại chi nhánh của bạn"
        actionLabel="Thêm làn"
        actionIcon="add"
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
          <button type="button" className="text-sm text-error" onClick={loadLanes}>
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải...</p>
      ) : lanes.length === 0 && !loadError ? (
        <EmptyState icon="garage" title="Chưa có làn rửa" description="Tạo làn rửa để bắt đầu phân công nhân viên." />
      ) : (
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Tên làn</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {lanes.map((lane) => (
                <tr key={lane.laneId} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 text-on-surface-variant">#{lane.laneId}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">{lane.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lane.isActive !== false ? 'Active' : 'Inactive'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormModal
        open={modalOpen}
        title="Thêm làn rửa"
        submitLabel={saving ? 'Đang lưu...' : 'Lưu'}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Tên làn</span>
            <input
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.name}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="VD: Làn bọt tuyết 1"
            />
          </label>
        </div>
      </FormModal>
    </div>
  )
}
