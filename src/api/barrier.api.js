import { apiRequest } from './client'

export function createBarrierCommand(barrierId, action = 'OPEN') {
  return apiRequest('/barrier/commands', {
    method: 'POST',
    body: JSON.stringify({
      barrierId: String(barrierId ?? '').trim(),
      action: String(action ?? 'OPEN').trim().toUpperCase(),
    }),
  })
}

export function fetchBarrierCommand(commandId) {
  return apiRequest(`/barrier/commands/${encodeURIComponent(commandId)}`)
}

export function fetchBarrierDeviceStatus() {
  return apiRequest('/barrier/device/status')
}
