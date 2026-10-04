import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ApiError,
  fetchBookingsByUserId,
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
  const [detailError, setDetailError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [resultCount, setResultCount] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyHasMore, setHistoryHasMore] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [detailRetry, setDetailRetry] = useState(0)
  const detailVersion = useRef(0)
  const HISTORY_SIZE = 20

  const loadCustomers = useCallback(async (keyword, signal) => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchUsers({
        page,
        pageSize: 50,
        keyword: keyword.trim() || undefined,
        status: 'Active',
        role: 'Customer',
        signal,
      })
      if (signal.aborted) return
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      const mapped = items
        .map(normalizeListUser)
        .filter((u) => (u.role ?? 'Customer') === 'Customer')
        .map(mapListUserToCustomerView)
      setCustomers(mapped)
      setTotalPages(data.totalPages || 1)
      setResultCount(data.totalItems ?? mapped.length)
      if (mapped.length > 0) {
        setSelectedUserId((prev) =>
          prev && mapped.some((c) => c.userId === prev) ? prev : mapped[0].userId,
        )
      } else {
        setSelectedUserId(null)
        setSelectedCustomer(null)
      }
    } catch (err) {
      if (signal.aborted) return
      setLoadError(
        err instanceof ApiError
          ? err.isForbidden
            ? 'Không có quyền tra cứu khách hàng.'
            : err.message
          : 'Không tải được danh sách khách hàng.',
      )
      setCustomers([])
      setSelectedUserId(null)
      setTotalPages(1)
      setResultCount(0)
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [page])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => loadCustomers(search, controller.signal), search ? 350 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [search, loadCustomers])

  useEffect(() => {
    const controller = new AbortController()
    const requestCounter = detailVersion
    const version = ++requestCounter.current
    Promise.resolve().then(async () => {
      if (controller.signal.aborted) return
      setSelectedCustomer(null)
      setDetailError('')
      setHistoryPage(1)
      setHistoryHasMore(false)
      setHistoryLoading(false)
      setDetailLoading(false)
      if (!selectedUserId) return
      setDetailLoading(true)
      return Promise.allSettled([
        fetchUserById(selectedUserId, { signal: controller.signal }),
        fetchBookingsByUserId(selectedUserId, { pageSize: HISTORY_SIZE, signal: controller.signal }),
      ])
      .then(([detailResult, bookingsResult]) => {
        if (controller.signal.aborted || version !== detailVersion.current) return
        if (detailResult.status !== 'fulfilled') {
          setDetailError('Không tải được hồ sơ khách hàng. Vui lòng thử lại.')
          return
        }
        const profile = mapUserDetailToCustomerView(detailResult.value)
        const bookings = bookingsResult.status === 'fulfilled' ? bookingsResult.value : []
        setHistoryHasMore(bookings.length === HISTORY_SIZE)
        setSelectedCustomer({
          ...profile,
          recentBookings: bookings,
          historyError: bookingsResult.status === 'rejected' ? 'Không tải được lịch sử lịch đặt.' : '',
        })
      })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false) })
    })
    return () => { controller.abort(); requestCounter.current++ }
  }, [selectedUserId, detailRetry])

  const loadMoreHistory = async () => {
    if (!selectedCustomer || historyLoading) return
    const version = detailVersion.current
    const nextPage = selectedCustomer.historyError && !selectedCustomer.recentBookings.length ? 1 : historyPage + 1
    setHistoryLoading(true)
    try {
      const bookings = await fetchBookingsByUserId(selectedCustomer.userId, { page: nextPage, pageSize: HISTORY_SIZE })
      if (version !== detailVersion.current) return
      setSelectedCustomer((prev) => ({ ...prev, historyError: '', recentBookings: [...prev.recentBookings, ...bookings].filter((b, i, all) => all.findIndex((x) => x.bookingId === b.bookingId) === i) }))
      setHistoryPage(nextPage)
      setHistoryHasMore(bookings.length === HISTORY_SIZE)
    } catch {
      if (version === detailVersion.current) setSelectedCustomer((prev) => ({ ...prev, historyError: 'Không tải được lịch sử lịch đặt.' }))
    } finally {
      if (version === detailVersion.current) setHistoryLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="font-sora text-2xl font-semibold text-on-surface">{title}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {description}
        </p>
      </div>

      <CustomerSearchBar search={search} onSearchChange={(value) => { setSearch(value); setPage(1) }} resultCount={resultCount} />

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
          {totalPages > 1 && <div className="mt-3 flex items-center justify-between text-sm">
            <button disabled={loading || page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-50">Trước</button>
            <span>Trang {page}/{totalPages}</span>
            <button disabled={loading || page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-50">Sau</button>
          </div>}
        </div>
        <div className="xl:col-span-7">
          {detailLoading ? (
            <div className="glass-panel flex min-h-[320px] items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-sm text-on-surface-variant">
              Đang tải chi tiết…
            </div>
          ) : detailError ? (
            <div role="alert" className="rounded-xl border p-6 text-error">{detailError}<button onClick={() => setDetailRetry((n) => n + 1)} className="ml-3 underline">Thử lại</button></div>
          ) : (
            <CustomerDetailPanel customer={selectedCustomer?.userId === selectedUserId ? selectedCustomer : null} onLoadMore={loadMoreHistory} historyLoading={historyLoading} historyHasMore={historyHasMore} />
          )}
        </div>
      </div>
    </div>
  )
}
