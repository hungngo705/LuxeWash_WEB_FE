import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  createWalkInBooking,
} from '../../api'
import { apiRequest } from '../../api/client'
import PageHeader from '../../components/admin/shared/PageHeader'
import { formatVnd } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'

export default function ManagerWalkInPage() {
  const { user } = useAuth()
  const [services, setServices] = useState([])
  const [lanes, setLanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  const branchId = String(user?.branchId ?? '')

  const [form, setForm] = useState({
    licensePlate: '',
    serviceIds: [],
    laneId: '',
  })

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [servicesResult, lanesResult] = await Promise.allSettled([
        apiRequest('/services'),
        apiRequest('/admin/lanes'),
      ])

      if (servicesResult.status === 'fulfilled') {
        const data = servicesResult.value
        setServices(Array.isArray(data) ? data.filter(s => s.isActive !== false) : [])
      }
      if (lanesResult.status === 'fulfilled') {
        const data = lanesResult.value
        const list = Array.isArray(data) ? data : []
        setLanes(list.filter(l => l.isActive !== false))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleService = (serviceId) => {
    setForm((f) => {
      const ids = f.serviceIds.includes(serviceId)
        ? f.serviceIds.filter((id) => id !== serviceId)
        : [...f.serviceIds, serviceId]
      return { ...f, serviceIds: ids }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.licensePlate.trim()) {
      showToast('Vui lòng nhập biển số xe.')
      return
    }
    if (form.serviceIds.length === 0) {
      showToast('Vui lòng chọn ít nhất một dịch vụ.')
      return
    }

    setSubmitting(true)
    try {
      await createWalkInBooking({
        branchId: Number(branchId),
        licensePlate: form.licensePlate.trim().toUpperCase(),
        serviceIds: form.serviceIds.map(Number),
        laneId: form.laneId ? Number(form.laneId) : undefined,
      })
      showToast(`Đã tiếp nhận xe ${form.licensePlate.trim().toUpperCase()} — Check-in thành công!`)
      setForm((f) => ({
        ...f,
        licensePlate: '',
        serviceIds: [],
        laneId: '',
      }))
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Lỗi khi tiếp nhận khách vãng lai.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl">
      <PageHeader
        title="Tiếp nhận khách vãng lai"
        description="Check-in nhanh cho xe đến trạm mà không cần đặt lịch trước"
      />

      {toast && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* License plate */}
        <div className="glass-panel rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <h3 className="mb-4 text-sm font-semibold text-on-surface">Biển số xe</h3>
          <input
            type="text"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-xl font-mono font-semibold uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
            placeholder="VD: 51F-123.45"
            value={form.licensePlate}
            onChange={(e) =>
              setForm((f) => ({ ...f, licensePlate: e.target.value.toUpperCase() }))
            }
          />
        </div>

        {/* Services */}
        <div className="glass-panel rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <h3 className="mb-4 text-sm font-semibold text-on-surface">Chọn dịch vụ</h3>
          {services.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Không tải được danh sách dịch vụ. Có thể chưa có dịch vụ nào cho chi nhánh này.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {services.map((service) => {
                const serviceId = service.serviceId ?? service.id
                const selected = form.serviceIds.includes(serviceId)
                const minPrice = service.prices?.length > 0
                  ? Math.min(...service.prices.map((p) => p.price))
                  : 0
                return (
                  <button
                    key={serviceId}
                    type="button"
                    className={`rounded-xl border p-4 text-left transition-all ${
                      selected
                        ? 'border-secondary bg-secondary-container/30'
                        : 'border-outline-variant bg-surface-container-low hover:border-secondary'
                    }`}
                    onClick={() => toggleService(serviceId)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-on-surface">{service.serviceName}</p>
                        {service.description && (
                          <p className="mt-0.5 text-xs text-on-surface-variant">{service.description}</p>
                        )}
                      </div>
                      <span className={`material-symbols-outlined ${selected ? 'text-secondary' : 'text-outline'}`}>
                        {selected ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    </div>
                    {minPrice > 0 && (
                      <p className="mt-2 text-sm font-semibold text-primary">{formatVnd(minPrice)}</p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Lane (optional) */}
        <div className="glass-panel rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <h3 className="mb-4 text-sm font-semibold text-on-surface">Làn rửa (tùy chọn)</h3>
          {lanes.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Không có làn nào khả dụng. Admin cần tạo làn trước.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {lanes.map((lane) => (
                <button
                  key={lane.id}
                  type="button"
                  className={`rounded-xl border p-3 text-left transition-all ${
                    form.laneId === String(lane.id)
                      ? 'border-secondary bg-secondary-container/30'
                      : 'border-outline-variant bg-surface-container-low hover:border-secondary'
                  }`}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      laneId: f.laneId === String(lane.id) ? '' : String(lane.id),
                    }))
                  }
                >
                  <span className="material-symbols-outlined text-secondary">garage</span>
                  <p className="mt-1 font-semibold text-on-surface">{lane.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-secondary py-3.5 text-sm font-semibold tracking-wide text-on-secondary transition-colors hover:bg-secondary/90 disabled:opacity-60"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-secondary/30 border-t-on-secondary" />
              Đang tiếp nhận...
            </span>
          ) : (
            'Tiếp nhận khách vãng lai'
          )}
        </button>
      </form>
    </div>
  )
}
