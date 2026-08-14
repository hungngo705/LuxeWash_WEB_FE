import { apiRequest } from './client'
import { toApiTimeValue, toTimeInputValue } from './admin.timeSlots.api'

/** @param {unknown} data */
function asCollection(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const obj = /** @type {Record<string, unknown>} */ (data)
    if (Array.isArray(obj.items)) return obj.items
    if (Array.isArray(obj.value)) return obj.value
    if (Array.isArray(obj.data)) return obj.data
  }
  return []
}

/** @param {Record<string, unknown>} item */
export function normalizeWorkShift(item) {
  return {
    workShiftId: Number(item.workShiftId ?? item.id),
    shiftName: String(item.shiftName ?? ''),
    startTime: item.startTime != null ? String(item.startTime) : '',
    endTime: item.endTime != null ? String(item.endTime) : '',
    isActive: item.isActive !== false,
  }
}

/** @param {Record<string, unknown>} item */
export function normalizeShiftAssignment(item) {
  return {
    shiftAssignmentId: Number(item.shiftAssignmentId ?? item.assignmentId ?? item.id),
    staffUserId: Number(item.staffUserId ?? 0),
    staffName: String(item.staffName ?? item.fullName ?? '—'),
    workShiftId: Number(item.workShiftId ?? 0),
    shiftName: String(item.shiftName ?? '—'),
    workDate: String(item.workDate ?? ''),
    status: String(item.status ?? 'Scheduled'),
    note: item.note != null ? String(item.note) : '',
  }
}

/** @param {Record<string, unknown>} item */
export function normalizeOvertimeRequest(item) {
  return {
    overtimeRequestId: Number(item.overtimeRequestId ?? item.id),
    staffUserId: Number(item.staffUserId ?? 0),
    staffName: String(item.staffName ?? item.fullName ?? '—'),
    workDate: String(item.workDate ?? ''),
    startTime: item.startTime != null ? String(item.startTime) : '',
    endTime: item.endTime != null ? String(item.endTime) : '',
    reason: item.reason != null ? String(item.reason) : '',
    status: String(item.status ?? 'Pending'),
    reviewNote: item.reviewNote != null ? String(item.reviewNote) : '',
  }
}

/** @param {Record<string, unknown>} item */
export function normalizeShiftSwapRequest(item) {
  return {
    shiftSwapRequestId: Number(item.shiftSwapRequestId ?? item.id),
    requesterName: String(item.requesterName ?? item.requestedByName ?? '—'),
    fromAssignmentId: Number(item.fromAssignmentId ?? 0),
    toAssignmentId: Number(item.toAssignmentId ?? 0),
    fromStaffName: String(item.fromStaffName ?? '—'),
    toStaffName: String(item.toStaffName ?? '—'),
    fromShiftName: String(item.fromShiftName ?? ''),
    toShiftName: String(item.toShiftName ?? ''),
    fromWorkDate: String(item.fromWorkDate ?? ''),
    toWorkDate: String(item.toWorkDate ?? ''),
    reason: item.reason != null ? String(item.reason) : '',
    status: String(item.status ?? 'Pending'),
    reviewNote: item.reviewNote != null ? String(item.reviewNote) : '',
  }
}

/** @param {string} date YYYY-MM-DD */
export function toApiWorkDate(date) {
  if (!date) return date
  return date.includes('T') ? date : `${date}T00:00:00.000Z`
}

export async function fetchManagerWorkShifts(includeInactive = false) {
  const qs = includeInactive ? '?includeInactive=true' : ''
  const data = await apiRequest(`/manager/work-shifts${qs}`)
  return asCollection(data).map(normalizeWorkShift)
}

export function createManagerWorkShift(payload) {
  return apiRequest('/manager/work-shifts', {
    method: 'POST',
    body: JSON.stringify({
      shiftName: payload.shiftName,
      startTime: toApiTimeValue(payload.startTime),
      endTime: toApiTimeValue(payload.endTime),
    }),
  })
}

export function updateManagerWorkShift(id, payload) {
  return apiRequest(`/manager/work-shifts/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      shiftName: payload.shiftName,
      startTime: toApiTimeValue(payload.startTime),
      endTime: toApiTimeValue(payload.endTime),
      isActive: payload.isActive !== false,
    }),
  })
}

export async function fetchManagerShiftAssignments(filter = {}) {
  const params = new URLSearchParams()
  if (filter.fromDate) params.set('fromDate', filter.fromDate)
  if (filter.toDate) params.set('toDate', filter.toDate)
  if (filter.staffUserId) params.set('staffUserId', String(filter.staffUserId))
  const qs = params.toString()
  const data = await apiRequest(`/manager/shift-assignments${qs ? `?${qs}` : ''}`)
  return asCollection(data).map(normalizeShiftAssignment)
}

export function createManagerShiftAssignment(payload) {
  return apiRequest('/manager/shift-assignments', {
    method: 'POST',
    body: JSON.stringify({
      staffUserId: Number(payload.staffUserId),
      workShiftId: Number(payload.workShiftId),
      workDate: toApiWorkDate(payload.workDate),
      note: payload.note?.trim() || null,
    }),
  })
}

export function updateManagerShiftAssignment(id, payload) {
  return apiRequest(`/manager/shift-assignments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      workShiftId: Number(payload.workShiftId),
      workDate: toApiWorkDate(payload.workDate),
      status: payload.status || null,
      note: payload.note?.trim() || null,
    }),
  })
}

export function deleteManagerShiftAssignment(id) {
  return apiRequest(`/manager/shift-assignments/${id}`, { method: 'DELETE' })
}

export async function fetchManagerOvertimeRequests(status) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  const data = await apiRequest(`/manager/overtime-requests${qs}`)
  return asCollection(data).map(normalizeOvertimeRequest)
}

export function reviewManagerOvertimeRequest(id, { isApproved, reviewNote }) {
  return apiRequest(`/manager/overtime-requests/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify({ isApproved, reviewNote: reviewNote?.trim() || null }),
  })
}

export async function fetchManagerShiftSwapRequests(status) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  const data = await apiRequest(`/manager/shift-swap-requests${qs}`)
  return asCollection(data).map(normalizeShiftSwapRequest)
}

export function reviewManagerShiftSwapRequest(id, { isApproved, reviewNote }) {
  return apiRequest(`/manager/shift-swap-requests/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify({ isApproved, reviewNote: reviewNote?.trim() || null }),
  })
}

export { toTimeInputValue }
