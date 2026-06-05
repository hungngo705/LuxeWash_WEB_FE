import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  createService,
  deleteService,
  fetchBranches,
  fetchServices,
  fetchVehicleTypes,
  updateService,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import { formatVnd } from '../../utils/format'

const DEFAULT_DURATION_MINUTES = 20

function buildPricesForAllVehicleTypes(vehicleTypes, branchId) {
  const bid = Number(branchId)
  return vehicleTypes.map((vt) => ({
    vehicleTypeId: vt.id,
    branchId: bid,
    price: '',
    estimatedDurationMinutes: DEFAULT_DURATION_MINUTES,
  }))
}

function mergePricesWithVehicleTypes(existingPrices, vehicleTypes, branchId) {
  const byTypeId = new Map(
    (existingPrices ?? []).map((p) => [Number(p.vehicleTypeId), p]),
  )
  const bid = Number(branchId || existingPrices?.[0]?.branchId)
  return vehicleTypes.map((vt) => {
    const existing = byTypeId.get(Number(vt.id))
    const minutes = Number(existing?.estimatedDurationMinutes)
    return {
      vehicleTypeId: vt.id,
      branchId: bid,
      price: existing?.price != null && existing.price !== '' ? String(existing.price) : '',
      estimatedDurationMinutes:
        minutes >= 5 && minutes <= 600 ? minutes : DEFAULT_DURATION_MINUTES,
    }
  })
}

function getVehicleTypeName(vehicleTypes, vehicleTypeId) {
  return vehicleTypes.find((vt) => Number(vt.id) === Number(vehicleTypeId))?.name ?? '—'
}

function toApiPayload(form) {
  const branchId = Number(form.branchId)
  return {
    serviceName: form.serviceName.trim(),
    description: form.description.trim(),
    prices: form.prices.map(({ vehicleTypeId, price, estimatedDurationMinutes }) => {
      const minutes = Number(estimatedDurationMinutes)
      return {
        vehicleTypeId: Number(vehicleTypeId),
        branchId,
        price: Number(price),
        estimatedDurationMinutes:
          minutes >= 5 && minutes <= 600 ? minutes : DEFAULT_DURATION_MINUTES,
      }
    }),
  }
}

function validateForm(form, vehicleTypes) {
  if (!form.serviceName.trim()) return 'Vui lòng nhập tên dịch vụ'
  if (!Number(form.branchId)) return 'Vui lòng chọn chi nhánh'
  if (!vehicleTypes.length) return 'Chưa có loại xe trong hệ thống'
  if (!form.prices.length) return 'Cần ít nhất một mức giá'

  if (form.prices.length !== vehicleTypes.length) {
    return `Phải nhập giá cho đủ ${vehicleTypes.length} loại xe`
  }

  const seen = new Set()
  const allowedIds = new Set(vehicleTypes.map((vt) => Number(vt.id)))

  for (const row of form.prices) {
    const typeId = Number(row.vehicleTypeId)
    if (!allowedIds.has(typeId)) return 'Mức giá phải thuộc loại xe hiện có'
    if (seen.has(typeId)) return 'Mỗi loại xe chỉ được một mức giá'
    seen.add(typeId)
    if (row.price === '' || row.price == null) return 'Vui lòng nhập giá cho tất cả loại xe'
    if (Number(row.price) < 0) return 'Giá không được âm'
  }

  if (seen.size !== vehicleTypes.length) {
    return 'Thiếu mức giá cho một hoặc nhiều loại xe'
  }

  return null
}

