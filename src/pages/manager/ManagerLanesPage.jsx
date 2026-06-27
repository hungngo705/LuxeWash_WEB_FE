import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  createManagerLane,
  fetchManagerLanes,
  unassignStaffFromLane,
} from '../../api'
import FormModal from '../../components/admin/shared/FormModal'
import EmptyState from '../../components/admin/shared/EmptyState'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'

const emptyForm = { name: '' }

function todayDateValue() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function getInitials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) return 'NV'

  return parts
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export default function ManagerLanesPage() {
  const [lanes, setLanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayDateValue)
  const [expandedLaneId, setExpandedLaneId] = useState(null)
  const [unassigning, setUnassigning] = useState(false)

  const laneStats = useMemo(() => {
    const active = lanes.filter((lane) => lane.isActive !== false).length
    const business = lanes.filter((lane) => lane.isBusinessLane).length
    const assignedStaff = lanes.reduce((total, lane) => {
      const staff = Array.isArray(lane.assignedStaff) ? lane.assignedStaff : []
      return total + staff.length
    }, 0)

    return {
      total: lanes.length,
      active,
      consumer: Math.max(lanes.length - business, 0),
      business,
      assignedStaff,
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
      setLanes(await fetchManagerLanes({ date: selectedDate }))
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách làn rửa')
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

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

  const toggleLane = (laneId) => {
    if (expandedLaneId === laneId) {
      setExpandedLaneId(null)
      return
    }
    setExpandedLaneId(laneId)
  }

  const handleUnassign = async (laneId, staffId) => {
    if (unassigning) return
    setUnassigning(true)
    try {
      await unassignStaffFromLane(laneId, staffId, { date: selectedDate })
      showToast('Đã hủy phân công')
      await loadLanes()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không hủy được phân công')
    } finally {
      setUnassigning(false)
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
                Bảng phân công làn
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Theo dõi loại làn, trạng thái hoạt động và nhân viên phụ trách theo ngày.
              </p>
            </div>
          </div>
          <label className="flex min-w-[220px] flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Ngày xem phân công
            </span>
            <input
              type="date"
              className="h-11 rounded-lg border border-outline-variant bg-surface-container-low px-3 text-on-surface outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-secondary/15"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-outline-variant/50 md:grid-cols-5 md:divide-y-0">
          {[
            { label: 'Tổng làn', value: laneStats.total, icon: 'view_stream' },
            { label: 'Đang hoạt động', value: laneStats.active, icon: 'check_circle' },
            { label: 'Tiêu dùng', value: laneStats.consumer, icon: 'directions_car' },
            { label: 'Doanh nghiệp', value: laneStats.business, icon: 'business_center' },
            { label: 'Nhân viên', value: laneStats.assignedStaff, icon: 'badge' },
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
        <EmptyState icon="garage" title="Chưa có làn rửa" description="Tạo làn rửa để bắt đầu phân công nhân viên." />
      ) : (
        <div className="space-y-3">
          {lanes.map((lane) => {
            const isExpanded = expandedLaneId === lane.laneId
            const staff = Array.isArray(lane.assignedStaff) ? lane.assignedStaff : []
            return (
              <div
                key={lane.laneId}
                className={`soft-shadow overflow-hidden rounded-xl border bg-surface-container-lowest transition-colors ${
                  isExpanded
                    ? 'border-secondary/40'
                    : 'border-outline-variant hover:border-secondary/25'
                }`}
              >
                <button
                  type="button"
                  className="flex w-full flex-col gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-container-low/45 md:flex-row md:items-center md:justify-between"
                  onClick={() => toggleLane(lane.laneId)}
                >
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

                  <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-end">
                    <span className="inline-flex min-w-[104px] items-center justify-center rounded-full border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-semibold text-on-surface">
                      {staff.length} nhân viên
                    </span>
                    <span
                      className={`inline-flex min-w-[82px] items-center justify-center rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-on-surface-variant transition-colors ${
                        isExpanded ? 'bg-surface-container-low text-on-surface' : 'bg-surface-container-lowest'
                      }`}
                    >
                      {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                    </span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-outline-variant/60 bg-surface-container-low/35 px-5 py-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Nhân viên phân công — {selectedDate}
                      </p>
                      <span className="rounded-full bg-surface-container-lowest px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                        {staff.length} người phụ trách
                      </span>
                    </div>
                    {staff.length === 0 ? (
                      <div className="flex items-center gap-3 rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest px-4 py-4 text-sm text-on-surface-variant">
                        <span className="h-2.5 w-2.5 rounded-full bg-outline" />
                        <span>Chưa có nhân viên nào được phân công cho làn này vào ngày đã chọn.</span>
                      </div>
                    ) : (
                      <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {staff.map((member, index) => (
                          <li
                            key={`${lane.laneId}-${member.userId}-${index}`}
                            className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-3 text-sm"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary-container/40 text-xs font-semibold text-secondary">
                                {getInitials(member.fullName)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-on-surface">{member.fullName}</p>
                                <p className="truncate text-xs text-on-surface-variant">{member.phoneNumber}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="shrink-0 rounded-lg border border-error/30 px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error-container/20 disabled:opacity-50"
                              disabled={unassigning}
                              onClick={() => handleUnassign(lane.laneId, member.userId)}
                            >
                              Hủy phân công
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
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
