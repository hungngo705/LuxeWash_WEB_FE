import { apiRequest } from './client'

/**
 * @typedef {{
 *   tierId: number
 *   tierName: string
 *   pointMultiplier: number
 *   bookingWindowDays: number
 *   minAccumulatedPoints: number
 * }} Tier
 *
 * @typedef {{
 *   tierName: string
 *   pointMultiplier: number
 *   bookingWindowDays: number
 *   minAccumulatedPoints: number
 * }} TierPayload
 */

/** @returns {Promise<Tier[]>} */
export function fetchTiers() {
  return apiRequest('/tiers')
}

/** @param {TierPayload} payload @returns {Promise<Tier>} */
export function createTier(payload) {
  return apiRequest('/tiers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** @param {number} id @param {TierPayload} payload */
export function updateTier(id, payload) {
  return apiRequest(`/tiers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
