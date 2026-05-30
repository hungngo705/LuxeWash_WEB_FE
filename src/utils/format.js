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

export function getHomePathForRole(role) {
  if (role === 'Admin') return '/admin/dashboard'
  if (role === 'Staff') return '/dashboard'
  return '/login'
}
