import { useState } from 'react'
import { ApiError, createWalkInBooking, getBranchId } from '../../../api'
import { formatVnd } from '../../../utils/format'
import { useToast } from '../../../components/ui/Toast'

function getVehicleTypeId(type) {
  return Number(type?.vehicleTypeId ?? type?.id ?? 0)
}

function isLocalAppHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local')
  )
}

function getPayOsCallbackUrl(path) {
  if (typeof window === 'undefined') return 'https://payos.vn'
  return isLocalAppHost(window.location.hostname)
    ? 'https://payos.vn'
    : `${window.location.origin}${path}`
}

function isFallbackVehicleType(type) {
  return String(type?.name ?? type?.vehicleTypeName ?? '')
    .trim()
    .toLowerCase() === 'khác'
}

function getServicePriceForVehicleType(service, vehicleTypeId, branchId) {
  if (!Array.isArray(service?.prices)) return null
  return (
    service.prices.find(
      (price) =>
        (branchId == null || Number(price.branchId) === Number(branchId)) &&
        (vehicleTypeId == null ||
          Number(price.vehicleTypeId) === Number(vehicleTypeId)),
    ) ?? null
  )
}

const LANE_STATUS_LABELS = {
  Pending: 'Chờ xác nhận',
  CheckedIn: 'Đã check-in',
  Processing: 'Đang rửa',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã huỷ',
  NoShow: 'Không đến',
}

function laneStatusLabel(status) {
  return LANE_STATUS_LABELS[status] ?? status ?? '—'
}

/**
 * Từ danh sách booking active của cell, build map { laneId -> booking }.
 * Chỉ tính các booking đã gán vào làn (processingLaneId > 0).
 */
function buildBusyLanesByLaneId(bookings = []) {
  const map = new Map()
  for (const b of bookings) {
    const id = Number(b?.processingLaneId)
    if (id > 0 && !map.has(id)) map.set(id, b)
  }
  return map
}

/**
 * Form walk-in thuần (UI + submit). Nhận các props từ parent:
 *   - branchId, services, lanes, vehicleTypes, loading
 *   - activeCell: { bookings, busyLanes, totalLanes, used, max } - context ô slot hiện tại
 *   - onSuccess(): parent reload data & đóng modal
 *
 * Logic đặt lịch giữ nguyên 100% so với bản cũ trong ManagerWalkInPage.jsx.
 */
