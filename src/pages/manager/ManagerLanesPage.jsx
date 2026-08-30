import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  createManagerLane,
  fetchManagerLanes,
} from '../../api'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import Input from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'

const emptyForm = { name: '', isBusinessLane: false }

export default function ManagerLanesPage() {
  const [lanes, setLanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

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
      toast.warning('Vui lòng nhập tên làn')
      return
    }

    setSaving(true)
    try {
      await createManagerLane({
        name: form.name.trim(),
        isBusinessLane: form.isBusinessLane,
      })
      toast.success('Đã thêm làn rửa')
      setModalOpen(false)
      await loadLanes()
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
        description="Quản lý các làn rửa tại chi nhánh của bạn"
        actionLabel="Thêm làn"
        actionIcon="add_road"
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

      {loadError && (
        <div className="mb-4 flex justify-between rounded-lg border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{loadError}</p>
          <button type="button" className="text-sm text-error" onClick={loadLanes}>
            Thử lại
          </button>
        </div>
      )}

      <DataTable
        data={lanes}
        loading={loading}
        minWidth="640px"
        emptyIcon="garage"
        emptyTitle="Chưa có làn rửa"
        emptyMessage="Tạo làn rửa để bắt đầu phân công cho chi nhánh."
        columns={[
          {
            key: 'laneId',
            label: 'ID',
            width: '80px',
            render: (row) => (
              <span className="font-mono text-on-surface-variant">#{row.laneId}</span>
            ),
          },
          {
            key: 'name',
            label: 'Tên làn',
            render: (row) => <span className="font-medium text-on-surface">{row.name}</span>,
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
        ]}
      />

      <FormModal
        open={modalOpen}
        title="Thêm làn rửa"
        submitLabel={saving ? 'Đang lưu...' : 'Thêm làn'}
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
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="VD: Làn 1..."
            iconLeft="garage"
          />
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