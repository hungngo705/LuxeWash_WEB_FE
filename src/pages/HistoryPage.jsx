import { useCallback, useEffect, useMemo, useState } from 'react'
import HistoryStats from '../components/history/HistoryStats'
import HistoryTable from '../components/history/HistoryTable'
import HistoryToolbar from '../components/history/HistoryToolbar'
import {
  fetchStaffServiceHistory,
  fetchBookingsByDate,
  formatPaymentMethodLabel,
  formatStaffStationLabel,
  toApiTargetDate,
  asBookingList,
  normalizeStaffTask,
  enrichStaffTasks,
} from '../api'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'

const PERIOD_OPTIONS = [
  { id: 'day', label: 'Ngày' },
  { id: 'week', label: 'Tuần' },
  { id: 'month', label: 'Tháng' },
]

const STAFF_HISTORY_STATUSES = new Set(['Completed', 'Cancelled', 'No-show'])

function todayDateValue() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * Tính date range từ period + ngày reference.
 * @param {'day'|'week'|'month'} period
 * @param {string} dayValue  YYYY-MM-DD
 * @returns {{ from: string, to: string }}
 */
function computeDateRange(period, dayValue) {
  const d = new Date(dayValue + 'T00:00:00')
  switch (period) {
    case 'day':
      return { from: dayValue, to: dayValue }
    case 'week': {
      const dayOfWeek = d.getDay() // 0=CN, 1=Mon
      const monday = new Date(d)
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const pad2 = (n) => String(n).padStart(2, '0')
      return {
        from: `${monday.getFullYear()}-${pad2(monday.getMonth() + 1)}-${pad2(monday.getDate())}`,
        to: `${sunday.getFullYear()}-${pad2(sunday.getMonth() + 1)}-${pad2(sunday.getDate())}`,
      }
    }
    case 'month': {
      const first = new Date(d.getFullYear(), d.getMonth(), 1)
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const pad2 = (n) => String(n).padStart(2, '0')
      return {
        from: `${first.getFullYear()}-${pad2(first.getMonth() + 1)}-${pad2(first.getDate())}`,
        to: `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-${pad2(last.getDate())}`,
      }
    }
    default:
      return { from: dayValue, to: dayValue }
  }
}

/**
 * Lấy danh sách tất cả ngày trong range [from, to].
 * @param {string} from  YYYY-MM-DD
 * @param {string} to    YYYY-MM-DD
 * @returns {string[]}   Mảng YYYY-MM-DD
 */