export default function AdminServicesPage() {
  const [services, setServices] = useState([])
  const [vehicleTypes, setVehicleTypes] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ serviceName: '', description: '', branchId: '', prices: [] })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [servicesData, vehicleTypesData, branchesData] = await Promise.all([
        fetchServices(),
        fetchVehicleTypes(),
        fetchBranches(),
      ])
      setServices(Array.isArray(servicesData) ? servicesData : [])
      setVehicleTypes(Array.isArray(vehicleTypesData) ? vehicleTypesData : [])
      setBranches(Array.isArray(branchesData) ? branchesData : [])
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu dịch vụ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  /** Chỉ hiển thị dịch vụ đang hoạt động trên bảng Admin (các trang khác không lọc). */
  const activeServices = useMemo(
    () => services.filter((s) => s.isActive !== false),
    [services],
  )

  const setBranchId = (branchId) => {
    setForm((f) => ({
      ...f,
      branchId,
      prices: f.prices.map((row) => ({ ...row, branchId: Number(branchId) })),
    }))
  }

  const openCreate = () => {
    if (!branches.length) {
      showToast('Cần tạo chi nhánh trước khi thêm dịch vụ')
      return
    }
    if (!vehicleTypes.length) {
      showToast('Cần tạo loại xe trước khi thêm dịch vụ')
      return
    }

    const defaultBranchId = String(branches[0].id)
    setEditingId(null)
    setForm({
      serviceName: '',
      description: '',
      branchId: defaultBranchId,
      prices: buildPricesForAllVehicleTypes(vehicleTypes, defaultBranchId),
    })
    setModalOpen(true)
  }

  const openEdit = (service) => {
    const branchId = String(service.prices?.[0]?.branchId ?? branches[0]?.id ?? '')
    setEditingId(service.serviceId)
    setForm({
      serviceName: service.serviceName,
      description: service.description ?? '',
      branchId,
      prices: mergePricesWithVehicleTypes(service.prices, vehicleTypes, branchId),
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (saving) return

    const validationError = validateForm(form, vehicleTypes)
    if (validationError) {
      showToast(validationError)
      return
    }

    const payload = toApiPayload(form)

    setSaving(true)
    try {
      if (editingId) {
        await updateService(editingId, payload)
        showToast('Đã cập nhật dịch vụ')
      } else {
        await createService(payload)
        showToast('Đã thêm dịch vụ mới')
      }

      setModalOpen(false)
      await loadData()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không lưu được dịch vụ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return

    setDeleting(true)
    try {
      await deleteService(deleteTarget)
      setDeleteTarget(null)
      showToast('Đã ngừng hoạt động dịch vụ')
      await loadData()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không ngừng hoạt động được dịch vụ')
    } finally {
      setDeleting(false)
    }
  }

  const getPriceRange = (prices) => {
    if (!prices?.length) return '—'
    const amounts = prices.map((p) => Number(p.price))
    const min = Math.min(...amounts)
    const max = Math.max(...amounts)
    return min === max ? formatVnd(min) : `${formatVnd(min)} – ${formatVnd(max)}`
  }

  const branchName = (branchId) =>
    branches.find((b) => b.id === Number(branchId))?.name ?? (branchId ? `#${branchId}` : '—')

  return (
    <div className="w-full">
      <PageHeader
        title="Quản lý dịch vụ"
        description=""
        actionLabel="Thêm dịch vụ"
        onAction={openCreate}
      />

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      {!loading && branches.length === 0 && (
        <p className="mb-4 rounded-lg border border-tertiary/30 bg-tertiary-container/20 px-4 py-2 text-sm text-on-surface">
          Chưa có chi nhánh — hãy tạo chi nhánh trước khi thêm dịch vụ.
        </p>
      )}

      {!loading && vehicleTypes.length === 0 && (
        <p className="mb-4 rounded-lg border border-tertiary/30 bg-tertiary-container/20 px-4 py-2 text-sm text-on-surface">
          Chưa có loại xe — hãy tạo loại xe trước khi thêm dịch vụ.
        </p>
      )}

      {loadError && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="rounded-lg border border-error/30 px-3 py-1.5 text-sm font-medium text-error hover:bg-error-container/20"
            onClick={loadData}
          >
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải danh sách dịch vụ…</p>
      ) : activeServices.length === 0 && !loadError ? (
        <EmptyState icon="local_car_wash" title="Chưa có dịch vụ" message="Thêm dịch vụ đầu tiên để bắt đầu." />
      ) : (
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Tên dịch vụ</th>
                <th className="px-4 py-3">Chi nhánh</th>
                <th className="px-4 py-3">Mô tả</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Số mức giá</th>
                <th className="px-4 py-3">Giá thấp nhất–cao nhất</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {activeServices.map((service) => (
                <tr key={service.serviceId} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 text-on-surface-variant">#{service.serviceId}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">{service.serviceName}</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {branchName(service.prices?.[0]?.branchId)}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-on-surface-variant">
                    {service.description || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={service.isActive === false ? 'Inactive' : 'Active'} />
                  </td>
                  <td className="px-4 py-3 text-on-surface">{service.prices?.length ?? 0}</td>
                  <td className="px-4 py-3 text-on-surface">{getPriceRange(service.prices)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-primary hover:bg-primary-container/20"
                        onClick={() => openEdit(service)}
                      >
                        Sửa
                      </button>
                      {service.isActive !== false && (
                        <button
                          type="button"
                          className="rounded-lg px-2 py-1 text-error hover:bg-error-container/20"
                          onClick={() => setDeleteTarget(service.serviceId)}
                        >
                          ngừng hoạt động
                        </button>
                      )}
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
        title={editingId ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}
        size="lg"
        submitLabel={saving ? 'Đang lưu…' : 'Lưu'}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Chi nhánh
            </span>
            <select
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
              value={form.branchId}
              disabled={saving || !branches.length}
              onChange={(e) => setBranchId(e.target.value)}
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
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Tên dịch vụ
            </span>
            <input
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
              value={form.serviceName}
              onChange={(e) => setForm((f) => ({ ...f, serviceName: e.target.value }))}
              required
              disabled={saving}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Mô tả
            </span>
            <textarea
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={saving}
            />
          </label>

          <div>
            <div className="mb-2">
              <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Bảng giá theo loại xe
              </span>
              <p className="mt-1 text-xs text-on-surface-variant">
                Bắt buộc nhập giá cho{' '}
                <strong className="text-on-surface">tất cả {vehicleTypes.length} loại xe</strong>{' '}
                tại chi nhánh đã chọn (thời lượng mặc định {DEFAULT_DURATION_MINUTES} phút).
              </p>
            </div>
            <div className="space-y-3">
              {form.prices.map((price) => (
                <div
                  key={price.vehicleTypeId}
                  className="grid grid-cols-1 gap-2 rounded-lg border border-outline-variant/60 p-3 sm:grid-cols-2"
                >
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-on-surface">
                      {getVehicleTypeName(vehicleTypes, price.vehicleTypeId)}
                    </p>
                  </div>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-on-surface-variant">Giá tiền (VNĐ)</span>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-2 text-sm"
                      value={price.price}
                      disabled={saving}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value !== '' && !/^\d+$/.test(value)) return
                        setForm((f) => ({
                          ...f,
                          prices: f.prices.map((row) =>
                            row.vehicleTypeId === price.vehicleTypeId
                              ? { ...row, price: value }
                              : row,
                          ),
                        }))
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Ngừng hoạt động dịch vụ"
        message="Dịch vụ sẽ được đánh dấu không hoạt động. Bạn chắc chắn muốn tiếp tục?"
        confirmLabel={deleting ? 'Đang xử lý…' : 'Xác nhận'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  )
}
