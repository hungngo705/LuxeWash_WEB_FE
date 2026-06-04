import { apiRequest } from './client'

/**
 * POST /api/v1/bookings/available-slots
 * Checks available time slots for a given date and set of vehicles/services.
 * @param {{ targetDate: string; bookingVehicles: Array<{ licensePlate?: string; vehicleId?: number; serviceId: number }> }} payload
 * @returns {Promise<Array>}
 */
export function checkAvailableSlots(payload) {
  return apiRequest('/bookings/available-slots', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * POST /api/v1/bookings/check-compatibility
 * Final check that the selected slot still has capacity before creating a booking.
 * @param {{ targetDate: string; bookingVehicles: Array<{ licensePlate?: string; vehicleId?: number; serviceId: number }> }} payload
 */
export function checkCompatibility(payload) {
  return apiRequest('/bookings/check-compatibility', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * POST /api/v1/bookings
 * Creates a new booking. Wallet is charged atomically.
 * @param {{
 *   branchId: number
 *   slotId: number
 *   bookingVehicles: Array<{
 *     licensePlate: string
 *     vehicleId?: number
 *     serviceId: number
 *   }>
 *   voucherCodes?: string[]
 *   usePointDiscount?: boolean
 * }} payload
 */
export function createBooking(payload) {
  return apiRequest('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * POST /api/v1/bookings/walk-in
 * Creates a walk-in booking (check-in immediately without a pre-booked slot).
 * @param {{
 *   branchId: number
 *   licensePlate: string
 *   vehicleId?: number
 *   serviceIds: number[]
 *   laneId?: number
 * }} payload
 */
export function createWalkInBooking(payload) {
  return apiRequest('/bookings/walk-in', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
