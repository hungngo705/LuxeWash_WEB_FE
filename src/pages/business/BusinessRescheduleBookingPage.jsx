import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchBookingDetail,
  fetchBusinessServices,
  fetchFleetVehicles,
  getBusinessAvailableSlots,
  rescheduleBusinessBooking,
} from '../../api/business.api'
import { fetchBranches } from '../../api/admin.branches.api'
import { formatDateTime, formatVnd } from '../../utils/format'

const DAY_MS = 24 * 60 * 60 * 1000

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function toDateValue(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function slotDateTime(dateValue, startTime) {
  if (!dateValue || !startTime) return null
  const value = new Date(`${dateValue}T${startTime}:00`)
  return Number.isNaN(value.getTime()) ? null : value
}

function findOriginalBranch(detail, vehicle, services, branches) {
  const directMatch = branches.find((item) => Number(item.id) === Number(detail.branchId))
  if (directMatch) return directMatch

  const serviceNames = (detail.services ?? []).map((line) => normalizeName(line.name ?? line))
  const vehicleTypeId = vehicle?.vehicleTypeId
  const vehicleTypeName = normalizeName(vehicle?.vehicleType ?? vehicle?.vehicleTypeName)
  const totalAmount = Number(detail.finalAmount ?? detail.originalPrice)

  const candidates = branches.filter((branch) => {
    let total = 0
    for (const serviceName of serviceNames) {
      const service = services.find((item) => normalizeName(item.name) === serviceName)
      if (!service) return false

      const price = (service.prices ?? []).find((row) => {
        if (Number(row.branchId) !== Number(branch.id)) return false
        if (vehicleTypeId != null) {
          return Number(row.vehicleTypeId) === Number(vehicleTypeId)
        }
        const rowTypeName = normalizeName(row.vehicleTypeName)
        return (
          rowTypeName &&
          vehicleTypeName &&
          (rowTypeName.includes(vehicleTypeName) || vehicleTypeName.includes(rowTypeName))
        )
      })
      if (!price || !Number.isFinite(Number(price.price))) return false
      total += Number(price.price)
    }
    return serviceNames.length > 0 && total === totalAmount
  })

  return candidates.length === 1 ? candidates[0] : null
}

export default function BusinessRescheduleBookingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [vehicle, setVehicle] = useState(null)
  const [branch, setBranch] = useState(null)
  const [serviceIds, setServiceIds] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [slotError, setSlotError] = useState('')
  const [cutoff] = useState(() => new Date(Date.now() + DAY_MS))

  const minDate = useMemo(() => toDateValue(cutoff), [cutoff])
  const oldScheduledTimestamp = booking?.scheduledTime
    ? new Date(booking.scheduledTime).getTime()
    : Number.NaN
  const canReschedule =
    booking?.status === 'Pending' &&
    !Number.isNaN(oldScheduledTimestamp) &&
    oldScheduledTimestamp > cutoff.getTime()

  useEffect(() => {
    let active = true
    Promise.all([
      fetchBookingDetail(id),
      fetchFleetVehicles(),
      fetchBusinessServices(),
      fetchBranches(),
    ])
      .then(([detail, vehicles, services, branches]) => {
        if (!active) return

        const matchedVehicle = vehicles.find(
          (item) => normalizeName(item.licensePlate) === normalizeName(detail.licensePlate),
        )
        const matchedServices = (detail.services ?? [])
          .map((line) =>
            services.find(
              (item) => normalizeName(item.name) === normalizeName(line.name ?? line),
            ),
          )
          .filter(Boolean)
        const matchedBranch = findOriginalBranch(
          detail,
          matchedVehicle,
          services,
          branches,
        )

        setBooking(detail)
        setVehicle(matchedVehicle ?? null)
        setServiceIds(matchedServices.map((service) => Number(service.serviceId)))
        setBranch(matchedBranch)

        const oldTime = new Date(detail.scheduledTime)
        if (detail.status !== 'Pending') {
          setError('Chỉ có thể đổi lịch khi booking đang ở trạng thái Đã đặt lịch.')
        } else if (Number.isNaN(oldTime.getTime()) || oldTime.getTime() <= Date.now() + DAY_MS) {
          setError(
            'Không thể đổi lịch trong vòng 24 giờ trước giờ hẹn. Vui lòng liên hệ chi nhánh để được hỗ trợ.',
          )
        } else if (!matchedVehicle) {
          setError('Không xác định được xe của lịch đặt trong danh sách xe đang hoạt động.')
        } else if (matchedServices.length !== (detail.services ?? []).length) {
          setError('Không xác định đầy đủ dịch vụ gốc của lịch đặt.')
        } else if (!matchedBranch) {
          setError('Không xác định chắc chắn được chi nhánh gốc của lịch đặt.')
        }
      })
      .catch((err) => setError(err.message || 'Không thể tải thông tin lịch đặt.'))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (!selectedDate || !branch || !vehicle || serviceIds.length === 0 || !canReschedule) {
      return
    }

    let active = true
    getBusinessAvailableSlots({
      branchId: branch.id,
      fleetVehicleId: vehicle.fleetVehicleId,
      targetDate: selectedDate,
      serviceIds,
      vehicleCount: 1,
    })
      .then((data) => {
        if (!active) return
        setSlots(
          data.map((slot) => {
            const newTime = slotDateTime(selectedDate, slot.startTime)
            if (newTime && newTime.getTime() <= cutoff.getTime()) {
              return {
                ...slot,
                isAvailable: false,
                reason: 'Khung giờ mới phải cách thời điểm hiện tại ít nhất 24 giờ.',
              }
            }
            if (
              newTime &&
              !Number.isNaN(oldScheduledTimestamp) &&
              Math.abs(newTime.getTime() - oldScheduledTimestamp) < 60_000
            ) {
              return {
                ...slot,
                isAvailable: false,
                reason: 'Khung giờ mới giống với khung giờ hiện tại.',
              }
            }
            return slot
          }),
        )
      })
      .catch((err) => setSlotError(err.message || 'Không thể kiểm tra khung giờ.'))
      .finally(() => {
        if (active) setSlotsLoading(false)
      })

    return () => {
      active = false
    }
  }, [
    branch,
    canReschedule,
    cutoff,
    oldScheduledTimestamp,
    selectedDate,
    serviceIds,
    vehicle,
  ])

  const handleDateChange = (event) => {
    const value = event.target.value
    setSelectedDate(value)
    setSelectedSlot(null)
    setSlots([])
    setSlotError('')
    setSlotsLoading(Boolean(value))
  }

  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await rescheduleBusinessBooking(id, {
        newScheduledDate: selectedDate,
        newSlotId: selectedSlot.slotId,
      })
      navigate(`/business/bookings/${id}`, {
        replace: true,
        state: { successMessage: 'Đã đổi lịch đặt thành công.' },
      })
    } catch (err) {
      setError(err.message || 'Đổi lịch đặt thất bại.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    )
  }

  const availableSlots = slots.filter((slot) => slot.isAvailable)
  const unavailableSlots = slots.filter((slot) => !slot.isAvailable)

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-sora text-lg font-semibold text-on-surface">
            Đổi lịch đặt #{id}
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Giữ nguyên xe, dịch vụ, chi nhánh và số tiền.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/business/bookings/${id}`)}
          className="text-sm text-on-surface-variant hover:text-on-surface"
        >
          ← Quay lại
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {booking && (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <section className="space-y-4 rounded-xl bg-surface-container p-4">
              <div className="flex items-center gap-2 border-b border-outline-variant pb-3">
                <span className="material-symbols-outlined text-primary">event</span>
                <h3 className="text-sm font-semibold text-on-surface">Lịch hiện tại</h3>
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-on-surface-variant">Xe</dt>
                  <dd className="font-semibold text-on-surface">{booking.licensePlate}</dd>
                </div>
                <div>
                  <dt className="text-xs text-on-surface-variant">Chi nhánh</dt>
                  <dd>{branch?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-on-surface-variant">Thời gian</dt>
                  <dd>{formatDateTime(booking.scheduledTime)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-on-surface-variant">Dịch vụ giữ nguyên</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {(booking.services ?? []).map((service, index) => (
                      <span
                        key={`${service.name}-${index}`}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                      >
                        {service.name}
                      </span>
                    ))}
                  </dd>
                </div>
                <div className="border-t border-outline-variant pt-3">
                  <dt className="text-xs text-on-surface-variant">Số tiền giữ nguyên</dt>
                  <dd className="font-semibold text-primary">
                    {formatVnd(booking.finalAmount ?? booking.originalPrice ?? 0)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-on-surface-variant">
                  Chi nhánh
                </label>
                <div className="rounded-xl border border-primary bg-primary/5 p-4">
                  <p className="text-sm font-medium text-on-surface">{branch?.name || '—'}</p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    Không thể đổi sang chi nhánh khác.
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-on-surface-variant">
                  Ngày mới
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={minDate}
                  disabled={!canReschedule || !branch || !vehicle || serviceIds.length === 0}
                  onChange={handleDateChange}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-on-surface-variant">
                  Lịch mới phải cách thời điểm hiện tại ít nhất 24 giờ.
                </p>
              </div>

              {selectedDate && canReschedule && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-on-surface-variant">
                    Chọn khung giờ bắt đầu
                  </label>
                  {slotsLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                    </div>
                  ) : slotError ? (
                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                      {slotError}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                      Không còn khung giờ phù hợp trong ngày đã chọn.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {availableSlots.map((slot) => {
                        const selected = selectedSlot?.slotId === slot.slotId
                        return (
                          <button
                            key={slot.slotId}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`rounded-xl border p-3 text-left text-xs transition-colors ${
                              selected
                                ? 'border-primary bg-primary text-on-primary'
                                : 'border-outline-variant text-on-surface hover:border-primary/50'
                            }`}
                          >
                            <p className="font-semibold">{slot.startTime}</p>
                            {slot.endTime && (
                              <p
                                className={`text-[10px] ${
                                  selected ? 'opacity-75' : 'text-on-surface-variant'
                                }`}
                              >
                                → {slot.endTime}
                              </p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {unavailableSlots.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1 text-xs font-medium text-on-surface-variant">
                        Không khả dụng
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {unavailableSlots.map((slot) => (
                          <span
                            key={slot.slotId}
                            title={slot.reason}
                            className="rounded-lg border border-outline-variant/50 px-2 py-1 text-[11px] text-on-surface-variant line-through"
                          >
                            {slot.startTime}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {selectedSlot && (
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-on-surface">Xác nhận lịch mới</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                {selectedDate} · {selectedSlot.timeRange || selectedSlot.startTime} ·{' '}
                {branch?.name}
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-outline-variant pt-6">
            <button
              type="button"
              onClick={() => navigate(`/business/bookings/${id}`)}
              className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canReschedule || !selectedSlot || submitting}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-medium text-on-primary hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Đang đổi lịch...' : 'Xác nhận đổi lịch'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
