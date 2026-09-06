import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../api'
import { fetchManagerBookingsByDate } from '../../api/manager.api'
import { fetchManagerTimeSlots } from '../../api/manager.timeSlots.api'
import { fetchManagerLanes } from '../../api/manager.lanes.api'
import PageHeader from '../../components/admin/shared/PageHeader'
import BookingDetailPanel from '../../components/manager/bookings/BookingDetailPanel'
import DayBookingsPanel from '../../components/manager/bookings/DayBookingsPanel'
import WeekHeader from '../../components/manager/walkIn/WeekHeader'
import WeeklyScheduleGrid from '../../components/manager/walkIn/WeeklyScheduleGrid'
import SlotDetailPanel from '../../components/manager/walkIn/SlotDetailPanel'
import { getMondayOfWeek, getNowInVietnam, getWeekDates, toDateKey } from '../../utils/week'

/**
 * Trang Lịch đặt của Manager.
 *
 * Layout:
 *   1. PageHeader: mô tả hướng dẫn.
 *   2. WeekHeader: chuyển tuần + ô chọn ngày (date picker) "Tới ngày".
 *   3. WeeklyScheduleGrid: lịch tuần T2..CN (tái sử dụng từ trang Walk-in).
 *      - Click header ngày hoặc ô slot → mở DayBookingsPanel.
 *   4. DayBookingsPanel: sổ thông tin đầy đủ booking của 1 ngày
 *      (active status: Pending / Checked-in / Processing; bao gồm walk-in).
 *      - Click 1 dòng → mở BookingDetailPanel.
 *   5. BookingDetailPanel: chi tiết read-only 1 booking.
 *
 * Manager chỉ xem — không có action tạo/sửa booking trên trang này.
 *
 * API sử dụng:
 *   - GET /manager/timeslots       → layout slot cho grid
 *   - GET /manager/bookings        → active bookings (Pending/Checked-in/Processing) cho grid + sổ ngày
 *   - GET /manager/lanes           → tổng lanes cho hiển thị capacity hint
 *   - Helper `fetchManagerBookingsByDate(dateKey)` filter ngày ở FE (an toàn timezone VN).
 *
 * Giới hạn: sổ ngày chỉ hiển thị booking active (Pending/CheckedIn/Processing).
 * Nếu BE cung cấp `/manager/bookings/by-date?targetDate=...`, chỉ cần đổi
 * `fetchManagerBookingsByDate` để gọi endpoint đó — page này không cần sửa.
 *
 * 100% endpoint BE có sẵn — không cần thay đổi BE.
 */
