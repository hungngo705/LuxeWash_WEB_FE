import { apiRequest } from './client'

export function ackBarrierCommand(commandId, status = 'Completed', details = '') {
  const normalizedId = String(commandId ?? '').trim()
  if (!normalizedId) return Promise.resolve(null)

  return apiRequest('/barrier/ack', {
    method: 'POST',
    body: JSON.stringify({
      commandId: normalizedId,
      status,
      details: String(details ?? '').trim() || undefined,
    }),
  })
}
