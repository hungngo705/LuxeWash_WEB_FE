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
import { formatVnd } from '../../utils/format'

const STEPS = ['Chọn xe', 'Chọn dịch vụ', 'Chi nhánh & slot', 'Xác nhận']

export default function BusinessNewBookingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [vehicles, setVehicles] = useState([])
  const [branches, setBranches] = useState([])
  const [services, setServices] = useState([])
  const [slots, setSlots] = useState([])

  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedServices, setSelectedServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotError, setSlotError] = useState('')
  const [submitting, setSubmitting] = useState(false)
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

  useEffect(() => {
    if (step !== 2 || !selectedBranch || !selectedDate || !selectedVehicle || selectedServices.length === 0) {
      return
    }

    setSelectedSlot(null)
    setSlotsLoading(true)
    setSlotError('')

    getBusinessAvailableSlots({
      branchId: selectedBranch,
      fleetVehicleId: selectedVehicle.fleetVehicleId,
      targetDate: selectedDate,
      serviceIds: selectedServices,
    })
      .then((data) => setSlots(Array.isArray(data) ? data : []))
      .catch((err) => {
        setSlots([])
        setSlotError(
          err.message ||
            'Không thể kiểm tra khung giờ. Tài khoản có thể chưa được duyệt hoặc chưa đủ điều kiện đặt lịch.',
        )
      })
      .finally(() => setSlotsLoading(false))
  }, [step, selectedBranch, selectedDate, selectedVehicle, selectedServices])

  const toggleService = (serviceId) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    )
  }

  const resolvedVehicleTypeId = resolveVehicleTypeId(selectedVehicle, services)

  const totalPrice = selectedServices.reduce((sum, id) => {
    const svc = services.find((s) => s.serviceId === id)
    if (!svc) return sum
    return (
      sum +
      getServicePriceForContext(svc, {
        branchId: selectedBranch,
        vehicleTypeId: resolvedVehicleTypeId,
      })
    )
  }, 0)

  const availableSlots = slots.filter((slot) => slot.isAvailable)

  const canNext = () => {
    if (step === 0) return !!selectedVehicle
    if (step === 1) return selectedServices.length > 0
    if (step === 2) return !!selectedSlot?.isAvailable
    if (step === 3) return selectedServices.length > 0
    return false
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const dto = {
        fleetVehicleId: selectedVehicle.fleetVehicleId,
        branchId: Number(selectedBranch),
        slotId: selectedSlot?.slotId ?? selectedSlot?.id,
        scheduledTime: selectedDate,
        serviceIds: selectedServices,
      }
      await createBusinessBooking(dto)
      navigate('/business/bookings')
    } catch (err) {
      setError(err.message || 'Tạo đặt lịch thất bại.')
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
    <div className="space-y-6 max-w-3xl">
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

        {step === 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-on-surface mb-3">Chọn xe từ danh sách xe</h3>
            {vehicles.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Chưa có xe nào được duyệt. Hãy nhập danh sách xe trước.</p>
            ) : (
              vehicles.map((vehicle) => (
                <button
                  key={vehicle.fleetVehicleId}
                  type="button"
                  onClick={() => setSelectedVehicle(vehicle)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    selectedVehicle?.fleetVehicleId === vehicle.fleetVehicleId
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant hover:border-primary/50'
                  }`}
                >
                  <p className="text-sm font-medium text-on-surface">{vehicle.licensePlate}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {vehicle.vehicleType} — {vehicle.brand} {vehicle.model}
                  </p>
                </button>
              ))
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <h3 className="font-medium text-on-surface mb-3">Chọn dịch vụ</h3>
            {services.map((service) => {
              const price = getServicePriceForContext(service, {
                branchId: selectedBranch,
                vehicleTypeId: resolvedVehicleTypeId,
              })
              return (
                <button
                  key={service.serviceId}
                  type="button"
                  onClick={() => toggleService(service.serviceId)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors flex items-center justify-between ${
                    selectedServices.includes(service.serviceId)
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant hover:border-primary/50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-on-surface">{service.name}</p>
                    <p className="text-xs text-on-surface-variant">{service.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-primary">{formatVnd(price)}</span>
                    {selectedServices.includes(service.serviceId) && (
                      <span className="material-symbols-outlined text-primary filled">check_circle</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">Chọn chi nhánh</label>
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
              <label className="block text-sm font-medium text-on-surface-variant mb-2">Chọn ngày</label>
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
                <label className="block text-sm font-medium text-on-surface-variant mb-2">Chọn khung giờ</label>
                {slotsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : slotError ? (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                    {slotError}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">Không có khung giờ cho ngày này.</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">
                    Không còn khung giờ trống. {slots[0]?.reason ? `(${slots[0].reason})` : ''}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {slots.map((slot) => {
                      const label =
                        slot.timeRange ||
                        (slot.startTime && slot.endTime
                          ? `${slot.startTime} — ${slot.endTime}`
                          : `Slot #${slot.slotId}`)
                      const isSelected = selectedSlot?.slotId === slot.slotId
                      return (
                        <button
                          key={slot.slotId}
                          type="button"
                          disabled={!slot.isAvailable}
                          title={slot.isAvailable ? label : slot.reason || 'Không khả dụng'}
                          onClick={() => slot.isAvailable && setSelectedSlot(slot)}
                          className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                            !slot.isAvailable
                              ? 'border-outline-variant/50 text-on-surface-variant/50 cursor-not-allowed line-through'
                              : isSelected
                              ? 'border-primary bg-primary text-on-primary'
                              : 'border-outline-variant text-on-surface hover:border-primary/50'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-surface-container rounded-xl p-4 space-y-2">
              <h4 className="font-medium text-on-surface">Tổng quan đặt lịch</h4>
              <div className="text-sm text-on-surface-variant space-y-1">
                <p>
                  Xe: <span className="text-on-surface">{selectedVehicle?.licensePlate}</span>
                </p>
                <p>
                  Chi nhánh:{' '}
                  <span className="text-on-surface">
                    {branches.find((b) => b.id === selectedBranch)?.name}
                  </span>
                </p>
                <p>
                  Ngày: <span className="text-on-surface">{selectedDate}</span>
                </p>
                <p>
                  Slot:{' '}
                  <span className="text-on-surface">
                    {selectedSlot?.timeRange ||
                      (selectedSlot?.startTime && selectedSlot?.endTime
                        ? `${selectedSlot.startTime} — ${selectedSlot.endTime}`
                        : '—')}
                  </span>
                </p>
                <p>
                  Dịch vụ: <span className="text-on-surface">{selectedServices.length} dịch vụ</span>
                </p>
              </div>
              <div className="border-t border-outline-variant pt-2 mt-2 flex justify-between">
                <span className="text-sm font-medium text-on-surface">Tổng cộng</span>
                <span className="text-lg font-bold text-primary">{formatVnd(totalPrice)}</span>
              </div>
            </div>
          </div>
        )}

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
              disabled={submitting}
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
                  Xác nhận đặt lịch
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
