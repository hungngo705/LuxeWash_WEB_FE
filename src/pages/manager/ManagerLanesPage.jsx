import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  createManagerLane,
  fetchManagerLanes,
} from '../../api'
import FormModal from '../../components/admin/shared/FormModal'
import EmptyState from '../../components/admin/shared/EmptyState'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'

const emptyForm = { name: '', isBusinessLane: false }

export default function ManagerLanesPage() {
  const [lanes, setLanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const laneStats = useMemo(() => {
    const active = lanes.filter((lane) => lane.isActive !== false).length
    const business = lanes.filter((lane) => lane.isBusinessLane).length

    return {
      total: lanes.length,
      active,
      consumer: Math.max(lanes.length - business, 0),
      business,
    }
  }, [lanes])

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async manager lanes load
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
      await createManagerLane({
        name: form.name.trim(),
        isBusinessLane: form.isBusinessLane,
      })
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

      <div className="soft-shadow mb-5 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="flex flex-col gap-4 border-b border-outline-variant/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined rounded-lg bg-secondary-container/50 p-2 text-secondary">
              garage
            </span>
            <div>
              <h2 className="font-sora text-base font-semibold text-on-surface">
                Thống kê làn
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Theo dõi loại làn và trạng thái hoạt động.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-outline-variant/50 md:grid-cols-4 md:divide-y-0">
          {[
            { label: 'Tổng làn', value: laneStats.total, icon: 'view_stream' },
            { label: 'Đang hoạt động', value: laneStats.active, icon: 'check_circle' },
            { label: 'Tiêu dùng', value: laneStats.consumer, icon: 'directions_car' },
            { label: 'Doanh nghiệp', value: laneStats.business, icon: 'business_center' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3">
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                {item.icon}
              </span>
              <div>
                <p className="text-lg font-semibold leading-6 text-on-surface">{item.value}</p>
                <p className="text-xs text-on-surface-variant">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

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
        <EmptyState icon="garage" title="Chưa có làn rửa" description="Tạo làn rửa." />
      ) : (
        <div className="space-y-3">
          {lanes.map((lane) => {
            return (
              <div
                key={lane.laneId}
                className="soft-shadow overflow-hidden rounded-xl border bg-surface-container-lowest border-outline-variant"
              >
                <div className="flex w-full flex-col gap-4 px-5 py-4 text-left md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span
                      className={`h-12 w-1.5 shrink-0 rounded-full ${
                        lane.isBusinessLane
                          ? 'bg-secondary'
                          : 'bg-primary'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-on-surface-variant">
                          #{lane.laneId}
                        </span>
                        <h3 className="truncate font-sora text-base font-semibold text-on-surface">
                          {lane.name}
                        </h3>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            lane.isBusinessLane
                              ? 'border-secondary/30 bg-secondary-container/40 text-on-secondary-container'
                              : 'border-outline-variant bg-surface-container-low text-on-surface-variant'
                          }`}
                        >
                          {lane.isBusinessLane ? 'Doanh nghiệp' : 'Tiêu dùng'}
                        </span>
                        <StatusBadge status={lane.isActive !== false ? 'Active' : 'Inactive'} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <FormModal
        open={modalOpen}
        title="Thêm làn rửa"
        submitLabel={saving ? 'Đang lưu...' : 'Thêm làn'}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Tên làn</span>
            <input
              type="text"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 outline-none transition-colors focus:border-secondary"
              placeholder="VD: Làn 1..."
              value={form.name}
              disabled={saving}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary"
              checked={form.isBusinessLane}
              disabled={saving}
              onChange={(e) => setForm((prev) => ({ ...prev, isBusinessLane: e.target.checked }))}
            />
            <span className="text-sm font-medium text-on-surface">Dành cho doanh nghiệp</span>
          </label>
        </div>
      </FormModal>
    </div>
  )
}
