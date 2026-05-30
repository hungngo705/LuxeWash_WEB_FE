import { useMemo, useState } from 'react'
import EmptyState from '../../components/admin/shared/EmptyState'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import { initialAdminServices } from '../../data/mockAdminServices'
import { initialAdminVehicleTypes } from '../../data/mockAdminVehicleTypes'
import { formatVnd } from '../../utils/format'

const emptyForm = {
  serviceName: '',
  description: '',
  prices: [{ vehicleTypeId: 1, vehicleTypeName: 'Sedan 4 chỗ', price: 0, estimatedDurationMinutes: 20 }],
}

export default function AdminServicesPage() {
  const [services, setServices] = useState(initialAdminServices)
  const [vehicleTypes] = useState(initialAdminVehicleTypes)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState('')

  const nextId = useMemo(
    () => (services.length ? Math.max(...services.map((s) => s.serviceId)) + 1 : 1),
    [services],
  )

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({
      ...emptyForm,
      prices: [
        {
          vehicleTypeId: vehicleTypes[0]?.vehicleTypeId ?? 1,
          vehicleTypeName: vehicleTypes[0]?.name ?? '',
          price: 0,
          estimatedDurationMinutes: 20,
        },
      ],
    })
    setModalOpen(true)
  }

  const openEdit = (service) => {
    setEditingId(service.serviceId)
    setForm({
      serviceName: service.serviceName,
      description: service.description,
      prices: service.prices.map((p) => ({ ...p })),
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.serviceName.trim()) return

    if (editingId) {
      setServices((prev) =>
        prev.map((s) =>
          s.serviceId === editingId
            ? { ...s, serviceName: form.serviceName, description: form.description, prices: form.prices }
            : s,
        ),
      )
    } else {
      setServices((prev) => [
        ...prev,
        { serviceId: nextId, serviceName: form.serviceName, description: form.description, prices: form.prices },
      ])
    }

    setModalOpen(false)
    showToast('Đã lưu (mock)')
  }

  const handleDelete = () => {
    setServices((prev) => prev.filter((s) => s.serviceId !== deleteTarget))
    setDeleteTarget(null)
    showToast('Đã xóa dịch vụ (mock)')
  }

  const getPriceRange = (prices) => {
    if (!prices.length) return '—'
    const amounts = prices.map((p) => p.price)
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

      {services.length === 0 ? (
        <EmptyState icon="local_car_wash" title="Chưa có dịch vụ" message="Thêm dịch vụ đầu tiên để bắt đầu." />
      ) : (
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Tên dịch vụ</th>
                <th className="px-4 py-3">Mô tả</th>
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
                  <td className="max-w-xs truncate px-4 py-3 text-on-surface-variant">{service.description}</td>
                  <td className="px-4 py-3 text-on-surface">{service.prices.length}</td>
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
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-error hover:bg-error-container/20"
                        onClick={() => setDeleteTarget(service.serviceId)}
                      >
                        Xóa
                      </button>
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
        onClose={() => setModalOpen(false)}
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
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Bảng giá theo loại xe
              </span>
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    prices: [
                      ...f.prices,
                      {
                        vehicleTypeId: vehicleTypes[0]?.vehicleTypeId ?? 1,
                        vehicleTypeName: vehicleTypes[0]?.name ?? '',
                        price: 0,
                        estimatedDurationMinutes: 20,
                      },
                    ],
                  }))
                }
              >
                + Thêm mức giá
              </button>
            </div>
            <div className="space-y-3">
              {form.prices.map((price, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-2 rounded-lg border border-outline-variant/60 p-3 sm:grid-cols-4">
                  <select
                    className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-2 text-sm"
                    value={price.vehicleTypeId}
                    onChange={(e) => {
                      const vt = vehicleTypes.find((v) => v.vehicleTypeId === Number(e.target.value))
                      setForm((f) => {
                        const prices = [...f.prices]
                        prices[idx] = {
                          ...prices[idx],
                          vehicleTypeId: vt.vehicleTypeId,
                          vehicleTypeName: vt.name,
                        }
                        return { ...f, prices }
                      })
                    }}
                  >
                    {vehicleTypes.map((vt) => (
                      <option key={vt.vehicleTypeId} value={vt.vehicleTypeId}>
                        {vt.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-2 text-sm"
                    placeholder="Giá VND"
                    value={price.price}
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
                    className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-2 text-sm"
                    placeholder="Phút"
                    value={price.estimatedDurationMinutes}
                    onChange={(e) => {
                      setForm((f) => {
                        const prices = [...f.prices]
                        prices[idx] = { ...prices[idx], estimatedDurationMinutes: Number(e.target.value) }
                        return { ...f, prices }
                      })
                    }}
                  />
                  {form.prices.length > 1 && (
                    <button
                      type="button"
                      className="text-sm text-error hover:underline"
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
        title="Xóa dịch vụ"
        message="Bạn chắc chắn muốn xóa dịch vụ này?"
        confirmLabel="Xóa"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
