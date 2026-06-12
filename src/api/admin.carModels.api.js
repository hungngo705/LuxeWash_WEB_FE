import { apiRequest } from './client'

/**
 * BE chỉ lưu brand + name (Swagger Create/UpdateCarModelDTO).
 * Năm SX và phiên bản được gắn vào name dạng "RX350 (2024 XLE)" để persist qua API.
 */
const NAME_WITH_YEAR_VERSION = /^(.+?)\s*\((\d{4})(?:\s+([^)]+))?\)\s*$/

/** @param {string | null | undefined} raw */
export function parseCarModelName(raw) {
  const full = raw != null ? String(raw).trim() : ''
  if (!full) {
    return { name: '', productionYear: null, version: '' }
  }

  const match = full.match(NAME_WITH_YEAR_VERSION)
  if (!match) {
    return { name: full, productionYear: null, version: '' }
  }

  return {
    name: match[1].trim(),
    productionYear: Number(match[2]),
    version: match[3]?.trim() ?? '',
  }
}

/** @param {string | null | undefined} name @param {number | string | null | undefined} productionYear @param {string | null | undefined} version */
export function formatCarModelName(name, productionYear, version) {
  const base = name?.trim() || ''
  if (!base) return null

  const year =
    productionYear != null && productionYear !== '' && !Number.isNaN(Number(productionYear))
      ? Number(productionYear)
      : null
  const trimmedVersion = version?.trim() || ''

  if (year != null) {
    return trimmedVersion ? `${base} (${year} ${trimmedVersion})` : `${base} (${year})`
  }
  if (trimmedVersion) {
    return `${base} (${trimmedVersion})`
  }
  return base
}

/**
 * @typedef {{
 *   id: number
 *   brand?: string
 *   name?: string
 *   productionYear?: number | null
 *   version?: string
 *   isActive?: boolean
 * }} CarModel
 *
 * @typedef {{ brand?: string; name?: string; productionYear?: number | null; version?: string | null }} CreateCarModelPayload
 * @typedef {{ brand?: string; name?: string; productionYear?: number | null; version?: string | null; isActive?: boolean }} UpdateCarModelPayload
 */

/** @param {Record<string, unknown>} item */
export function normalizeCarModel(item) {
  const parsed = parseCarModelName(item.name != null ? String(item.name) : '')

  return {
    id: Number(item.carModelId ?? item.id),
    brand: item.brand != null ? String(item.brand) : '',
    name: parsed.name,
    productionYear:
      item.productionYear != null
        ? Number(item.productionYear)
        : item.modelYear != null
          ? Number(item.modelYear)
          : parsed.productionYear,
    version:
      item.version != null && String(item.version).trim()
        ? String(item.version)
        : parsed.version,
    isActive: item.isActive !== false,
    isPendingApproval: item.isPendingApproval === true || item.status === 'PendingApproval',
  }
}

function buildCarModelPayload(payload) {
  const body = {
    brand: payload.brand?.trim() || null,
    name: formatCarModelName(payload.name, payload.productionYear, payload.version),
  }
  if (payload.isActive != null) {
    body.isActive = Boolean(payload.isActive)
  }
  return body
}

/** @returns {Promise<CarModel[]>} */
export async function fetchCarModels() {
  const data = await apiRequest('/CarModels')
  const list = Array.isArray(data) ? data : []
  return list.map(normalizeCarModel)
}

/** @param {CreateCarModelPayload} payload */
export function createCarModel(payload) {
  return apiRequest('/CarModels', {
    method: 'POST',
    body: JSON.stringify(buildCarModelPayload(payload)),
  })
}

/** @param {number} id @param {UpdateCarModelPayload} payload */
export function updateCarModel(id, payload) {
  return apiRequest(`/CarModels/${id}`, {
    method: 'PUT',
    body: JSON.stringify(buildCarModelPayload(payload)),
  })
}

/** @param {number} id */
export function deleteCarModel(id) {
  return apiRequest(`/CarModels/${id}`, {
    method: 'DELETE',
  })
}
