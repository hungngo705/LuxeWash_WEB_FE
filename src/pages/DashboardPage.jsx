import { useCallback, useEffect, useState } from 'react'
import {
  fetchBookingsByDate,
  fetchBookingsByLicensePlate,
  normalizeBookingStatus,
  toApiBookingStatus,
  updateBookingStatusByLicensePlate,
} from '../api/admin.bookings.api'
import { ApiError } from '../api/client'

const CAMERA_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAFjN7-XxYHxosgsGY869CNoxfjrLh7Qt9VHdFFiW_AItYeZCpo7VbzGlAdWlfEvBg8BVeFEMV8DeNY_FYTGWe8JMGvJzF_OU4YNF1u-CJ-8g5vsAZM34a3Rcc_G_Y1_O4pp-DNmsgaIxEn-D1b_WiTS63Z1_QndSwW2KBHUL9KLOJb4ahrLqzxYEXq7gQO-4sT5EeGuv_YhwYbKTqk4vgLNvf82-E2WDsB4ND8H3Hi1O8uMSeJb6V1RatWd6ZYssjmj6KjnokaBqdu'

function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

function formatDateTime(isoString) {
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

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const isError = type === 'error'
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-3 shadow-xl transition-all duration-300 ${
        isError
          ? 'border-error-container/50 bg-error-container/20 text-error'
          : 'border-primary-container/50 bg-primary-container/20 text-primary-container'
      }`}
    >
      <span className="material-symbols-outlined text-xl">
        {isError ? 'error' : 'check_circle'}
      </span>
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

function LoadingSpinner({ label = 'Dang xu ly...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
      <span className="text-sm text-on-surface-variant">{label}</span>
    </div>
  )
}

// ---------- Plate Lookup Panel (Left column) ----------
function PlateLookupPanel({ plateInput, onPlateChange, onSearch, loading, processingCount }) {
  return (
    <section className="glass-panel soft-shadow flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">search</span>
          <h3 className="font-sora text-xl font-semibold text-on-surface">Tra cuu bien so</h3>
        </div>
        <span className="rounded bg-surface-variant px-2 py-1 text-xs font-semibold text-on-surface-variant">
          {processingCount} xe
        </span>
      </div>

      <div className="flex-1 space-y-4 p-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
            Nhap bien so xe
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 h-12 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-base font-medium tracking-wider text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none uppercase"
              placeholder="VD: 51F-123.45"
              value={plateInput}
              onChange={(e) => onPlateChange(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
            <button
              className="shrink-0 h-12 rounded-xl bg-primary px-5 text-sm font-semibold tracking-wide text-on-primary uppercase shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
              onClick={onSearch}
              disabled={loading || !plateInput.trim()}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border border-on-primary/30 border-t-on-primary" />
                </span>
              ) : (
                'Tra cuu'
              )}
            </button>
          </div>
        </div>

        {/* Camera placeholder */}
        <div className="relative overflow-hidden rounded-xl bg-black" style={{ minHeight: '180px' }}>
          <img
            alt="Camera AI chua san sang"
            className="h-full w-full object-cover opacity-50"
            src={CAMERA_IMAGE}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-4xl text-primary-container opacity-70">
              videocam_off
            </span>
            <span className="text-xs text-primary-container opacity-70">
              Camera AI chua duoc trien khai
            </span>
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-error/20 px-2 py-1 text-[10px] font-semibold text-error">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-error" />
            REC
          </div>
        </div>

        <p className="text-center text-xs text-on-surface-variant">
          Nhan Enter hoac nut "Tra cuu" de tim lich hen
        </p>
      </div>
    </section>
  )
}

// ---------- Customer Info Panel (Center column) ----------
function CustomerInfoPanel({ booking, loading, error, onConfirm, onSkip, confirming }) {
  if (loading) return <LoadingSpinner label="Dang tra cuu lich hen..." />
  if (error)
    return (
      <section className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <span className="material-symbols-outlined text-4xl text-error">error</span>
          <p className="text-sm text-error">{error}</p>
        </div>
      </section>
    )
  if (!booking)
    return (
      <section className="glass-panel soft-shadow flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant bg-surface-container-low p-4">
          <h3 className="font-sora text-xl font-semibold text-on-surface">Thong tin khach hang</h3>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
          <span className="material-symbols-outlined text-5xl text-outline">info</span>
          <p className="text-center text-sm text-on-surface-variant">
            Nhap bien so va bam "Tra cuu" de xem thong tin lich hen
          </p>
        </div>
      </section>
    )

  return (
    <section className="glass-panel soft-shadow flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="border-b border-outline-variant bg-surface-container-low p-4">
        <h3 className="font-sora text-xl font-semibold text-on-surface">Thong tin khach hang</h3>
      </div>

      <div className="flex-1 space-y-4 p-4">
        {/* Status badge */}
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-tertiary-container/40 bg-tertiary-container/15 px-3 py-1 text-xs font-semibold uppercase text-tertiary-container">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-tertiary-container" />
            {normalizeBookingStatus(booking.status)}
          </span>
          <span className="text-xs text-on-surface-variant">#{booking.bookingId}</span>
        </div>

        {/* Vehicle info */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">directions_car</span>
            <span className="font-sora text-2xl font-bold tracking-widest text-primary-container">
              {booking.licensePlate}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-on-surface-variant">
              <span className="font-semibold text-on-surface">{booking.serviceName}</span>
            </p>
            <p className="text-sm text-on-surface-variant">
              <span className="material-symbols-outlined mr-1 text-[14px]">schedule</span>
              {formatDateTime(booking.scheduledTime)}
            </p>
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
            <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">Gia goc</p>
            <p className="font-sora text-base font-semibold text-on-surface">
              {formatVnd(booking.originalPrice)}
            </p>
          </div>
          <div className="rounded-xl border border-primary-container/30 bg-primary-container/10 p-3">
            <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Thanh toan
            </p>
            <p className="font-sora text-base font-semibold text-primary-container">
              {formatVnd(booking.finalAmount)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold tracking-wide text-on-primary uppercase shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border border-on-primary/30 border-t-on-primary" />
                Dang xu ly...
              </span>
            ) : (
              'Xac nhan den'
            )}
          </button>
          <button
            className="flex-1 rounded-xl border border-outline bg-transparent px-4 py-3 text-center text-sm font-medium tracking-wide text-on-surface uppercase transition-colors hover:bg-surface-variant"
            onClick={onSkip}
            disabled={confirming}
          >
            Bo qua
          </button>
        </div>
      </div>
    </section>
  )
}

// ---------- Processing Vehicles Panel (Right column) ----------
function ProcessingVehiclesPanel({ vehicles, onComplete, completingPlate }) {
  if (vehicles.length === 0)
    return (
      <section className="glass-panel soft-shadow flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">wash</span>
            <h3 className="font-sora text-xl font-semibold text-on-surface">Dang rua</h3>
          </div>
          <span className="rounded bg-primary-container/20 px-2 py-1 text-xs font-semibold text-primary-container">
            0 xe
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
          <span className="material-symbols-outlined text-5xl text-outline">water_drop</span>
          <p className="text-center text-sm text-on-surface-variant">
            Chua co xe dang rua
          </p>
        </div>
      </section>
    )

  return (
    <section className="glass-panel soft-shadow flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">wash</span>
          <h3 className="font-sora text-xl font-semibold text-on-surface">Dang rua</h3>
        </div>
        <span className="rounded bg-primary-container/20 px-2 py-1 text-xs font-semibold text-primary-container">
          {vehicles.length} xe
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {vehicles.map((v) => (
          <div
            key={v.bookingId}
            className="group relative overflow-hidden rounded-xl border border-primary-container/20 bg-surface-container-low p-4 transition-all hover:border-primary-container/40"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-sora text-xl font-bold tracking-wide text-primary-container">
                {v.licensePlate}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-primary-container/15 px-2 py-0.5 text-[10px] font-semibold text-primary-container uppercase">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-container" />
                Dang rua
              </span>
            </div>

            <div className="mb-3 space-y-1">
              <p className="text-sm text-on-surface">{v.serviceName}</p>
              <p className="text-xs text-on-surface-variant">
                <span className="material-symbols-outlined mr-1 text-[12px]">schedule</span>
                {formatDateTime(v.scheduledTime)}
              </p>
              <p className="text-xs text-on-surface-variant">
                Ma lich hen: #{v.bookingId}
              </p>
            </div>

            <button
              className="w-full rounded-xl border border-primary-container bg-primary-container/10 px-3 py-2 text-center text-xs font-semibold tracking-wide text-primary-container uppercase transition-colors hover:bg-primary-container/25 disabled:opacity-50"
              onClick={() => onComplete(v.licensePlate)}
              disabled={completingPlate === v.licensePlate}
            >
              {completingPlate === v.licensePlate ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border border-primary-container/30 border-t-primary-container" />
                  Dang xu ly...
                </span>
              ) : (
                'Hoan thanh'
              )}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------- Main Dashboard Page ----------
export default function DashboardPage() {
  const [plateInput, setPlateInput] = useState('')
  const [pendingBooking, setPendingBooking] = useState(null)
  const [processingVehicles, setProcessingVehicles] = useState([])
  const [allBookings, setAllBookings] = useState([])

  const [loadingLookup, setLoadingLookup] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [completingPlate, setCompletingPlate] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)

  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  // Fetch today's bookings on mount
  useEffect(() => {
    const loadToday = async () => {
      setInitialLoading(true)
      try {
        const targetDate = new Date().toISOString()
        const data = await fetchBookingsByDate(targetDate)
        const raw = Array.isArray(data) ? data : []
        setAllBookings(raw)

        // Populate processing vehicles from checked-in bookings
        const checked = raw.filter(
          (b) => normalizeBookingStatus(b.status) === 'Checked-in',
        )
        const normalized = checked.map(normalizeBooking)
        setProcessingVehicles(normalized)
      } catch (err) {
        console.warn('Failed to load today bookings:', err)
      } finally {
        setInitialLoading(false)
      }
    }
    loadToday()
  }, [])

  const normalizeBooking = (item) => ({
    bookingId: Number(item.bookingId ?? item.id ?? 0),
    licensePlate: String(item.licensePlate ?? ''),
    serviceName: String(item.serviceName ?? '—'),
    scheduledTime: item.scheduledTime ?? item.scheduledDate ?? null,
    status: normalizeBookingStatus(item.status ?? item.bookingStatus),
    originalPrice: Number(item.originalPrice ?? 0),
    finalAmount: Number(item.finalAmount ?? 0),
  })

  const handleSearch = useCallback(async () => {
    const plate = plateInput.trim()
    if (!plate) return
    setPendingBooking(null)
    setLookupError('')
    setLoadingLookup(true)
    try {
      const data = await fetchBookingsByLicensePlate(plate)
      const raw = Array.isArray(data) ? data : []
      // Filter to only pending bookings
      const pending = raw.filter((b) => normalizeBookingStatus(b.status) === 'Pending')
      if (pending.length === 0) {
        setLookupError('Khong co lich hen Pending cho bien so nay.')
      } else {
        // Show the most recent pending booking
        const latest = pending[0]
        setPendingBooking(normalizeBooking(latest))
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setLookupError(err.message)
      } else {
        setLookupError('Khong the tra cuu. Vui long thu lai.')
      }
    } finally {
      setLoadingLookup(false)
    }
  }, [plateInput])

  const handleConfirm = useCallback(async () => {
    if (!pendingBooking) return
    setConfirming(true)
    try {
      await updateBookingStatusByLicensePlate(pendingBooking.licensePlate, 'Checked-in')
      showToast(`Xe ${pendingBooking.licensePlate} da xac nhan den.`)

      // Move from pending to processing
      const moved = { ...pendingBooking, status: 'Checked-in' }
      setProcessingVehicles((prev) => [moved, ...prev])
      setPendingBooking(null)
      setPlateInput('')
      setLookupError('')

      // Also remove from allBookings pending
      setAllBookings((prev) =>
        prev.map((b) =>
          Number(b.bookingId ?? b.id) === pendingBooking.bookingId
            ? { ...b, status: 'CheckedIn' }
            : b,
        ),
      )
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message || 'Loi khi xac nhan. Vui long thu lai.', 'error')
      } else {
        showToast('Loi khi xac nhan. Vui long thu lai.', 'error')
      }
    } finally {
      setConfirming(false)
    }
  }, [pendingBooking])

  const handleSkip = useCallback(() => {
    setPendingBooking(null)
    setPlateInput('')
    setLookupError('')
  }, [])

  const handleComplete = useCallback(async (licensePlate) => {
    setCompletingPlate(licensePlate)
    try {
      await updateBookingStatusByLicensePlate(licensePlate, 'Completed')
      showToast(`Xe ${licensePlate} da hoan thanh.`)
      setProcessingVehicles((prev) =>
        prev.filter((v) => v.licensePlate !== licensePlate),
      )
      setAllBookings((prev) =>
        prev.filter(
          (b) =>
            String(b.licensePlate ?? '').replace(/\s/g, '').toUpperCase() !==
            licensePlate.replace(/\s/g, '').toUpperCase(),
        ),
      )
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message || 'Loi khi hoan thanh. Vui long thu lai.', 'error')
      } else {
        showToast('Loi khi hoan thanh. Vui long thu lai.', 'error')
      }
    } finally {
      setCompletingPlate(null)
    }
  }, [])

  if (initialLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner label="Dang tai du lieu hom nay..." />
      </div>
    )
  }

  return (
    <div className="relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-sora text-2xl font-semibold text-on-surface">
            Bang dieu khien Staff
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Tra cuu lich hen, xac nhan xe den, va quan ly qua trinh rua
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-4 py-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px] text-primary">wash</span>
          {processingVehicles.length} xe dang rua
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Plate Lookup */}
        <div className="lg:col-span-4">
          <PlateLookupPanel
            plateInput={plateInput}
            onPlateChange={setPlateInput}
            onSearch={handleSearch}
            loading={loadingLookup}
            processingCount={processingVehicles.length}
          />
        </div>

        {/* Center: Customer Info */}
        <div className="lg:col-span-4">
          <CustomerInfoPanel
            booking={pendingBooking}
            loading={loadingLookup}
            error={lookupError}
            onConfirm={handleConfirm}
            onSkip={handleSkip}
            confirming={confirming}
          />
        </div>

        {/* Right: Processing Vehicles */}
        <div className="lg:col-span-4">
          <ProcessingVehiclesPanel
            vehicles={processingVehicles}
            onComplete={handleComplete}
            completingPlate={completingPlate}
          />
        </div>
      </div>
    </div>
  )
}
