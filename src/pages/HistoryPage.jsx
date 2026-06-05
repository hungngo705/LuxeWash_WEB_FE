import { useCallback, useEffect, useMemo, useState } from 'react'
import HistoryStats from '../components/history/HistoryStats'
import HistoryTable from '../components/history/HistoryTable'
import HistoryToolbar from '../components/history/HistoryToolbar'
import {
  fetchBookingsByDate,
  fetchStaffLaneAssignment,
  normalizeAdminBooking,
  toApiTargetDate,
} from '../api'
import { ApiError } from '../api/client'

const HISTORY_STATUSES = new Set(['Completed', 'Cancelled', 'No-show'])

function todayDateValue() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
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

function mapHistoryRecord(normalized) {
  return {
    bookingId: normalized.bookingId,
    transactionId: normalized.bookingId,
    licensePlate: normalized.licensePlate,
    vehicleDisplay: '—',
    customerName: normalized.customerName,
    phoneMasked: '—',
    rankName: normalized.rankName,
    serviceName: normalized.serviceName,
    completedAt: normalized.scheduledDate || null,
    completedDisplay: formatCompletedDisplay(normalized.scheduledDate),
    bookingStatus: normalized.status,
    totalAmount: normalized.finalAmount,
    pointsUsed: 0,
    pointsEarned: 0,
    transactionStatus: 'Success',
    lane: normalized.processingLaneName ?? '—',
  }
}

export default function HistoryPage() {
  const [allRecords, setAllRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [dateFilter, setDateFilter] = useState(todayDateValue)
  const [laneId, setLaneId] = useState(null)
  const [bookingFilter, setBookingFilter] = useState('all')
  const [txFilter, setTxFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchStaffLaneAssignment()
      .then((a) => setLaneId(a.laneId ?? null))
      .catch(() => setLaneId(null))
  }, [])

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const targetDate = toApiTargetDate(dateFilter)
      const data = await fetchBookingsByDate(targetDate)
      const raw = Array.isArray(data) ? data : []
      const mapped = raw
        .map(normalizeAdminBooking)
        .filter((b) => HISTORY_STATUSES.has(b.status))
        .filter((b) => {
          if (!laneId) return true
          if (b.processingLaneId == null) return true
          return Number(b.processingLaneId) === laneId
        })
        .map((b) => mapHistoryRecord(b))
      setAllRecords(mapped)
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.isForbidden
            ? 'Không có quyền xem lịch sử booking. Liên hệ quản trị viên.'
            : err.message
          : 'Không thể tải dữ liệu. Vui lòng thử lại.'
      setFetchError(msg)
    } finally {
      setLoading(false)
    }
  }, [dateFilter, laneId])

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
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-primary-container/50 bg-primary-container/20 px-5 py-3 shadow-xl">
          <span className="text-sm font-medium text-primary-container">{toast.message}</span>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-sora text-2xl font-semibold text-on-surface">Lịch sử dịch vụ</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Booking Completed / Cancelled / No-show theo ngày
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-on-surface-variant">Ngày:</span>
          <input
            type="date"
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </label>
      </div>

      {fetchError ? (
        <div className="mb-6 rounded-xl border border-error-container/40 bg-error-container/10 p-4">
          <p className="text-sm text-error">{fetchError}</p>
          <button
            type="button"
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
            onClick={loadRecords}
          >
            Thử lại
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
                <span className="text-sm text-on-surface-variant">Đang tải dữ liệu…</span>
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
