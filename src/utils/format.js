export function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatWashDuration(minutes) {
  const value = Number(minutes)
  if (!Number.isFinite(value) || value <= 0) return 'â€”'

  const rounded = Math.max(1, Math.round(value))
  const hours = Math.floor(rounded / 60)
  const mins = rounded % 60

  if (hours > 0 && mins > 0) return `${hours} tiếng ${mins} phút`
  if (hours > 0) return `${hours} tiếng`
  return `${mins} phút`
}

export function getElapsedWashMinutes(startTime, endTime = null) {
  if (!startTime) return null
  const start = new Date(startTime).getTime()
  const end = endTime ? new Date(endTime).getTime() : Date.now()

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null
  return Math.max(1, Math.round((end - start) / 60000))
}

export function getHomePathForRole(role) {
  if (role === 'Admin') return '/admin/dashboard'
  if (role === 'Staff') return '/dashboard'
  if (role === 'Manager') return '/manager/dashboard'
  if (role === 'Business') return '/business/dashboard'
  return '/login'
}
