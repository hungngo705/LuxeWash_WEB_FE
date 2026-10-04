import { apiRequest } from './client'

function requireList(data) {
  if (!Array.isArray(data)) throw new Error('Dữ liệu danh mục không đúng định dạng.')
  return data
}

export async function fetchPublicBranches(signal) {
  const data = requireList(await apiRequest('/branches', { auth: false, signal }))
  return data.filter((item) => item.isActive !== false).map((item) => {
    if (!Number.isInteger(item.branchId) || !item.name?.trim()) throw new Error('Thông tin chi nhánh không hợp lệ.')
    return { id: item.branchId, name: item.name.trim(), address: item.address?.trim() || '' }
  })
}

export async function fetchPublicServices(signal) {
  const data = requireList(await apiRequest('/services', { auth: false, signal }))
  return data.filter((item) => item.isActive !== false).map((item) => {
    if (!Number.isInteger(item.serviceId) || !item.serviceName?.trim()) throw new Error('Thông tin dịch vụ không hợp lệ.')
    return {
      id: item.serviceId,
      name: item.serviceName.trim(),
      description: item.description?.trim() || '',
      prices: requireList(item.prices).filter((price) =>
        Number.isInteger(price.branchId) && Number.isInteger(price.vehicleTypeId)
        && typeof price.price === 'number' && Number.isFinite(price.price) && price.price >= 0,
      ),
    }
  })
}

/** Price records must belong to a public, currently active branch. Never invent a price. */
export function getPublicPriceRows(services, branches, branchId = null) {
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]))
  return services.flatMap((service) => service.prices
    .filter((price) => branchNames.has(price.branchId) && (branchId == null || price.branchId === Number(branchId)))
    .map((price) => ({ ...price, serviceId: service.id, serviceName: service.name, branchName: branchNames.get(price.branchId) })),
  )
}
