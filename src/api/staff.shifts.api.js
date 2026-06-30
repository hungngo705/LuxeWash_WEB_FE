import { apiRequest } from './client'
import { toApiTimeValue } from './admin.timeSlots.api'

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
export function normalizeStaffShift(item) {
  return {
    shiftAssignmentId: Number(item.shiftAssignmentId ?? item.assignmentId ?? item.id),
    staffUserId: item.staffUserId != null ? Number(item.staffUserId) : undefined,
    staffName: item.staffName != null ? String(item.staffName) : '',
    workShiftId: Number(item.workShiftId ?? 0),
    shiftName: String(item.shiftName ?? '—'),
    workDate: String(item.workDate ?? ''),
    startTime: item.startTime != null ? String(item.startTime) : '',
    endTime: item.endTime != null ? String(item.endTime) : '',
    status: String(item.status ?? 'Scheduled'),
    note: item.note != null ? String(item.note) : '',
  }
}

/** @param {Record<string, unknown>} item */
export function normalizeStaffOvertimeRequest(item) {
  return {
    overtimeRequestId: Number(item.overtimeRequestId ?? item.id),
    workDate: String(item.workDate ?? ''),
    startTime: item.startTime != null ? String(item.startTime) : '',
    endTime: item.endTime != null ? String(item.endTime) : '',
    reason: item.reason != null ? String(item.reason) : '',
    status: String(item.status ?? 'Pending'),
    reviewNote: item.reviewNote != null ? String(item.reviewNote) : '',
  }
}

/** @param {Record<string, unknown>} item */
export function normalizeStaffShiftSwapRequest(item) {
  return {
    shiftSwapRequestId: Number(item.shiftSwapRequestId ?? item.id),
    fromAssignmentId: Number(item.fromAssignmentId ?? 0),
    toAssignmentId: Number(item.toAssignmentId ?? 0),
    requestedByName: item.requestedByName != null ? String(item.requestedByName) : '',
    fromStaffName: item.fromStaffName != null ? String(item.fromStaffName) : '',
    toStaffName: item.toStaffName != null ? String(item.toStaffName) : '',
    fromWorkDate: item.fromWorkDate != null ? String(item.fromWorkDate) : '',
    toWorkDate: item.toWorkDate != null ? String(item.toWorkDate) : '',
    reason: item.reason != null ? String(item.reason) : '',
    status: String(item.status ?? 'Pending'),
    reviewNote: item.reviewNote != null ? String(item.reviewNote) : '',
  }
}

/** @param {string} date YYYY-MM-DD */
function toApiWorkDate(date) {
  if (!date) return date
  return date.includes('T') ? date : `${date}T00:00:00.000Z`
}

/** @param {string | undefined} date YYYY-MM-DD */
function toStaffShiftQueryDate(date) {
  if (!date) return ''
  return date.includes('T') ? date : `${date}T00:00:00`
}

export async function fetchStaffShifts(filter = {}) {
  const params = new URLSearchParams()
  if (filter.fromDate) params.set('fromDate', toStaffShiftQueryDate(filter.fromDate))
  if (filter.toDate) params.set('toDate', toStaffShiftQueryDate(filter.toDate))
  const qs = params.toString()
  const data = await apiRequest(`/staff/me/shifts${qs ? `?${qs}` : ''}`)
  return asCollection(data).map(normalizeStaffShift)
}

export async function fetchStaffOvertimeRequests() {
  const data = await apiRequest('/staff/me/overtime-requests')
  return asCollection(data).map(normalizeStaffOvertimeRequest)
}

export function createStaffOvertimeRequest(payload) {
  return apiRequest('/staff/me/overtime-requests', {
    method: 'POST',
    body: JSON.stringify({
      workDate: toApiWorkDate(payload.workDate),
      startTime: toApiTimeValue(payload.startTime),
      endTime: toApiTimeValue(payload.endTime),
      reason: payload.reason?.trim() || null,
    }),
  })
}

export async function fetchStaffShiftSwapRequests() {
  const data = await apiRequest('/staff/me/shift-swap-requests')
  return asCollection(data).map(normalizeStaffShiftSwapRequest)
}

export function createStaffShiftSwapRequest(payload) {
  return apiRequest('/staff/me/shift-swap-requests', {
    method: 'POST',
    body: JSON.stringify({
      fromAssignmentId: Number(payload.fromAssignmentId),
      toAssignmentId: Number(payload.toAssignmentId),
      reason: payload.reason?.trim() || null,
    }),
  })
}