export default function ManagerBookingsPage() {
  const [weekAnchor, setWeekAnchor] = useState(() => getNowInVietnam())

  // Grid data
  const [slots, setSlots] = useState([])
  const [weekBookings, setWeekBookings] = useState([])
  const [lanes, setLanes] = useState([])
  const [gridLoading, setGridLoading] = useState(true)
  const [gridError, setGridError] = useState('')

  // Day bookings
  const [dayOpen, setDayOpen] = useState(null) // Date | null
  const [dayBookings, setDayBookings] = useState([])
  const [dayLoading, setDayLoading] = useState(false)
  const [dayError, setDayError] = useState('')

  // Slot detail (cell)
  const [slotCell, setSlotCell] = useState(null)

  // Booking detail
  const [detailBooking, setDetailBooking] = useState(null)

  // weekDates được tính sớm để dùng chung cho loadWeek + useMemo render.
  const weekDates = useMemo(() => getWeekDates(weekAnchor), [weekAnchor])

  const loadWeek = useCallback(async () => {
    setGridLoading(true)
    setGridError('')
    const dates = weekDates
    const [slotsResult, lanesResult, ...dateResults] = await Promise.allSettled([
      fetchManagerTimeSlots(),
      fetchManagerLanes(),
      ...dates.map((d) => fetchManagerBookingsByDate(toDateKey(d))),
    ])

    if (slotsResult.status === 'fulfilled') {
      setSlots(Array.isArray(slotsResult.value) ? slotsResult.value : [])
    } else {
      setSlots([])
    }
    if (lanesResult.status === 'fulfilled') {
      setLanes(Array.isArray(lanesResult.value) ? lanesResult.value : [])
    } else {
      setLanes([])
    }

    const merged = []
    const seen = new Set()
    let hasBookingError = false
    for (const r of dateResults) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        for (const b of r.value) {
          if (b?.bookingId != null && !seen.has(b.bookingId)) {
            seen.add(b.bookingId)
            merged.push(b)
          }
        }
      } else {
        hasBookingError = true
      }
    }
    setWeekBookings(merged)
    if (hasBookingError) {
      setGridError(
        'Một số ngày không tải được dữ liệu booking. Ô lịch của các ngày đó có thể trống.',
      )
    }
    setGridLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekAnchor])

  const loadDay = useCallback(
    async (date) => {
      if (!date) return
      setDayLoading(true)
      setDayError('')
      try {
        const list = await fetchManagerBookingsByDate(toDateKey(date))
        setDayBookings(Array.isArray(list) ? list : [])
      } catch (err) {
        if (err instanceof ApiError && err.isForbidden) {
          // BE không cấp quyền cho role này — hiển thị lỗi rõ ràng thay vì
          // set [] im lặng khiến sổ ngày trông như rỗng.
          setDayError(
            'Bạn không có quyền xem sổ booking của ngày này. Vui lòng liên hệ quản trị viên.',
          )
        } else {
          const message =
            err instanceof ApiError ? err.message : 'Không tải được danh sách booking của ngày.'
          setDayError(message)
        }
        setDayBookings([])
      } finally {
        setDayLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) loadWeek()
    })
    return () => {
      cancelled = true
    }
  }, [loadWeek])

  const handleCellClick = useCallback((cell) => {
    setSlotCell(cell)
  }, [])

  const handleCloseSlot = useCallback(() => {
    setSlotCell(null)
  }, [])

  const handleDayClick = useCallback(
    (date) => {
      setDayOpen(date)
      loadDay(date)
    },
    [loadDay],
  )

  const handleJumpToDate = useCallback(
    (dateKey) => {
      if (!dateKey) return
      const [y, m, d] = dateKey.split('-').map(Number)
      if (!y || !m || !d) return
      const target = new Date(y, m - 1, d)
      // Nhảy tuần về tuần chứa ngày đó
      setWeekAnchor(getMondayOfWeek(target))
      setDayOpen(target)
      loadDay(target)
    },
    [loadDay],
  )

  const handleCloseDay = useCallback(() => {
    setDayOpen(null)
    setDayError('')
  }, [])

  const handleCloseDetail = useCallback(() => {
    setDetailBooking(null)
  }, [])

  const gridSection = gridLoading ? (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
    </div>
  ) : gridError ? (
    <div className="mb-6 rounded-xl border border-error-container/40 bg-error-container/10 p-4">
      <p className="text-sm text-error">{gridError}</p>
      <button
        type="button"
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
        onClick={loadWeek}
      >
        Thử lại
      </button>
    </div>
  ) : (
    <WeeklyScheduleGrid
      weekDates={weekDates}
      slots={slots}
      bookings={weekBookings}
      lanes={lanes}
      onCellClick={handleCellClick}
      onDayClick={handleDayClick}
      showDayClickHint
    />
  )

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Vận hành chi nhánh"
        title="Lịch đặt"
        description="Lịch tuần tại chi nhánh. Bấm vào ngày hoặc ô khung giờ để xem sổ thông tin booking trong ngày."
        actionIcon="calendar_month"
      />

      <div className="mb-4">
        <WeekHeader
          anchor={weekAnchor}
          onChange={setWeekAnchor}
          onToday={() => setWeekAnchor(getNowInVietnam())}
          enableDatePicker
          onJumpToDate={handleJumpToDate}
        />
      </div>

      {gridSection}

      <DayBookingsPanel
        open={Boolean(dayOpen)}
        date={dayOpen}
        bookings={dayBookings}
        loading={dayLoading}
        error={dayError}
        onClose={handleCloseDay}
        onBookingClick={(b) => setDetailBooking(b)}
      />

      <SlotDetailPanel
        open={Boolean(slotCell)}
        cell={slotCell}
        onClose={handleCloseSlot}
        onBookingClick={(b) => setDetailBooking(b)}
      />

      {/* Nếu DayBookingsPanel đang đóng, vẫn cho phép mở detail trực tiếp */}
      {detailBooking && (
        <BookingDetailPanel
          open={Boolean(detailBooking)}
          booking={detailBooking}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  )
}
