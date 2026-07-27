import { aiApiRequest } from './client'

function withPeriod(path, month, year) {
  const params = new URLSearchParams()
  if (Number(month) >= 1 && Number(month) <= 12) params.set('month', String(Number(month)))
  if (Number(year) > 0) params.set('year', String(Number(year)))
  return `${path}${params.size ? `?${params}` : ''}`
}

/** Manager: tạo đề xuất kích cầu đơn theo doanh thu tháng. */
export function checkManagerRevenueStimulus({ month, year } = {}) {
  return aiApiRequest(withPeriod('/manager/check-revenue-stimulus', month, year), {
    method: 'POST',
  })
}

/** Manager: phân tích tổng hợp và tạo hai kịch bản voucher chờ duyệt. */
export function generateComprehensiveRevenueProposals({ month, year } = {}) {
  return aiApiRequest(
    withPeriod('/manager/revenue-stimulus/comprehensive-proposals', month, year),
    { method: 'POST' },
  )
}

export function fetchRevenueStimulusProposals(options = {}) {
  return aiApiRequest('/manager/revenue-stimulus/proposals', options).then((data) =>
    Array.isArray(data) ? data : [],
  )
}

export function modifyRevenueStimulusProposal(voucherId, payload) {
  return aiApiRequest(`/manager/revenue-stimulus/proposals/${Number(voucherId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function approveRevenueStimulusProposal(voucherId) {
  return aiApiRequest(
    `/manager/revenue-stimulus/proposals/${Number(voucherId)}/approve`,
    { method: 'POST' },
  )
}

export function rejectRevenueStimulusProposal(voucherId, rejectReason = '') {
  return aiApiRequest(
    `/manager/revenue-stimulus/proposals/${Number(voucherId)}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ rejectReason: String(rejectReason).trim() || null }),
    },
  )
}

/** Admin: chỉ đọc báo cáo doanh thu của một chi nhánh. */
export function evaluateBranchRevenue(branchId, { month, year } = {}) {
  return aiApiRequest(
    withPeriod(`/admin/revenue-analytics/evaluate-branch/${Number(branchId)}`, month, year),
  )
}

export function triggerBranchRevenueCampaign(branchId, { month, year } = {}) {
  return aiApiRequest(
    withPeriod(`/admin/revenue-analytics/trigger-campaign/${Number(branchId)}`, month, year),
    { method: 'POST' },
  )
}

export function triggerAllRevenueCampaigns({ month, year } = {}) {
  return aiApiRequest(
    withPeriod('/admin/revenue-analytics/trigger-all-campaigns', month, year),
    { method: 'POST' },
  ).then((data) => (Array.isArray(data) ? data : []))
}
