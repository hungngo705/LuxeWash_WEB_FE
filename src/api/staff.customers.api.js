import { fetchUserById, fetchUsers } from './admin.users.api'

const DEFAULT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuClp7ADyI2iBVUMA7EIoPJsEAYC2R4QW-wLfbu4V-aXdn2Mz-TQbaCcFYwtlZAX9KsIFU7XGtg5P5AR6HmgOL12_CBKkQdCh9I-BO7ZutWni9cVeBvi07Qicp7uFO9EVhZ3lpQueRoPAmxh8p_bGfItEe3Q60cAdRRZDEUlgQ93Hj6MZEy9-MlXay4Ab63PaE6vJ6tQIlxr64EslF4K7_d4wmwqOG_XztDYgbI4RSQGLu2p4iTRecovl8-Wcs-iPQ7biJH3ov3inmPr'

/** @param {string | undefined} plate */
export function normalizePlateKey(plate) {
  return String(plate ?? '')
    .toUpperCase()
    .replace(/[\s.\-]/g, '')
}

const userByPlateCache = new Map()

/**
 * Resolve customer + vehicle by license plate via GET /admin/users + GET /admin/users/{id}.
 * Staff booking APIs (by-license-plate, tasks) do not include customer fields on BE today.
 * @param {string} licensePlate
 * @returns {Promise<{ customer: ReturnType<typeof mapUserDetailToCustomerView>, vehicle: Record<string, unknown> } | null>}
 */
export async function findUserByLicensePlate(licensePlate, options = {}) {
  const key = normalizePlateKey(licensePlate)
  if (!key) return null
  if (userByPlateCache.has(key)) return userByPlateCache.get(key)

  const pageSize = 25
  let page = 1

  while (page <= 8) {
    let data
    try {
      data = await fetchUsers({ page, pageSize, status: 'Active' }, options)
    } catch {
      break
    }

    const items = data?.items ?? []
    if (!items.length) break

    for (const item of items) {
      try {
        const detail = await fetchUserById(item.userId, options)
        const vehicles = Array.isArray(detail.vehicles) ? detail.vehicles : []
        const vehicle = vehicles.find((v) => normalizePlateKey(v.licensePlate) === key)
        if (vehicle) {
          const result = {
            customer: mapUserDetailToCustomerView(detail),
            vehicle,
          }
          userByPlateCache.set(key, result)
          return result
        }
      } catch {
        // skip user
      }
    }

    if (page >= (data.totalPages ?? 1)) break
    page += 1
  }

  userByPlateCache.set(key, null)
  return null
}

/** @param {string | undefined} phone */
export function maskPhoneNumber(phone) {
  const p = String(phone ?? '').trim()
  if (p.length < 7) return p || '—'
  return `${p.slice(0, 3)}****${p.slice(-3)}`
}

function formatLastVisit(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('vi-VN')
}

/** @param {Record<string, unknown>} detail */
export function mapUserDetailToCustomerView(detail) {
  const vehicles = Array.isArray(detail.vehicles) ? detail.vehicles : []
  const totalPoint = Number(detail.totalPoint ?? detail.promotionPoint ?? 0)

  return {
    userId: Number(detail.userId),
    profileId: Number(detail.profileId ?? detail.userId),
    fullName: String(detail.fullName ?? '—'),
    phoneNumber: String(detail.phoneNumber ?? '—'),
    phoneMasked: maskPhoneNumber(detail.phoneNumber),
    email: String(detail.email ?? '—'),
    address: String(detail.address ?? '—'),
    rankId: Number(detail.rankId ?? 0),
    rankName: String(detail.tierName ?? detail.rankName ?? '—').toUpperCase(),
    pointMultiplier: Number(detail.pointMultiplier ?? 1),
    userScore: totalPoint,
    walletBalance: Number(detail.walletBalance ?? 0),
    userStatus:
      detail.status === 'Blocked' || detail.userStatus === 'Blocked' ? 'Banned' : 'Active',
    lastVisitDisplay: formatLastVisit(detail.lastVisitDate),
    totalWashes: Number(detail.totalWashes ?? 0),
    avatar: DEFAULT_AVATAR,
    vehicles: vehicles.map((v) => ({
      licensePlate: String(v.licensePlate ?? ''),
      vehicleType: String(v.vehicleType ?? v.vehicleTypeName ?? '—'),
      displayName: String(v.displayName ?? v.vehicleDisplayName ?? v.licensePlate ?? '—'),
    })),
  }
}

/** @param {Record<string, unknown>} item */
export function mapListUserToCustomerView(item) {
  return {
    userId: Number(item.userId),
    profileId: Number(item.profileId ?? item.userId),
    fullName: String(item.fullName ?? '—'),
    phoneNumber: String(item.phoneNumber ?? '—'),
    phoneMasked: maskPhoneNumber(item.phoneNumber),
    email: '—',
    address: '—',
    rankId: 0,
    rankName: String(item.tierName ?? item.rankName ?? '—').toUpperCase(),
    pointMultiplier: 1,
    userScore: 0,
    walletBalance: 0,
    userStatus: item.status === 'Blocked' ? 'Banned' : 'Active',
    lastVisitDisplay: formatLastVisit(item.lastVisitDate),
    totalWashes: 0,
    avatar: DEFAULT_AVATAR,
    vehicles: [],
  }
}
