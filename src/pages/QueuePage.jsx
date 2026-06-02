import { useCallback, useEffect, useMemo, useState } from 'react'
import QueueStats from '../components/queue/QueueStats'
import QueueTable from '../components/queue/QueueTable'
import QueueToolbar from '../components/queue/QueueToolbar'
import { fetchBookingsByDate, normalizeBookingStatus, updateBookingStatus } from '../api/admin.bookings.api'
import { ApiError } from '../api/client'

function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

function formatScheduledDisplay(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return `${time} — Hom nay`
}

/**
 * Map raw API BookingResponseDTO to the shape QueueTable expects.
 */
function mapApiBooking(item) {
  return {
    bookingId: Number(item.bookingId ?? item.id ?? 0),
    licensePlate: String(item.licensePlate ?? '').trim(),
    vehicleType: item.vehicleType ?? '—',
    vehicleDisplay: item.vehicleDisplay ?? item.vehicleName ?? '—',
    serviceId: item.serviceId ?? 0,
    serviceName: String(item.serviceName ?? '—'),
    basePrice: Number(item.originalPrice ?? 0),
    durationMinutes: item.durationMinutes ?? 0,
    scheduledTime: item.scheduledTime ?? item.scheduledDate ?? null,
    scheduledDisplay: formatScheduledDisplay(item.scheduledTime ?? item.scheduledDate),
    status: normalizeBookingStatus(item.status ?? item.bookingStatus),
    rankName: item.rankName ?? item.tierName ?? '—',
    rankId: item.rankId ?? 0,
    customerName: item.customerName ?? '—',
    phoneMasked: item.phoneMasked ?? '—',
    waitMinutes: 0,
    lane: item.lane ?? '—',
    isWalkIn: Boolean(item.isWalkIn),
    finalAmount: Number(item.finalAmount ?? 0),
  }
}

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
      const targetDate = new Date().toISOString()
      const data = await fetchBookingsByDate(targetDate)
      const raw = Array.isArray(data) ? data : []
      const mapped = raw.map(mapApiBooking)
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
      const isActive = b.status === 'Pending' || b.status === 'Checked-in'
      if (!isActive) return false
      const matchStatus = filter === 'all' || b.status === filter
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        b.licensePlate.toLowerCase().includes(q) ||
        b.customerName?.toLowerCase().includes(q) ||
        b.serviceName.toLowerCase().includes(q) ||
        b.phoneMasked?.includes(q)
      return matchStatus && matchSearch
    })
  }, [allBookings, filter, search])

  const stats = useMemo(() => {
    const active = allBookings.filter((b) => b.status === 'Pending' || b.status === 'Checked-in')
    const pending = active.filter((b) => b.status === 'Pending').length
    const checkedIn = active.filter((b) => b.status === 'Checked-in').length
    return { total: active.length, pending, checkedIn }
  }, [allBookings])

  const avgWaitMinutes = useMemo(() => {
    const active = allBookings.filter((b) => b.status === 'Pending' || b.status === 'Checked-in')
    if (active.length === 0) return 0
    const sum = active.reduce((acc, b) => acc + (b.waitMinutes ?? 0), 0)
    return Math.round(sum / active.length)
  }, [allBookings])

  const handleCheckIn = useCallback(async (bookingId) => {
    try {
      await updateBookingStatus(bookingId, 'Checked-in')
      showToast(`Lich hen #${bookingId} da check-in thanh cong.`)
      setAllBookings((prev) =>
        prev.map((b) =>
          Number(b.bookingId) === Number(bookingId) ? { ...b, status: 'Checked-in' } : b,
        ),
      )
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Loi khi check-in. Vui long thu lai.'
      showToast(msg, 'error')
    }
  }, [])

  const handleComplete = useCallback(async (bookingId) => {
    const row = allBookings.find((b) => Number(b.bookingId) === Number(bookingId))
    try {
      await updateBookingStatus(bookingId, 'Completed')
      showToast(`Xe ${row?.licensePlate ?? bookingId} da hoan thanh.`)
      setAllBookings((prev) =>
        prev.filter((b) => Number(b.bookingId) !== Number(bookingId)),
      )
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Loi khi hoan thanh. Vui long thu lai.'
      showToast(msg, 'error')
    }
  }, [allBookings])

  return (
    <div className="relative w-full">
      {/* Toast */}
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
          Danh sach xe cho — Bookings trang thai Pending va Checked-in
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
          <QueueStats stats={stats} avgWaitMinutes={avgWaitMinutes} />

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
              onCheckIn={handleCheckIn}
              onComplete={handleComplete}
            />
          )}
        </>
      )}
    </div>
  )
}
