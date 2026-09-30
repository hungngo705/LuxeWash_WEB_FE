import { apiRequest } from './client'

const BASE = '/manager/incidents'

function mutation(path, method, payload) {
  return apiRequest(path, {
    method,
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  })
}

function unwrapData(response) {
  return response?.data ?? response
}

/**
 * BE response: { success: true, data: { affectedBookingsCount, totalCapacityLoss, affectedBookings } }.
 * Each affected booking also contains isOverbooked so the Manager can decide
 * which customers should receive an incident notification.
 */
export async function previewIncident(payload) {
  const response = await mutation(`${BASE}/preview`, 'POST', payload)
  return unwrapData(response)
}

/** BE body includes selectedBookingIds; only those bookings are notified. */
export function createIncident(payload) {
  return mutation(BASE, 'POST', payload)
}

/** BE response: { success: true, data: { items, totalCount, page, pageSize } }. */
export async function listIncidents(page = 1, pageSize = 10) {
  const response = await apiRequest(`${BASE}?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`)
  return unwrapData(response)
}

export async function getIncident(id) {
  const response = await apiRequest(`${BASE}/${encodeURIComponent(id)}`)
  return unwrapData(response)
}

/** BE impact is a full array, not a paginated collection. */
export async function getIncidentImpact(id) {
  const response = await apiRequest(`${BASE}/${encodeURIComponent(id)}/impact`)
  return unwrapData(response)
}

/** BE: PUT /{id}/extend, body { newEstimatedEndAtVn, note, selectedBookingIds }. */
export function extendIncident(id, payload) {
  return mutation(`${BASE}/${encodeURIComponent(id)}/extend`, 'PUT', payload)
}

/** BE: POST /{id}/resolve without a request body. */
export function resolveIncident(id) {
  return mutation(`${BASE}/${encodeURIComponent(id)}/resolve`, 'POST')
}
