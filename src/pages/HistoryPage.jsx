import { useCallback, useEffect, useMemo, useState } from 'react'
import HistoryStats from '../components/history/HistoryStats'
import HistoryTable from '../components/history/HistoryTable'
import HistoryToolbar from '../components/history/HistoryToolbar'
import { fetchBookingsByDate, normalizeBookingStatus } from '../api/admin.bookings.api'
import { ApiError } from '../api/client'

function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

function formatCompletedDisplay(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Map raw API BookingResponseDTO to the shape HistoryTable expects.
 */
function mapHistoryRecord(item) {
  return {
    bookingId: Number(item.bookingId ?? item.id ?? 0),
    transactionId: Number(item.transactionId ?? item.bookingId ?? item.id ?? 0),
    licensePlate: String(item.licensePlate ?? '').trim(),
    vehicleDisplay: item.vehicleDisplay ?? '—',
    customerName: item.customerName ?? '—',
    phoneMasked: item.phoneMasked ?? '—',
    rankName: item.rankName ?? '—',
    serviceName: String(item.serviceName ?? '—'),
    completedAt: item.completedAt ?? item.scheduledTime ?? null,
    completedDisplay: formatCompletedDisplay(item.completedAt ?? item.scheduledTime),
    bookingStatus: normalizeBookingStatus(item.status ?? item.bookingStatus),
    totalAmount: Number(item.finalAmount ?? 0),
    pointsUsed: Number(item.pointsUsed ?? 0),
    pointsEarned: Number(item.pointsEarned ?? 0),
    transactionStatus: item.transactionStatus ?? 'Success',
    lane: item.lane ?? '—',
  }
}

export default function HistoryPage() {
  const [allRecords, setAllRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [bookingFilter, setBookingFilter] = useState('all')
  const [txFilter, setTxFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const targetDate = new Date().toISOString()
      const data = await fetchBookingsByDate(targetDate)
      const raw = Array.isArray(data) ? data : []
      const mapped = raw.map(mapHistoryRecord)
      setAllRecords(mapped)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Khong the tai du lieu. Vui long thu lai.'
      setFetchError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const filtered = useMemo(() => {
    return allRecords.filter((r) => {
      const matchBooking = bookingFilter === 'all' || r.bookingStatus === bookingFilter
      const matchTx = txFilter === 'all' || r.transactionStatus === txFilter
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        r.licensePlate.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.serviceName.toLowerCase().includes(q)
      return matchBooking && matchTx && matchSearch
    })
  }, [allRecords, bookingFilter, txFilter, search])

  const stats = useMemo(() => {
    const completed = allRecords.filter((r) => r.bookingStatus === 'Completed').length
    const cancelled = allRecords.filter((r) => r.bookingStatus === 'Cancelled').length
    const revenue = allRecords
      .filter((r) => r.bookingStatus === 'Completed' && r.transactionStatus === 'Success')
      .reduce((sum, r) => sum + (r.totalAmount ?? 0), 0)
    return { total: allRecords.length, completed, cancelled, revenue }
  }, [allRecords])

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
        <h1 className="font-sora text-2xl font-semibold text-on-surface">Lich su dich vu</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Xe da rua — Bookings Completed / Cancelled hom nay
        </p>
      </div>

      {fetchError ? (
        <div className="mb-6 rounded-xl border border-error-container/40 bg-error-container/10 p-4">
          <p className="text-sm text-error">{fetchError}</p>
          <button
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
            onClick={loadRecords}
          >
            Thu lai
          </button>
        </div>
      ) : (
        <>
          <HistoryStats stats={stats} />

          <HistoryToolbar
            bookingFilter={bookingFilter}
            onBookingFilterChange={setBookingFilter}
            txFilter={txFilter}
            onTxFilterChange={setTxFilter}
            search={search}
            onSearchChange={setSearch}
            resultCount={filtered.length}
          />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
                <span className="text-sm text-on-surface-variant">Dang tai du lieu...</span>
              </div>
            </div>
          ) : (
            <HistoryTable records={filtered} />
          )}
        </>
      )}
    </div>
  )
}
