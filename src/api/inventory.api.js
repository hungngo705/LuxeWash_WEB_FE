import { apiRequest } from './client'

function cleanParams(params) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

export function fetchAdminMaterials(includeInactive = false) {
  return apiRequest(`/admin/materials${cleanParams({ includeInactive })}`)
}

export function fetchMaterials(includeInactive = false) {
  return apiRequest(`/materials${cleanParams({ includeInactive })}`)
}

export function fetchMaterialUnits() {
  return apiRequest('/materials/units')
}

export function fetchAdminMaterialUnits(includeInactive = false) {
  return apiRequest(`/admin/material-units${cleanParams({ includeInactive })}`)
}

export function createAdminMaterialUnit(payload) {
  return apiRequest('/admin/material-units', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminMaterialUnit(id, payload) {
  return apiRequest(`/admin/material-units/${Number(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function createAdminMaterial(payload) {
  return apiRequest('/admin/materials', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminMaterial(id, payload) {
  return apiRequest(`/admin/materials/${Number(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function fetchAdminInventoryStocks({ branchId } = {}) {
  return apiRequest(`/admin/inventory/stocks${cleanParams({ branchId })}`)
}

export function fetchAdminInventoryBatches({ branchId, expiringOnly = false } = {}) {
  return apiRequest(`/admin/inventory/batches${cleanParams({ branchId, expiringOnly })}`)
}

export function fetchConditionMultipliers() {
  return apiRequest('/admin/inventory/condition-multipliers')
}

export function updateConditionMultiplier(id, payload) {
  return apiRequest(`/admin/inventory/condition-multipliers/${Number(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function fetchAdminInventoryReport({ from, to, branchId } = {}) {
  return apiRequest(`/admin/inventory/reports/profit${cleanParams({ from, to, branchId })}`)
}

export function fetchBranchInventorySetting(branchId) {
  return apiRequest(`/admin/inventory/branches/${Number(branchId)}/settings`)
}

export function updateBranchInventorySetting(branchId, payload) {
  return apiRequest(`/admin/inventory/branches/${Number(branchId)}/settings`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function fetchServiceMaterials(serviceId) {
  return apiRequest(`/admin/services/${Number(serviceId)}/materials`)
}

export function fetchAllServiceMaterials() {
  return apiRequest('/admin/inventory/service-materials')
}

export function upsertServiceMaterials(serviceId, payload) {
  return apiRequest(`/admin/services/${Number(serviceId)}/materials`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateServiceMaterial(serviceId, usageId, payload) {
  return apiRequest(`/admin/services/${Number(serviceId)}/materials/${Number(usageId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function fetchManagerInventoryStocks() {
  return apiRequest('/manager/inventory/stocks')
}

export function importManagerInventoryBatch(payload) {
  return apiRequest('/manager/inventory/imports', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchManagerInventoryBatches({ materialId, includeDepleted = false } = {}) {
  return apiRequest(`/manager/inventory/batches${cleanParams({ materialId, includeDepleted })}`)
}

export function fetchManagerExpiringBatches() {
  return apiRequest('/manager/inventory/expiring-soon')
}

export function discardManagerInventoryBatch(id, payload) {
  return apiRequest(`/manager/inventory/batches/${Number(id)}/discard`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  })
}

export function adjustManagerInventoryStock(payload) {
  return apiRequest('/manager/inventory/adjustments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchManagerInventoryTransactions({ materialId, from, to, type } = {}) {
  return apiRequest(`/manager/inventory/transactions${cleanParams({ materialId, from, to, type })}`)
}

export function fetchManagerInventoryReport({ from, to } = {}) {
  return apiRequest(`/manager/inventory/reports/profit${cleanParams({ from, to })}`)
}

export function fetchManagerExtraUsageRequests(status) {
  return apiRequest(`/manager/inventory/extra-usage-requests${cleanParams({ status })}`)
}

export function approveManagerExtraUsageRequest(id, payload) {
  return apiRequest(`/manager/inventory/extra-usage-requests/${Number(id)}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  })
}

export function rejectManagerExtraUsageRequest(id, payload) {
  return apiRequest(`/manager/inventory/extra-usage-requests/${Number(id)}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  })
}

export function reportStaffExtraMaterialUsage(bookingId, payload) {
  return apiRequest(`/staff/material-usages/bookings/${Number(bookingId)}/extra`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