export default function WalkInForm({
  branchId,
  services,
  lanes,
  vehicleTypes,
  loading,
  activeCell,
  onSuccess,
}) {
  const toast = useToast()
  const [form, setForm] = useState({
    licensePlate: '',
    vehicleTypeId: '',
    serviceIds: [],
    laneId: '',
    forceOverrideCapacity: false,
  })
  const [submitting, setSubmitting] = useState(false)

  // Branch suy luận từ prop hoặc fallback JWT. Tính 1 lần ở đầu component để
  // các bộ lọc/UI dùng nhất quán và submit payload đúng.
  const effectiveBranchId = getBranchId({ branchId }) ?? null

  // === Validation flags ===
  // vehicleTypeSelected = true khi user đã chọn 1 loại xe hợp lệ (id > 0).
  // Trước đó, mọi dịch vụ đều bị khóa tick để tránh lỗi "Service X does not
  // support this vehicle type at this branch" từ BE do user tick trước khi
  // chọn loại xe.
  const vehicleTypeSelected = Number(form.vehicleTypeId) > 0

  // Set các serviceId hợp lệ tại chi nhánh hiện tại cho loại xe đã chọn (có giá
  // match (branchId, vehicleTypeId)). Cả 2 điều kiện phải khớp để tránh BE
  // reject "Service X does not support this vehicle type at this branch".
  const validServiceIds = new Set(
    services
      .filter(
        (svc) =>
          getServicePriceForVehicleType(
            svc,
            Number(form.vehicleTypeId),
            effectiveBranchId,
          ) !== null,
      )
      .map((svc) => svc.serviceId ?? svc.id),
  )

  // User đã tick dịch vụ nhưng giờ không còn hợp lệ cho loại xe hiện tại
  // (ví dụ đổi loại xe, hoặc tick trước khi chọn).
  const hasInvalidSelected = form.serviceIds.some((sid) => !validServiceIds.has(sid))

  // Nút submit chỉ bật khi đủ: biển số + loại xe + ≥1 dịch vụ hợp lệ.
  const canSubmit =
    form.licensePlate.trim().length > 0 &&
    vehicleTypeSelected &&
    form.serviceIds.length > 0 &&
    !hasInvalidSelected

  const toggleService = (serviceId) => {
    // Chặn tick khi chưa chọn loại xe — đây là guard chính chống BE reject.
    if (!vehicleTypeSelected) {
      toast.warning('Vui lòng chọn loại xe trước khi chọn dịch vụ.')
      return
    }
    // Bỏ qua nếu service không hợp lệ cho loại xe đã chọn.
    if (!validServiceIds.has(serviceId)) return
    setForm((f) => {
      const ids = f.serviceIds.includes(serviceId)
        ? f.serviceIds.filter((id) => id !== serviceId)
        : [...f.serviceIds, serviceId]
      return { ...f, serviceIds: ids }
    })
  }

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    // Branch lấy từ prop, fallback JWT. Nếu cả 2 đều rỗng -> chặn submit
    // thay vì gửi branchId=0/NaN lên BE. Đã tính ở scope component nhưng
    // kiểm tra lại lần nữa trước khi submit để tránh race.
    if (!effectiveBranchId) {
      toast.error(
        'Không xác định được chi nhánh của bạn. Vui lòng đăng xuất và đăng nhập lại.',
      )
      return
    }
    if (!form.licensePlate.trim()) {
      toast.warning('Vui lòng nhập biển số xe.')
      return
    }
    if (form.serviceIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một dịch vụ.')
      return
    }
    if (!Number(form.vehicleTypeId)) {
      toast.warning('Vui lòng chọn loại xe.')
      return
    }
    // Defense in depth: dù nút submit đã bị disabled khi !canSubmit,
    // giữ block này để bảo vệ trong trường hợp người dùng bypass UI (devtools,
    // race condition với việc đổi vehicleType khi đang submit...).
    const invalidServices = form.serviceIds.filter((sid) => {
      const svc = services.find((s) => (s.serviceId ?? s.id) === sid)
      if (!svc) return true
      return (
        getServicePriceForVehicleType(
          svc,
          Number(form.vehicleTypeId),
          effectiveBranchId,
        ) === null
      )
    })
    if (invalidServices.length > 0) {
      const names = invalidServices
        .map((sid) => {
          const svc = services.find((s) => (s.serviceId ?? s.id) === sid)
          return svc?.serviceName ?? `Dịch vụ #${sid}`
        })
        .join(', ')
      toast.error(`Các dịch vụ không hỗ trợ loại xe này: ${names}. Vui lòng bỏ chọn trước khi tiếp nhận.`)
      return
    }

    setSubmitting(true)
    try {
      const returnUrl = getPayOsCallbackUrl('/manager/walk-in')
      await createWalkInBooking({
        branchId: effectiveBranchId,
        licensePlate: form.licensePlate.trim().toUpperCase(),
        serviceIds: form.serviceIds.map(Number),
        vehicleTypeId: Number(form.vehicleTypeId),
        laneId: form.laneId ? Number(form.laneId) : undefined,
        paymentMethod: 'Cash',
        returnUrl,
        cancelUrl: returnUrl,
        forceOverrideCapacity: form.forceOverrideCapacity,
      })
      toast.success(
        `Đã tiếp nhận xe ${form.licensePlate.trim().toUpperCase()} — Check-in thành công!`,
      )
      setForm((f) => ({
        ...f,
        licensePlate: '',
        vehicleTypeId: '',
        serviceIds: [],
        laneId: '',
        forceOverrideCapacity: false,
      }))
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Lỗi khi tiếp nhận khách vãng lai.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <h3 className="mb-3 text-sm font-semibold text-on-surface">Biển số xe</h3>
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

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <h3 className="mb-3 text-sm font-semibold text-on-surface">Loại xe</h3>
        <select
          className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface"
          value={form.vehicleTypeId}
          onChange={(e) => {
            const newVehicleTypeId = Number(e.target.value)
            setForm((f) => {
              if (newVehicleTypeId <= 0) return { ...f, vehicleTypeId: e.target.value }
              const validIds = f.serviceIds.filter((sid) => {
                const svc = services.find((s) => (s.serviceId ?? s.id) === sid)
                if (!svc) return false
                return (
                  getServicePriceForVehicleType(
                    svc,
                    newVehicleTypeId,
                    effectiveBranchId,
                  ) !== null
                )
              })
              return { ...f, vehicleTypeId: e.target.value, serviceIds: validIds }
            })
          }}
        >
          <option value="">Chọn loại xe</option>
          {vehicleTypes
            .filter((type) => !isFallbackVehicleType(type))
            .map((type) => {
              const id = getVehicleTypeId(type)
              if (!id) return null
              return (
                <option key={id} value={id}>
                  {type.name ?? type.vehicleTypeName ?? `Loại xe ${id}`}
                </option>
              )
            })}
        </select>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <h3 className="mb-3 text-sm font-semibold text-on-surface">Chọn dịch vụ</h3>
        {services.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            Không tải được danh sách dịch vụ. Có thể chưa có dịch vụ nào cho chi nhánh này.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {services.map((service) => {
              const serviceId = service.serviceId ?? service.id
              const selected = form.serviceIds.includes(serviceId)
              const selectedPrice = getServicePriceForVehicleType(
                service,
                Number(form.vehicleTypeId),
                effectiveBranchId,
              )
              const disabledByVehicleType = !vehicleTypeSelected || !selectedPrice
              const minPrice =
                service.prices?.length > 0
                  ? Math.min(...service.prices.map((p) => p.price))
                  : 0
              const displayPrice = selectedPrice
                ? Number(selectedPrice.price) || 0
                : minPrice
              return (
                <button
                  key={serviceId}
                  type="button"
                  className={`rounded-xl border p-4 text-left transition-all ${
                    selected
                      ? 'border-secondary bg-secondary-container/30'
                      : disabledByVehicleType
                        ? 'border-outline-variant bg-surface-container-low opacity-50'
                        : 'border-outline-variant bg-surface-container-low hover:border-secondary'
                  }`}
                  disabled={disabledByVehicleType}
                  onClick={() => toggleService(serviceId)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-on-surface">{service.serviceName}</p>
                      {service.description && (
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          {service.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`material-symbols-outlined ${selected ? 'text-secondary' : 'text-outline'}`}
                    >
                      {selected ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </div>
                  {displayPrice > 0 && (
                    <p className="mt-2 text-sm font-semibold text-primary">
                      {selectedPrice ? formatVnd(displayPrice) : `từ ${formatVnd(displayPrice)}`}
                    </p>
                  )}
                  {!vehicleTypeSelected && (
                    <p className="mt-2 text-xs text-on-surface-variant">
                      Vui lòng chọn loại xe trước
                    </p>
                  )}
                  {vehicleTypeSelected && disabledByVehicleType && (
                    <>
                      {/* Phân biệt 2 trường hợp:
                          1. Đã chọn loại xe nhưng service không có price nào
                             trong hệ thống → "Chưa hỗ trợ loại xe này".
                          2. Service có prices nhưng không match với (branchId,
                             vehicleTypeId) hiện tại → service global không
                             khả dụng tại chi nhánh này. */}
                      {Array.isArray(service.prices) && service.prices.length > 0 ? (
                        <p className="mt-2 text-xs text-error">
                          Dịch vụ không khả dụng tại chi nhánh này
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-error">
                          Chưa có giá cho loại xe này
                        </p>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-on-surface">Làn rửa của chi nhánh</h3>
          <span className="text-[11px] font-medium text-on-surface-variant">
            {lanes.length} làn · {activeCell ? Number(activeCell.busyLanes) || 0 : 0} bận ·{' '}
            {Math.max(
              lanes.length - (activeCell ? Number(activeCell.busyLanes) || 0 : 0),
              0,
            )}{' '}
            trống
          </span>
        </div>
        {lanes.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            Không có làn nào khả dụng. Admin cần tạo làn trước.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(() => {
              const busyByLane = buildBusyLanesByLaneId(activeCell?.bookings)
              return lanes.map((lane) => {
                const laneId = lane.laneId ?? lane.id
                const busyBooking = busyByLane.get(Number(laneId)) ?? null
                const isBusy = !!busyBooking
                const isSelected = form.laneId === String(laneId)
                const busyTooltip = isBusy
                  ? `${busyBooking.licensePlate ?? '—'} • ${
                      busyBooking.customerName && busyBooking.customerName !== '—'
                        ? busyBooking.customerName
                        : 'Khách vãng lai'
                    } • ${laneStatusLabel(busyBooking.status)}`
                  : undefined

                let className =
                  'rounded-xl border p-3 text-left transition-all flex flex-col gap-1'
                let iconClass = 'material-symbols-outlined text-secondary'
                let iconName = 'garage'

                if (isBusy) {
                  className +=
                    ' cursor-not-allowed border-error/40 bg-error-container/20 opacity-90'
                  iconName = 'block'
                  iconClass = 'material-symbols-outlined text-error'
                } else if (isSelected) {
                  className += ' border-secondary bg-secondary-container/30'
                  iconName = 'check_circle'
                } else {
                  className +=
                    ' border-outline-variant bg-surface-container-low hover:border-secondary'
                }

                return (
                  <button
                    key={laneId}
                    type="button"
                    className={className}
                    disabled={isBusy}
                    title={busyTooltip}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        laneId: f.laneId === String(laneId) ? '' : String(laneId),
                      }))
                    }
                  >
                    <span className={iconClass}>{iconName}</span>
                    <p className="text-sm font-semibold text-on-surface">{lane.name}</p>
                    {isBusy && busyBooking && (
                      <>
                        <p
                          className="truncate font-mono text-[11px] font-semibold text-error"
                          title={busyBooking.licensePlate ?? ''}
                        >
                          {busyBooking.licensePlate ?? '—'}
                        </p>
                        <p className="truncate text-[10px] text-on-surface-variant">
                          {laneStatusLabel(busyBooking.status)}
                        </p>
                      </>
                    )}
                    {isSelected && !isBusy && (
                      <p className="text-[10px] font-medium text-secondary">Đang chọn</p>
                    )}
                  </button>
                )
              })
            })()}
          </div>
        )}
      </div>

      <div
        className={`rounded-xl border p-4 ${
          form.forceOverrideCapacity
            ? 'border-tertiary bg-tertiary/10'
            : 'border-outline-variant bg-surface-container-lowest'
        }`}
      >
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-tertiary"
            checked={form.forceOverrideCapacity}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                forceOverrideCapacity: event.target.checked,
              }))
            }
          />
          <span>
            <span className="block text-sm font-semibold text-on-surface">
              Ghi đè sức chứa để lấp chỗ trống
            </span>
            <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
              Chỉ bật khi khách đặt trước đã quá thời gian ân hạn nhưng booking vẫn đang giữ
              tải. Xe walk-in sẽ vào trạng thái đang rửa ngay cả khi khung giờ đã đủ công
              suất.
            </span>
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !canSubmit}
        className="w-full rounded-xl bg-secondary py-3.5 text-sm font-semibold tracking-wide text-on-secondary transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
    </div>
  )
}
