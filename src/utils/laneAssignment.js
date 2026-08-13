const PAID_STATUSES = new Set(['completed', 'paid', 'success', 'succeeded'])

export function isPaymentCompleted(status) {
  return PAID_STATUSES.has(String(status ?? '').trim().toLowerCase())
}

export function hasAssignedLane(booking) {
  return Boolean(
    Number(booking?.processingLaneId) > 0 ||
      String(booking?.processingLaneName ?? '').trim(),
  )
}

export function isBusinessBooking(booking) {
  const type = String(booking?.bookingType ?? '').trim().toLowerCase()
  return type === 'business' || type === 'fleet' || Number(booking?.fleetWashLogId) > 0
}

export function canStartWash(booking) {
  if (booking?.status !== 'Checked-in' || !hasAssignedLane(booking)) return false
  return isBusinessBooking(booking) ||
    Number(booking?.finalAmount ?? 0) <= 0 ||
    isPaymentCompleted(booking?.paymentStatus)
}

export function canCheckIn(booking) {
  return isBusinessBooking(booking) ||
    Number(booking?.finalAmount ?? 0) <= 0 ||
    isPaymentCompleted(booking?.paymentStatus)
}

export function getLaneAssignmentState(booking) {
  if (!booking) return 'unknown'
  if (booking.status === 'Processing') return 'processing'
  if (booking.status === 'Checked-in') {
    const paymentStatus = String(booking.paymentStatus ?? '').trim()
    if (
      !isBusinessBooking(booking) &&
      Number(booking.finalAmount ?? 0) > 0 &&
      paymentStatus &&
      paymentStatus !== '—' &&
      !isPaymentCompleted(paymentStatus)
    ) {
      return 'payment'
    }
    return hasAssignedLane(booking) ? 'assigned' : 'waiting'
  }
  if (booking.status === 'Pending') {
    const paymentStatus = String(booking.paymentStatus ?? '').trim()
    if (
      !isBusinessBooking(booking) &&
      Number(booking.finalAmount ?? 0) > 0 &&
      paymentStatus &&
      paymentStatus !== '—' &&
      !isPaymentCompleted(paymentStatus)
    ) {
      return 'payment'
    }
    return 'pending'
  }
  return 'unknown'
}

export function getLaneDisplayName(booking, fallback = 'Chưa có làn') {
  const name = String(booking?.processingLaneName ?? '').trim()
  if (name) return name
  const id = Number(booking?.processingLaneId)
  return id > 0 ? `Làn ${id}` : fallback
}
