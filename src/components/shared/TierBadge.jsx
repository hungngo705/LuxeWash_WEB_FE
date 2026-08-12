function getTierMeta(tierName, tierPoints) {
  const name = String(tierName ?? '').trim()
  const key = name.toLowerCase()
  const points = Number(tierPoints)

  if (key.includes('business') || key.includes('doanh nghiệp')) {
    return {
      icon: '🏢',
      label: name || 'Business account',
      className: 'border-primary/40 bg-primary/10 text-primary',
    }
  }

  if (key.includes('diamond') || key.includes('kim cương') || points >= 15000) {
    return {
      icon: '💎',
      label: name || 'Diamond',
      className: 'border-cyan-500/50 bg-cyan-500/15 text-cyan-700',
    }
  }
  if (
    key.includes('gold') ||
    key.includes('vàng') ||
    key.includes('platinum') ||
    key.includes('vip') ||
    points >= 5000
  ) {
    return {
      icon: '👑',
      label: name || 'Gold',
      className: 'border-amber-500/50 bg-amber-500/15 text-amber-700',
    }
  }
  if (key.includes('silver') || key.includes('bạc') || points >= 1000) {
    return {
      icon: '🥈',
      label: name || 'Silver',
      className: 'border-slate-500/50 bg-slate-500/15 text-slate-700',
    }
  }
  if (key.includes('bronze') || key.includes('đồng')) {
    return {
      icon: '🥉',
      label: name || 'Bronze',
      className: 'border-orange-500/50 bg-orange-500/15 text-orange-700',
    }
  }
  return {
    icon: '🚶',
    label: name && name !== '—' ? name : 'WalkIn / Standard',
    className: 'border-outline-variant bg-surface-variant text-on-surface-variant',
  }
}

export default function TierBadge({ tierName, tierPoints, className = '' }) {
  const meta = getTierMeta(tierName, tierPoints)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${meta.className} ${className}`}
      title={Number.isFinite(Number(tierPoints)) ? `Ngưỡng hạng: ${Number(tierPoints).toLocaleString('vi-VN')} điểm` : undefined}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  )
}