function getDatesInRange(from, to) {
  const dates = []
  const cur = new Date(from + 'T00:00:00')
  const end = new Date(to + 'T00:00:00')
  while (cur <= end) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function formatCompletedDisplay(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** @param {import('../api/operationStaff.api').StaffTask} task */
function mapHistoryRecord(task) {
  const txOk =
    task.paymentStatus === 'Success' ||
    task.paymentStatus === 'Completed' ||
    task.status === 'Completed'

  return {
    bookingId: task.bookingId,
    transactionId: task.bookingId,
    licensePlate: task.licensePlate,
    vehicleDisplay: task.vehicleDisplayName !== '—' ? task.vehicleDisplayName : task.vehicleType,
    customerName: task.customerName,
    phoneMasked: task.phoneMasked,
    rankName: task.rankName,
    serviceName: task.serviceName,
    completedAt: task.completedTime ?? task.scheduledTime,
    completedDisplay: formatCompletedDisplay(task.completedTime ?? task.scheduledTime),
    bookingStatus: task.status,
    totalAmount: task.finalAmount,
    pointsUsed: task.discountAmount ?? 0,
    pointsEarned: 0,
    transactionStatus: txOk ? 'Success' : task.paymentStatus !== '—' ? task.paymentStatus : '—',
    paymentMethod: formatPaymentMethodLabel(task.paymentMethod),
    lane: task.processingLaneName ?? '—',
    checkInImageUrl: task.checkInImageUrl ?? null,
    checkOutImageUrl: task.checkOutImageUrl ?? null,
  }
}

function HistoryImagesModal({ record, onClose }) {
  if (!record) return null

  const images = [
    { label: 'Ảnh check-in', icon: 'login', url: record.checkInImageUrl },
    { label: 'Ảnh check-out', icon: 'logout', url: record.checkOutImageUrl },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Đóng thư viện ảnh"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-images-title"
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-outline-variant px-5 py-4">
          <div>
            <h2 id="history-images-title" className="font-sora text-lg font-semibold text-on-surface">
              Ảnh check-in/check-out · #{record.bookingId}
            </h2>
            <p className="mt-0.5 text-sm text-on-surface-variant">
              {record.licensePlate} · {record.customerName}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface"
            aria-label="Đóng"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="grid min-h-0 gap-4 overflow-y-auto p-5 md:grid-cols-2">
          {images.map((image) => (
            <article key={image.label} className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low">
              <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <span className="material-symbols-outlined text-[19px] text-primary">{image.icon}</span>
                  {image.label}
                </h3>
                {image.url && (
                  <a
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Mở ảnh gốc
                    <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                  </a>
                )}
              </div>
              {image.url ? (
                <a href={image.url} target="_blank" rel="noreferrer" className="block bg-black">
                  <img
                    src={image.url}
                    alt={`${image.label} của xe ${record.licensePlate}`}
                    className="aspect-video h-auto w-full object-contain"
                  />
                </a>
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center gap-2 p-6 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl text-outline">no_photography</span>
                  <p className="text-sm font-medium">Không có ảnh được lưu</p>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default function HistoryPage() {
  const { laneAssignment } = useAuth()
  const [allRecords, setAllRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [periodFilter, setPeriodFilter] = useState('day') // 'day' | 'week' | 'month'
  const [dateFilter, setDateFilter] = useState(todayDateValue)
  const [laneLabel, setLaneLabel] = useState('')
  const [bookingFilter, setBookingFilter] = useState('all')
  const [txFilter, setTxFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedImageRecord, setSelectedImageRecord] = useState(null)

  // Update lane label whenever laneAssignment changes (from AuthContext)
  useEffect(() => {
    setLaneLabel(laneAssignment ? formatStaffStationLabel(laneAssignment) : '')
  }, [laneAssignment])

  // refetch chỉ load dữ liệu chính (history); laneAssignment đọc từ context
  const refetch = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const { from, to } = computeDateRange(periodFilter, dateFilter)
      const dates = getDatesInRange(from, to)

      if (dates.length === 1) {
        // Single day — use existing optimized path
        const tasks = await fetchStaffServiceHistory(toApiTargetDate(dates[0]), {
          signal: null,
        })
        setAllRecords(tasks.map(mapHistoryRecord))
      } else {
        // Multi-day — batch fetch per day, deduplicate by bookingId, then enrich
        const allBookings = []
        for (const date of dates) {
          try {
            const apiDate = toApiTargetDate(date)
            const data = await fetchBookingsByDate(apiDate, {})
            const list = asBookingList(data)
            allBookings.push(...list)
          } catch {
            // skip failed days silently
          }
        }
        // Deduplicate by bookingId
        const seen = new Set()
        const unique = allBookings.filter((b) => {
          const id = b.bookingId ?? b.id
          if (seen.has(id)) return false
          seen.add(id)
          return true
        })
        const filtered = unique
          .map((item) => normalizeStaffTask(item))
          .filter((b) => STAFF_HISTORY_STATUSES.has(b.status))
        const tasks = await enrichStaffTasks(filtered, { bookingsByDate: unique })
        setAllRecords(tasks.map(mapHistoryRecord))
      }
    } catch (err) {
      setFetchError(
        err instanceof ApiError && err.isForbidden
          ? 'Không có quyền xem lịch sử booking. Liên hệ quản trị viên.'
          : 'Không thể tải dữ liệu. Vui lòng thử lại.',
      )
    } finally {
      setLoading(false)
    }
  }, [dateFilter, periodFilter])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void refetch()
    }, 0)
    return () => window.clearTimeout(loadTimer)
  }, [refetch, periodFilter])

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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-sora text-2xl font-semibold text-on-surface">Lịch sử dịch vụ</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {laneLabel ? `${laneLabel} — ` : ''}
            Hoàn thành / Đã hủy / Vắng mặt theo ngày
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {/* Segment control: Ngày / Tuần / Tháng */}
          <div className="flex rounded-xl border border-outline-variant bg-surface-container-lowest p-1">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodFilter(p.id)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  periodFilter === p.id
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-variant'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Date picker — chỉ hiện khi chọn Ngày */}
          {periodFilter === 'day' && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-on-surface-variant">Ngày:</span>
              <input
                type="date"
                className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </label>
          )}
        </div>
      </div>

      {fetchError ? (
        <div className="mb-6 rounded-xl border border-error-container/40 bg-error-container/10 p-4">
          <p className="text-sm text-error">{fetchError}</p>
          <button
            type="button"
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
            onClick={refetch}
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
            <HistoryTable
              records={filtered}
              onViewImages={setSelectedImageRecord}
            />
          )}
        </>
      )}

      <HistoryImagesModal
        record={selectedImageRecord}
        onClose={() => setSelectedImageRecord(null)}
      />
    </div>
  )
}
