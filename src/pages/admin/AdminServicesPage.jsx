import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createService,
  deleteService,
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

function defaultPriceRow(vehicleTypes) {
  const first = vehicleTypes[0]
  return {
    vehicleTypeId: first?.id ?? '',
    price: 0,
    estimatedDurationMinutes: 20,
  }
}

function toApiPayload(form) {
  return {
    serviceName: form.serviceName.trim(),
    description: form.description.trim(),
    prices: form.prices.map(({ vehicleTypeId, price, estimatedDurationMinutes }) => ({
      vehicleTypeId: Number(vehicleTypeId),
      price: Number(price),
      estimatedDurationMinutes: Number(estimatedDurationMinutes),
    })),
  }
}

function validateForm(form) {
  if (!form.serviceName.trim()) return 'Vui lòng nhập tên dịch vụ'
  if (!form.prices.length) return 'Cần ít nhất một mức giá'

  const seen = new Set()
  for (const row of form.prices) {
    if (!row.vehicleTypeId) return 'Chọn loại xe cho từng mức giá'
    if (seen.has(row.vehicleTypeId)) return 'Mỗi loại xe chỉ được một mức giá'
    seen.add(row.vehicleTypeId)
    if (Number(row.price) < 0) return 'Giá không được âm'
    const minutes = Number(row.estimatedDurationMinutes)
    if (minutes < 5 || minutes > 600) return 'Thời lượng phải từ 5–600 phút'
  }

  return null
}

export default function AdminServicesPage() {
  const [services, setServices] = useState([])
  const [vehicleTypes, setVehicleTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ serviceName: '', description: '', prices: [] })
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
      const [servicesData, vehicleTypesData] = await Promise.all([
        fetchServices(),
        fetchVehicleTypes(),
      ])
      setServices(Array.isArray(servicesData) ? servicesData : [])
      setVehicleTypes(Array.isArray(vehicleTypesData) ? vehicleTypesData : [])
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu dịch vụ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openCreate = () => {
    if (!vehicleTypes.length) {
      showToast('Cần tạo loại xe trước khi thêm dịch vụ')
      return
    }

    setEditingId(null)
    setForm({
      serviceName: '',
      description: '',
      prices: [defaultPriceRow(vehicleTypes)],
    })
    setModalOpen(true)
  }

  const openEdit = (service) => {
    setEditingId(service.serviceId)
    setForm({
      serviceName: service.serviceName,
      description: service.description ?? '',
      prices: service.prices.map(({ vehicleTypeId, price, estimatedDurationMinutes }) => ({
        vehicleTypeId,
        price,
        estimatedDurationMinutes,
      })),
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (saving) return

    const validationError = validateForm(form)
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
      showToast(err instanceof ApiError ? err.message : 'Không xóa được dịch vụ')
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

  return (
    <div className="w-full">
      <PageHeader
        title="Quản lý dịch vụ"
        description="CRUD dịch vụ và bảng giá theo loại xe"
        actionLabel="Thêm dịch vụ"
        onAction={openCreate}
      />

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
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
      ) : services.length === 0 && !loadError ? (
        <EmptyState icon="local_car_wash" title="Chưa có dịch vụ" message="Thêm dịch vụ đầu tiên để bắt đầu." />
      ) : (
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Tên dịch vụ</th>
                <th className="px-4 py-3">Mô tả</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Số mức giá</th>
                <th className="px-4 py-3">Giá thấp nhất–cao nhất</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {services.map((service) => (
                <tr key={service.serviceId} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 text-on-surface-variant">#{service.serviceId}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">{service.serviceName}</td>
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
                          Xóa
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
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Bảng giá theo loại xe
              </span>
              <button
                type="button"
                className="text-sm text-primary hover:underline disabled:opacity-50"
                disabled={saving || form.prices.length >= vehicleTypes.length}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    prices: [...f.prices, defaultPriceRow(vehicleTypes)],
                  }))
                }
              >
                + Thêm mức giá
              </button>
            </div>
            <div className="space-y-3">
              {form.prices.map((price, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 gap-2 rounded-lg border border-outline-variant/60 p-3 sm:grid-cols-4"
                >
                  <select
                    className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-2 text-sm"
                    value={price.vehicleTypeId}
                    disabled={saving}
                    onChange={(e) => {
                      setForm((f) => {
                        const prices = [...f.prices]
                        prices[idx] = { ...prices[idx], vehicleTypeId: Number(e.target.value) }
                        return { ...f, prices }
                      })
                    }}
                  >
                    {vehicleTypes.map((vt) => (
                      <option key={vt.id} value={vt.id}>
                        {vt.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-2 text-sm"
                    placeholder="Giá VND"
                    value={price.price}
                    disabled={saving}
                    onChange={(e) => {
                      setForm((f) => {
                        const prices = [...f.prices]
                        prices[idx] = { ...prices[idx], price: Number(e.target.value) }
                        return { ...f, prices }
                      })
                    }}
                  />
                  <input
                    type="number"
                    min={5}
                    max={600}
                    className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-2 text-sm"
                    placeholder="Phút"
                    value={price.estimatedDurationMinutes}
                    disabled={saving}
                    onChange={(e) => {
                      setForm((f) => {
                        const prices = [...f.prices]
                        prices[idx] = {
                          ...prices[idx],
                          estimatedDurationMinutes: Number(e.target.value),
                        }
                        return { ...f, prices }
                      })
                    }}
                  />
                  {form.prices.length > 1 && (
                    <button
                      type="button"
                      className="text-sm text-error hover:underline disabled:opacity-50"
                      disabled={saving}
                      onClick={() =>
                        setForm((f) => ({ ...f, prices: f.prices.filter((_, i) => i !== idx) }))
                      }
                    >
                      Xóa
                    </button>
                  )}
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
