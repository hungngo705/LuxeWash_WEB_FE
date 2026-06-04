import { useCallback, useEffect, useMemo, useState } from 'react'
import QueueStats from '../components/queue/QueueStats'
import QueueTable from '../components/queue/QueueTable'
import QueueToolbar from '../components/queue/QueueToolbar'
import {
  fetchStaffTasks,
  updateStaffBookingStatus,
  normalizeStaffTask,
} from '../api'
import { ApiError } from '../api/client'

export default function QueuePage() {
  const [allBookings, setAllBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadBookings = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const data = await fetchStaffTasks()
      const raw = Array.isArray(data) ? data : []
      const mapped = raw.map(normalizeStaffTask)
      setAllBookings(mapped)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Khong the tai du lieu. Vui long thu lai.'
      setFetchError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  const displayedBookings = useMemo(() => {
    return allBookings.filter((b) => {
      const isActive = b.status === 'Pending' || b.status === 'Checked-in' || b.status === 'Processing'
      if (!isActive) return false
      const matchStatus = filter === 'all' || b.status === filter
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        b.licensePlate.toLowerCase().includes(q) ||
        b.customerName?.toLowerCase().includes(q) ||
        b.serviceName.toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [allBookings, filter, search])

  const stats = useMemo(() => {
    const pending = allBookings.filter((b) => b.status === 'Pending').length
    const checkedIn = allBookings.filter((b) => b.status === 'Checked-in').length
    const processing = allBookings.filter((b) => b.status === 'Processing').length
    return {
      total: pending + checkedIn + processing,
      pending,
      checkedIn,
      processing,
    }
  }, [allBookings])

  const handleStartProcessing = useCallback(async (bookingId) => {
    try {
      await updateStaffBookingStatus(bookingId, 'Processing')
      showToast(`Xe #${bookingId} bat dau rua.`)
      setAllBookings((prev) =>
        prev.map((b) =>
          Number(b.bookingId) === Number(bookingId) ? { ...b, status: 'Processing' } : b,
        ),
      )
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Loi khi bat dau rua. Vui long thu lai.'
      showToast(msg, 'error')
    }
  }, [])

  const handleComplete = useCallback(async (bookingId) => {
    try {
      await updateStaffBookingStatus(bookingId, 'Completed')
      showToast(`Xe #${bookingId} da hoan thanh.`)
      setAllBookings((prev) =>
        prev.filter((b) => Number(b.bookingId) !== Number(bookingId)),
      )
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Loi khi hoan thanh. Vui long thu lai.'
      showToast(msg, 'error')
    }
  }, [])

  return (
    <div className="relative w-full">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-3 shadow-xl ${
            toast.type === 'error'
              ? 'border-error-container/50 bg-error-container/20 text-error'
              : 'border-primary-container/50 bg-primary-container/20 text-primary-container'
          }`}
        >
          <span className="material-symbols-outlined text-xl">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="mb-6">
        <h1 className="font-sora text-2xl font-semibold text-on-surface">Quan ly hang doi</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Danh sach xe tai lan cua ban — Bookings Checked-in va Processing
        </p>
      </div>

      {fetchError ? (
        <div className="mb-6 rounded-xl border border-error-container/40 bg-error-container/10 p-4">
          <p className="text-sm text-error">{fetchError}</p>
          <button
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
            onClick={loadBookings}
          >
            Thu lai
          </button>
        </div>
      ) : (
        <>
          <QueueStats stats={stats} avgWaitMinutes={0} />

          <QueueToolbar
            filter={filter}
            onFilterChange={setFilter}
            search={search}
            onSearchChange={setSearch}
            resultCount={displayedBookings.length}
          />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
                <span className="text-sm text-on-surface-variant">Dang tai du lieu...</span>
              </div>
            </div>
          ) : (
            <QueueTable
              bookings={displayedBookings}
              onStartProcessing={handleStartProcessing}
              onComplete={handleComplete}
            />
          )}
        </>
      )}
    </div>
  )
}
