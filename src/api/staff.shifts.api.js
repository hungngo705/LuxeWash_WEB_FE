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
    createdAt: item.createdAt != null ? String(item.createdAt) : '',
  }
}

/** @param {Record<string, unknown>} item */
export function normalizeStaffShiftSwapRequest(item) {
  return {
    shiftSwapRequestId: Number(item.shiftSwapRequestId ?? item.id),
    fromAssignmentId: Number(item.fromAssignmentId ?? 0),
    toAssignmentId: item.toAssignmentId != null ? Number(item.toAssignmentId) : null,
    toWorkShiftId: item.toWorkShiftId != null ? Number(item.toWorkShiftId) : null,
    requestedByName: item.requestedByName != null ? String(item.requestedByName) : '',
    fromStaffName: item.fromStaffName != null ? String(item.fromStaffName) : '',
    toStaffName: item.toStaffName != null ? String(item.toStaffName) : '',
    fromShiftName: item.fromShiftName != null ? String(item.fromShiftName) : '',
    toShiftName: item.toShiftName != null ? String(item.toShiftName) : '',
    fromWorkDate: item.fromWorkDate != null ? String(item.fromWorkDate) : '',
    toWorkDate: item.toWorkDate != null ? String(item.toWorkDate) : '',
    reason: item.reason != null ? String(item.reason) : '',
    status: String(item.status ?? 'Pending'),
    reviewNote: item.reviewNote != null ? String(item.reviewNote) : '',
    createdAt: item.createdAt != null ? String(item.createdAt) : '',
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

/** @param {Record<string, unknown>} item */
export function normalizeStaffWorkShift(item) {
  return {
    workShiftId: Number(item.workShiftId ?? item.id ?? 0),
    shiftName: String(item.shiftName ?? '—'),
    startTime: item.startTime != null ? String(item.startTime) : '',
    endTime: item.endTime != null ? String(item.endTime) : '',
    isActive: item.isActive !== false,
  }
}

export async function fetchStaffWorkShifts() {
  const data = await apiRequest('/staff/me/work-shifts')
  return asCollection(data).map(normalizeStaffWorkShift)
}

/**
 * Lấy danh sách ca đang được phân cho nhân viên KHÁC (trừ tôi) — dùng cho "đổi ca với staff khác".
 * @param {{ date?: string, workShiftId?: number }} filter
 */
export async function fetchStaffAvailableShiftsForSwap(filter = {}) {
  const params = new URLSearchParams()
  if (filter.date) params.set('date', toStaffShiftQueryDate(filter.date))
  if (filter.workShiftId != null) params.set('workShiftId', String(filter.workShiftId))
  const qs = params.toString()
  const data = await apiRequest(`/staff/me/available-shifts-for-swap${qs ? `?${qs}` : ''}`)
  return asCollection(data).map(normalizeStaffShift)
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
  const body = {
    fromAssignmentId: Number(payload.fromAssignmentId),
    reason: payload.reason?.trim() || null,
  }
  if (payload.toAssignmentId != null && payload.toAssignmentId !== '') {
    body.toAssignmentId = Number(payload.toAssignmentId)
  }
  if (payload.toWorkShiftId != null && payload.toWorkShiftId !== '') {
    body.toWorkShiftId = Number(payload.toWorkShiftId)
    if (payload.toWorkDate) {
      body.toWorkDate = payload.toWorkDate.includes('T')
        ? payload.toWorkDate
        : `${payload.toWorkDate}T00:00:00`
    }
  }
  return apiRequest('/staff/me/shift-swap-requests', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
