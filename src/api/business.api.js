import { apiRequest, API_BASE_URL } from './client'

// === Profile ===

export const fetchBusinessProfile = () => apiRequest('/business/my-profile')

export const updateBusinessProfile = (payload) =>
  apiRequest('/business/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

// === Dashboard ===

export const fetchBusinessDashboard = () => apiRequest('/business/dashboard')

export const fetchFleetDashboard = () => apiRequest('/fleet/dashboard')

// === Fleet Vehicles ===

export const fetchFleetVehicles = () => apiRequest('/business/fleet/vehicles')

export const fetchFleetVehicleDetail = (id) =>
  apiRequest(`/business/fleet/vehicles/${id}`)

export const fetchPendingVehicles = () => apiRequest('/fleet/pending')

export const approveVehicle = (id) =>
  apiRequest(`/fleet/staff/approve/${id}`, { method: 'POST' })

export const rejectVehicle = (id, reason) =>
  apiRequest(`/fleet/staff/reject/${id}`, {
    method: 'POST',
    body: JSON.stringify({ rejectionReason: reason }),
  })

export const fetchFleetTemplate = () =>
  apiRequest('/fleet/template', { auth: true })

export const importFleet = (formData) =>
  apiRequest('/fleet/import', {
    method: 'POST',
    body: formData,
  })

export const fetchImportHistory = () => apiRequest('/fleet/fleet/imports')

export const fetchImportBatchDetail = (batchId) =>
  apiRequest(`/fleet/fleet/imports/${batchId}`)

// === Bookings ===

export const fetchBusinessBookings = () => apiRequest('/business/bookings')

export const fetchBookingDetail = (id) => apiRequest(`/business/bookings/${id}`)

export const createBusinessBooking = (dto) =>
  apiRequest('/business/bookings', {
    method: 'POST',
    body: JSON.stringify(dto),
  })

export const cancelBooking = (id) =>
  apiRequest(`/business/bookings/${id}/cancel`, { method: 'POST' })

export const getAvailableSlots = (branchId, date) =>
  apiRequest('/bookings/available-slots', {
    method: 'POST',
    body: JSON.stringify({ branchId, date }),
  })

export const checkSlotCompatibility = (dto) =>
  apiRequest('/bookings/check-compatibility', {
    method: 'POST',
    body: JSON.stringify(dto),
  })

// === Walk-in / Fleet Queue ===

export const createWalkIn = (dto) =>
  apiRequest('/fleet/walk-in', {
    method: 'POST',
    body: JSON.stringify(dto),
  })

export const fetchFleetQueue = (branchId) =>
  apiRequest(`/fleet/queue${branchId ? `?branchId=${branchId}` : ''}`)

export const fetchCurrentVehicles = (branchId) =>
  apiRequest(`/fleet/current${branchId ? `?branchId=${branchId}` : ''}`)

// === History ===

export const fetchBusinessHistory = (filter = {}) => {
  const params = new URLSearchParams({
    page: filter.page || 1,
    pageSize: filter.pageSize || 20,
    ...(filter.fleetVehicleId && { fleetVehicleId: filter.fleetVehicleId }),
    ...(filter.fromDate && { fromDate: filter.fromDate }),
    ...(filter.toDate && { toDate: filter.toDate }),
    ...(filter.status && { status: filter.status }),
    ...(filter.branchId && { branchId: filter.branchId }),
  })
  return apiRequest(`/business/history?${params}`)
}

// === Invoices ===

export const fetchBusinessInvoices = (filter = {}) => {
  const params = new URLSearchParams({
    ...(filter.page && { page: filter.page }),
    ...(filter.pageSize && { pageSize: filter.pageSize }),
    ...(filter.status && { status: filter.status }),
  })
  return apiRequest(`/invoice/invoices?${params}`)
}

export const fetchInvoiceDetail = (id) => apiRequest(`/invoice/invoices/${id}`)

export const exportInvoice = (id) => apiRequest(`/business/invoices/${id}/export`)

export const downloadInvoicePdf = (id) => {
  window.open(`${API_BASE_URL}/invoice/invoices/${id}/pdf`, '_blank')
}

// === Statements ===

export const fetchMonthlyStatement = (year, month) =>
  apiRequest(`/business/statements/monthly?year=${year}&month=${month}`)

// === Business Registration ===

export const registerBusinessProfile = (formData) =>
  apiRequest('/business/register', {
    method: 'POST',
    body: formData,
  })

// === Business Applications (Staff/Manager) ===

export const fetchPendingApplications = () =>
  apiRequest('/business/staff/pending-applications')

export const fetchApplicationDetail = (id) =>
  apiRequest(`/business/staff/application/${id}`)

export const reviewApplication = (dto) =>
  apiRequest('/business/staff/review-application', {
    method: 'POST',
    body: JSON.stringify(dto),
  })
