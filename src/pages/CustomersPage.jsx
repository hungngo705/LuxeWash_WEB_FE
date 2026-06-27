import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  fetchUserById,
  fetchUsers,
  mapListUserToCustomerView,
  mapUserDetailToCustomerView,
  normalizeListUser,
} from '../api'
import CustomerDetailPanel from '../components/customers/CustomerDetailPanel'
import CustomerList from '../components/customers/CustomerList'
import CustomerSearchBar from '../components/customers/CustomerSearchBar'

export default function CustomersPage({
  title = 'Tra cứu khách hàng',
  description = 'GET /admin/users — chỉ khách hàng (Customer)',
}) {
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const loadCustomers = useCallback(async (keyword) => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchUsers({
        page: 1,
        pageSize: 50,
        keyword: keyword.trim() || undefined,
        status: 'Active',
      })
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      const mapped = items
        .map(normalizeListUser)
        .filter((u) => (u.role ?? 'Customer') === 'Customer')
        .map(mapListUserToCustomerView)
      setCustomers(mapped)
      if (mapped.length > 0) {
        setSelectedUserId((prev) =>
          prev && mapped.some((c) => c.userId === prev) ? prev : mapped[0].userId,
        )
      } else {
        setSelectedUserId(null)
        setSelectedCustomer(null)
      }
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.isForbidden
            ? 'Không có quyền tra cứu khách hàng.'
            : err.message
          : 'Không tải được danh sách khách hàng.',
      )
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => loadCustomers(search), search ? 350 : 0)
    return () => clearTimeout(timer)
  }, [search, loadCustomers])

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedCustomer(null)
      return
    }
    setDetailLoading(true)
    fetchUserById(selectedUserId)
      .then((detail) => setSelectedCustomer(mapUserDetailToCustomerView(detail)))
      .catch(() => {
        const fallback = customers.find((c) => c.userId === selectedUserId)
        setSelectedCustomer(fallback ?? null)
      })
      .finally(() => setDetailLoading(false))
  }, [selectedUserId, customers])

  const resultCount = useMemo(() => customers.length, [customers])

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="font-sora text-2xl font-semibold text-on-surface">{title}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {description}
        </p>
      </div>

      <CustomerSearchBar search={search} onSearchChange={setSearch} resultCount={resultCount} />

      {loadError && (
        <div className="mb-4 rounded-lg border border-error-container/40 bg-error-container/10 px-4 py-3 text-sm text-error">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          {loading ? (
            <div className="glass-panel rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">
              Đang tải…
            </div>
          ) : (
            <CustomerList
              customers={customers}
              selectedUserId={selectedUserId}
              onSelect={setSelectedUserId}
            />
          )}
        </div>
        <div className="xl:col-span-7">
          {detailLoading ? (
            <div className="glass-panel flex min-h-[320px] items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-sm text-on-surface-variant">
              Đang tải chi tiết…
            </div>
          ) : (
            <CustomerDetailPanel customer={selectedCustomer} />
          )}
        </div>
      </div>
    </div>
  )
}
