import { useCallback, useEffect, useMemo, useState } from 'react'
import QueueStats from '../components/queue/QueueStats'
import QueueTable from '../components/queue/QueueTable'
import QueueToolbar from '../components/queue/QueueToolbar'
import {
  enrichStaffTasks,
  fetchStaffLaneAssignment,
  fetchStaffTasks,
  formatStaffStationLabel,
  updateStaffBookingStatus,
} from '../api'
import { ApiError } from '../api/client'

export default function QueuePage() {
  const [allBookings, setAllBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [laneLabel, setLaneLabel] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    fetchStaffLaneAssignment()
      .then((a) => setLaneLabel(formatStaffStationLabel(a)))
      .catch(() => setLaneLabel('Chưa phân công làn'))
  }, [])

  const loadBookings = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const data = await fetchStaffTasks()
      const enriched = await enrichStaffTasks(data)
      setAllBookings(enriched)
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.isForbidden
            ? 'Không có quyền xem hàng đợi. Liên hệ quản trị viên.'
            : err.message
          : 'Không thể tải dữ liệu. Vui lòng thử lại.'
      setFetchError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBookings()
    const interval = setInterval(loadBookings, 30_000)
    return () => clearInterval(interval)
  }, [loadBookings])

  const displayedBookings = useMemo(() => {
    return allBookings.filter((b) => {
      const isActive = b.status === 'Checked-in' || b.status === 'Processing'
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
    const checkedIn = allBookings.filter((b) => b.status === 'Checked-in').length
    const processing = allBookings.filter((b) => b.status === 'Processing').length
    return {
      total: checkedIn + processing,
      pending: 0,
      checkedIn,
      processing,
    }
  }, [allBookings])

  const handleStartProcessing = useCallback(async (bookingId) => {
    try {
      await updateStaffBookingStatus(bookingId, 'Processing')
      showToast(`Xe #${bookingId} bắt đầu rửa.`)
      setAllBookings((prev) =>
        prev.map((b) =>
          Number(b.bookingId) === Number(bookingId) ? { ...b, status: 'Processing' } : b,
        ),
      )
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Lỗi khi bắt đầu rửa. Vui lòng thử lại.'
      showToast(msg, 'error')
    }
  }, [])

  const handleComplete = useCallback(async (bookingId) => {
    try {
      await updateStaffBookingStatus(bookingId, 'Completed')
      showToast(`Xe #${bookingId} đã hoàn thành.`)
      setAllBookings((prev) => prev.filter((b) => Number(b.bookingId) !== Number(bookingId)))
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Lỗi khi hoàn thành. Vui lòng thử lại.'
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
        <h1 className="font-sora text-2xl font-semibold text-on-surface">Quản lý hàng đợi</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {laneLabel || 'Đang tải làn…'} — Danh sách xe Checked-in và Processing tại làn của bạn
        </p>
      </div>

      {fetchError ? (
        <div className="mb-6 rounded-xl border border-error-container/40 bg-error-container/10 p-4">
          <p className="text-sm text-error">{fetchError}</p>
          <button
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
            onClick={loadBookings}
          >
            Thử lại
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
                <span className="text-sm text-on-surface-variant">Đang tải dữ liệu…</span>
              </div>
            </div>
          ) : displayedBookings.length === 0 && !search && filter === 'all' ? (
            <div className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-12 text-center">
              <span className="material-symbols-outlined mb-3 text-5xl text-outline">directions_car</span>
              <p className="font-sora text-lg font-semibold text-on-surface">Không có xe trong hàng đợi</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Vào tab Check-in để check-in xe hoặc chờ xe được check-in.
              </p>
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
