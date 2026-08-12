import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchFleetVehicles,
  fetchBusinessServices,
  getBusinessAvailableSlots,
  createBusinessBooking,
  getServicePriceForContext,
  resolveVehicleTypeId,
} from '../../api/business.api'
import { fetchBranches } from '../../api/admin.branches.api'
import { getVietnameseApiErrorMessage } from '../../api/errors'
import { formatVnd } from '../../utils/format'

const STEPS = ['Chọn xe', 'Dịch vụ từng xe', 'Chi nhánh & slot', 'Xác nhận']

function formatScheduleTime(value) {
  const match = String(value || '').match(/T(\d{2}:\d{2})/)
  return match ? match[1] : '—'
}

function VehicleServiceRow({ vehicle, services, selectedServices, onToggleService, resolvedVehicleTypeId, branchId }) {
  const price = (serviceId) => {
    const svc = services.find((s) => s.serviceId === serviceId)
    if (!svc || !branchId) return null
    return getServicePriceForContext(svc, { branchId, vehicleTypeId: resolvedVehicleTypeId })
  }

  const total = (selectedServices[vehicle.fleetVehicleId] || []).reduce((sum, id) => {
    return sum + (price(id) || 0)
  }, 0)

  return (
    <div className="border border-outline-variant rounded-xl overflow-hidden">
      <div className="bg-surface-container px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-on-surface">{vehicle.licensePlate}</p>
          <p className="text-xs text-on-surface-variant">
            {vehicle.vehicleType} — {vehicle.brand} {vehicle.model}
          </p>
        </div>
        <div className="text-right">
          {total > 0 && (
            <p className="text-sm font-bold text-primary">{formatVnd(total)}</p>
          )}
          <p className="text-xs text-on-surface-variant">
            {(selectedServices[vehicle.fleetVehicleId] || []).length} dịch vụ
          </p>
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        {services.map((service) => {
          const svcPrice = price(service.serviceId)
          const isSelected = (selectedServices[vehicle.fleetVehicleId] || []).includes(service.serviceId)
          return (
            <button
              key={service.serviceId}
              type="button"
              onClick={() => onToggleService(vehicle.fleetVehicleId, service.serviceId)}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant/50 hover:border-outline-variant'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-base ${isSelected ? 'text-primary filled' : 'text-on-surface-variant'}`}>
                  {isSelected ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <div>
                  <p className="text-xs font-medium text-on-surface">{service.name}</p>
                  <p className="text-[10px] text-on-surface-variant">{service.description}</p>
                </div>
              </div>
              {svcPrice != null && (
                <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {formatVnd(svcPrice)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function BusinessNewBookingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [vehicles, setVehicles] = useState([])
  const [branches, setBranches] = useState([])
  const [services, setServices] = useState([])
  const [slots, setSlots] = useState([])

  // Step 0: vehicle selection
  const [selectedVehicleIds, setSelectedVehicleIds] = useState([])

  // Step 1: per-vehicle services  { [fleetVehicleId]: number[] }
  const [selectedServices, setSelectedServices] = useState({})

  // Step 2: branch + date + slot
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)

  // UI state
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotError, setSlotError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [scheduleUpdating, setScheduleUpdating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchFleetVehicles(), fetchBranches(), fetchBusinessServices()])
      .then(([v, b, s]) => {
        setVehicles(Array.isArray(v) ? v : [])
        setBranches(Array.isArray(b) ? b : [])
        setServices(Array.isArray(s) ? s.filter((svc) => svc.isActive) : [])
      })
      .catch(() => setError('Không thể tải dữ liệu.'))
      .finally(() => setLoading(false))
  }, [])

  // Fetch slots when branch/date/vehicles/services change
  useEffect(() => {
    if (step !== 2 || !selectedBranch || !selectedDate || selectedVehicleIds.length === 0) return
    let ignore = false

    const vehicleSelections = selectedVehicleIds.map((id) => ({
      fleetVehicleId: id,
      serviceIds: selectedServices[id] || [],
    }))

    if (vehicleSelections.some((vehicle) => vehicle.serviceIds.length === 0)) return

    Promise.resolve().then(() => {
      if (ignore) return
      setSelectedSlot(null)
      setSlotsLoading(true)
      setSlotError('')
    })

    getBusinessAvailableSlots({
      branchId: selectedBranch,
      targetDate: selectedDate,
      vehicles: vehicleSelections,
    })
      .then((data) => {
        if (!ignore) setSlots(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (ignore) return
        setSlots([])
        setSlotError(
          err.message ||
            'Không thể kiểm tra khung giờ. Tài khoản có thể chưa được duyệt hoặc chưa đủ điều kiện đặt lịch.',
        )
      })
      .finally(() => {
        if (!ignore) setSlotsLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [step, selectedBranch, selectedDate, selectedVehicleIds, selectedServices])

  const toggleVehicle = (vehicleId) => {
    setSelectedVehicleIds((prev) =>
      prev.includes(vehicleId) ? prev.filter((id) => id !== vehicleId) : [...prev, vehicleId]
    )
  }

  const toggleService = (fleetVehicleId, serviceId) => {
    setSelectedServices((prev) => {
      const current = prev[fleetVehicleId] || []
      const updated = current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
      return { ...prev, [fleetVehicleId]: updated }
    })
  }

  const selectedVehicles = selectedVehicleIds
    .map((id) => vehicles.find((vehicle) => vehicle.fleetVehicleId === id))
    .filter(Boolean)

  const allServicesSelected = () => {
    return selectedVehicleIds.every((id) => (selectedServices[id] || []).length > 0)
  }

  // Compute per-vehicle and total prices
  const vehiclePriceMap = {}
  let totalPrice = 0

  for (const vehicle of selectedVehicles) {
    const serviceIds = selectedServices[vehicle.fleetVehicleId] || []
    let vehicleTotal = 0
    const resolvedVehicleTypeId = resolveVehicleTypeId(vehicle, services)

    for (const serviceId of serviceIds) {
      const svc = services.find((s) => s.serviceId === serviceId)
      if (!svc) continue
      const svcPrice = getServicePriceForContext(svc, {
        branchId: selectedBranch,
        vehicleTypeId: resolvedVehicleTypeId,
      })
      vehicleTotal += svcPrice
    }

    vehiclePriceMap[vehicle.fleetVehicleId] = vehicleTotal
    totalPrice += vehicleTotal
  }

  const availableSlots = slots.filter((slot) => slot.isAvailable)
  const unavailableSlots = slots.filter((slot) => !slot.isAvailable)

  const canNext = () => {
    if (step === 0) return selectedVehicleIds.length > 0
    if (step === 1) return allServicesSelected()
    if (step === 2) return !!selectedSlot?.isAvailable
    if (step === 3) return true
    return false
  }

  const moveVehicle = async (currentIndex, direction) => {
    const targetIndex = currentIndex + direction
    if (
      scheduleUpdating ||
      targetIndex < 0 ||
      targetIndex >= selectedVehicleIds.length ||
      !selectedSlot
    ) return

    const reorderedIds = [...selectedVehicleIds]
    const movedVehicleId = reorderedIds[currentIndex]
    reorderedIds[currentIndex] = reorderedIds[targetIndex]
    reorderedIds[targetIndex] = movedVehicleId

    setScheduleUpdating(true)
    setError('')
    try {
      const updatedSlots = await getBusinessAvailableSlots({
        branchId: selectedBranch,
        targetDate: selectedDate,
        vehicles: reorderedIds.map((id) => ({
          fleetVehicleId: id,
          serviceIds: selectedServices[id] || [],
        })),
      })
      const updatedSlot = updatedSlots.find(
        (slot) => slot.slotId === selectedSlot.slotId && slot.isAvailable,
      )
      if (!updatedSlot) {
        throw new Error('Thứ tự này không còn phù hợp với khung giờ đã chọn.')
      }

      setSelectedVehicleIds(reorderedIds)
      setSlots(updatedSlots)
      setSelectedSlot(updatedSlot)
    } catch (err) {
      setError(err.message || 'Không thể cập nhật thứ tự rửa xe.')
    } finally {
      setScheduleUpdating(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const dto = {
        vehicles: selectedVehicleIds.map((id) => ({
          fleetVehicleId: id,
          serviceIds: selectedServices[id] || [],
        })),
        branchId: Number(selectedBranch),
        slotId: Number(selectedSlot?.slotId ?? selectedSlot?.id),
        scheduledTime: selectedDate,
      }
      await createBusinessBooking(dto)
      navigate('/business/bookings')
    } catch (err) {
      setError(
        err.message === 'BUSINESS_SLOT_CAPACITY_EXCEEDED'
          ? 'Khung giờ vừa hết chỗ cho toàn bộ xe đã chọn. Vui lòng quay lại và chọn khung giờ khác.'
          : getVietnameseApiErrorMessage(err, 'Tạo đặt lịch thất bại.'),
      )
      setSubmitting(false)
    }
  }

  if (loading && step === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="font-sora text-lg font-semibold text-on-surface">Đặt lịch rửa xe</h2>
        <button onClick={() => navigate('/business/bookings')} className="text-sm text-on-surface-variant hover:text-on-surface">
          ← Quay lại
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6">
        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-2 min-w-fit">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  idx < step
                    ? 'bg-primary text-on-primary'
                    : idx === step
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {idx < step ? <span className="material-symbols-outlined text-base filled">check</span> : idx + 1}
              </div>
              <span className={`text-xs font-medium ${idx === step ? 'text-primary' : 'text-on-surface-variant'}`}>
                {label}
              </span>
              {idx < STEPS.length - 1 && <div className="w-8 h-px bg-outline-variant mx-1" />}
            </div>
          ))}
        </div>

        {/* STEP 0: Select vehicles */}
        {step === 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-on-surface">Chọn xe đặt lịch</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedVehicleIds(vehicles.map((v) => v.fleetVehicleId))}
                  className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVehicleIds([])}
                  className="text-xs px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            {vehicles.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                Chưa có xe nào được duyệt. Hãy nhập danh sách xe trước.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {vehicles.map((vehicle) => {
                  const isSelected = selectedVehicleIds.includes(vehicle.fleetVehicleId)
                  return (
                    <button
                      key={vehicle.fleetVehicleId}
                      type="button"
                      onClick={() => toggleVehicle(vehicle.fleetVehicleId)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-outline-variant hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`material-symbols-outlined text-lg mt-0.5 ${isSelected ? 'text-primary filled' : 'text-on-surface-variant'}`}>
                          {isSelected ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-on-surface">{vehicle.licensePlate}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                            {vehicle.vehicleType} — {vehicle.brand} {vehicle.model}
                          </p>
                          {vehicle.driverName && (
                            <p className="text-xs text-on-surface-variant">
                              <span className="material-symbols-outlined text-[10px]">person</span> {vehicle.driverName}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {selectedVehicleIds.length > 0 && (
              <p className="text-xs text-on-surface-variant mt-2">
                Đã chọn <span className="font-semibold text-primary">{selectedVehicleIds.length}</span> xe
              </p>
            )}
          </div>
        )}

        {/* STEP 1: Per-vehicle services */}
        {step === 1 && (
          <div className="space-y-3">
            <h3 className="font-medium text-on-surface mb-1">Chọn dịch vụ cho từng xe</h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Mỗi xe có thể chọn dịch vụ khác nhau. Chọn ít nhất 1 dịch vụ cho mỗi xe.
            </p>

            {selectedVehicles.map((vehicle) => (
              <VehicleServiceRow
                key={vehicle.fleetVehicleId}
                vehicle={vehicle}
                services={services}
                selectedServices={selectedServices}
                onToggleService={toggleService}
                resolvedVehicleTypeId={resolveVehicleTypeId(vehicle, services)}
                branchId={selectedBranch}
              />
            ))}

            {selectedVehicleIds.length > 0 && (
              <div className="bg-surface-container rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-on-surface">Tổng cộng ({selectedVehicleIds.length} xe)</span>
                <span className="text-lg font-bold text-primary">{formatVnd(totalPrice)}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Branch + Date + Slot */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">Chi nhánh</label>
              <div className="space-y-2">
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => setSelectedBranch(branch.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      selectedBranch === branch.id
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant hover:border-primary/50'
                    }`}
                  >
                    <p className="text-sm font-medium text-on-surface">{branch.name}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{branch.address}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">Ngày đặt</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            {selectedBranch && selectedDate && (
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                  Chọn khung giờ bắt đầu
                  {selectedVehicleIds.length > 1 && (
                    <span className="ml-1 text-primary">(đặt {selectedVehicleIds.length} xe cùng lúc)</span>
                  )}
                </label>
                <p className="mb-3 text-xs text-on-surface-variant rounded-lg border border-outline-variant/60 bg-surface-container-low/50 px-3 py-2">
                  Đây là khung giờ bắt đầu. Nếu không đủ chỗ, hệ thống tự xếp các xe còn lại sang những khung giờ tiếp theo trong cùng ngày.
                </p>

                {slotsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : slotError ? (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                    {slotError}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">Chưa chọn đủ thông tin hoặc chưa chọn dịch vụ.</p>
                ) : availableSlots.length === 0 ? (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                    <p className="font-medium">Không còn khung giờ trống.</p>
                    {slots[0]?.reason && <p className="mt-1">{slots[0].reason}</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableSlots.map((slot) => {
                        const isSelected = selectedSlot?.slotId === slot.slotId
                        const durationHint = slot.estimatedLastEndMinutesIntoSlot != null && slot.estimatedLastEndMinutesIntoSlot > 0
                          ? `Xe cuối: +${slot.estimatedLastEndMinutesIntoSlot} phút`
                          : null
                        return (
                          <button
                            key={slot.slotId}
                            type="button"
                            title={slot.timeRange || slot.startTime}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-2.5 rounded-xl border text-xs font-medium transition-colors text-left ${
                              isSelected
                                ? 'border-primary bg-primary text-on-primary'
                                : 'border-outline-variant text-on-surface hover:border-primary/50'
                            }`}
                          >
                            <p className="font-semibold">{slot.startTime}</p>
                            {slot.endTime && (
                              <p className={`text-[10px] ${isSelected ? 'opacity-70' : 'text-on-surface-variant'}`}>
                                → {slot.endTime}
                              </p>
                            )}
                            {durationHint && (
                              <p className={`text-[10px] mt-0.5 ${isSelected ? 'opacity-80' : 'text-primary'}`}>{durationHint}</p>
                            )}
                            {slot.overflowSlotCount > 0 && (
                              <p className={`text-[10px] mt-0.5 ${isSelected ? 'opacity-80' : 'text-amber-700'}`}>
                                Tràn qua {slot.overflowSlotCount} slot tiếp theo
                              </p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    {unavailableSlots.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-on-surface-variant mb-1">Không khả dụng</p>
                        <div className="flex flex-wrap gap-2">
                          {unavailableSlots.map((slot) => (
                            <span
                              key={slot.slotId}
                              className="rounded-lg border border-outline-variant/50 px-2 py-1 text-[11px] text-on-surface-variant line-through"
                              title={slot.reason || 'Không khả dụng'}
                            >
                              {slot.startTime}{slot.endTime ? ` → ${slot.endTime}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-medium text-on-surface">Xác nhận đặt lịch</h3>

            <div className="bg-surface-container rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-outline-variant">
                <span className="material-symbols-outlined text-primary">store</span>
                <span className="text-sm font-semibold text-on-surface">
                  {branches.find((b) => b.id === selectedBranch)?.name}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                <span className="font-medium text-on-surface">Ngày:</span> {selectedDate}
              </p>
              <p className="text-xs text-on-surface-variant">
                <span className="font-medium text-on-surface">Thời gian bắt đầu:</span> {selectedSlot?.startTime || '—'}
                {selectedSlot?.estimatedLastEndMinutesIntoSlot != null && selectedSlot.estimatedLastEndMinutesIntoSlot > 0 && (
                  <span className="ml-2 text-on-surface-variant">
                    (dự kiến xe cuối sau {selectedSlot.estimatedLastEndMinutesIntoSlot} phút)
                  </span>
                )}
              </p>
              {selectedSlot?.overflowSlotCount > 0 && (
                <p className="text-xs font-medium text-amber-700">
                  Hệ thống đã tự phân bổ đoàn xe qua {selectedSlot.overflowSlotCount + 1} khung giờ.
                </p>
              )}
            </div>

            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-medium text-on-surface">
                    Thứ tự rửa · {selectedVehicleIds.length} xe
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Dùng nút lên/xuống để chọn xe rửa trước hoặc rửa sau.
                  </p>
                </div>
                {scheduleUpdating && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-primary whitespace-nowrap">
                    <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Đang tính lại
                  </span>
                )}
              </div>
              <div className={`space-y-2 transition-opacity ${scheduleUpdating ? 'opacity-60' : ''}`}>
                {selectedVehicles.map((vehicle, index) => {
                  const serviceIds = selectedServices[vehicle.fleetVehicleId] || []
                  const vehicleSvcs = serviceIds.map((id) => services.find((s) => s.serviceId === id)).filter(Boolean)
                  const projection = selectedSlot?.vehicleProjections?.find(
                    (item) => item.fleetVehicleId === vehicle.fleetVehicleId,
                  )
                  return (
                    <div key={vehicle.fleetVehicleId} className="bg-surface rounded-xl p-3 border border-outline-variant/50">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-7 h-7 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-on-surface">{vehicle.licensePlate}</p>
                              <p className="text-xs font-medium text-primary mt-0.5">
                                {formatScheduleTime(projection?.estimatedStart)}–{formatScheduleTime(projection?.estimatedEnd)}
                              </p>
                            </div>
                            <p className="text-sm font-bold text-primary whitespace-nowrap">{formatVnd(vehiclePriceMap[vehicle.fleetVehicleId] || 0)}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => moveVehicle(index, -1)}
                            disabled={index === 0 || scheduleUpdating}
                            aria-label={`Đưa xe ${vehicle.licensePlate} lên trước`}
                            title="Rửa trước"
                            className="w-8 h-8 rounded-lg border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-outline-variant disabled:hover:text-on-surface-variant transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">arrow_upward</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveVehicle(index, 1)}
                            disabled={index === selectedVehicles.length - 1 || scheduleUpdating}
                            aria-label={`Đưa xe ${vehicle.licensePlate} xuống sau`}
                            title="Rửa sau"
                            className="w-8 h-8 rounded-lg border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-outline-variant disabled:hover:text-on-surface-variant transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">arrow_downward</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 pl-10">
                        {vehicleSvcs.map((svc) => (
                          <span key={svc.serviceId} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full font-medium">
                            {svc.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-on-surface">Tổng cộng</p>
                <p className="text-xs text-on-surface-variant">{selectedVehicleIds.length} xe · {selectedVehicleIds.reduce((s, id) => s + (selectedServices[id] || []).length, 0)} dịch vụ</p>
              </div>
              <p className="text-xl font-bold text-primary">{formatVnd(totalPrice)}</p>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-outline-variant">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="px-4 py-2 text-sm font-medium text-on-surface-variant border border-outline-variant rounded-xl hover:bg-surface-container disabled:opacity-50 transition-colors"
          >
            ← Quay lại
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="px-6 py-2 text-sm font-medium text-on-primary bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Tiếp tục →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || scheduleUpdating}
              className="px-6 py-2 text-sm font-medium text-on-primary bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  Đang đặt lịch...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">check</span>
                  Xác nhận đặt lịch ({selectedVehicleIds.length} xe)
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
