import { useCallback, useEffect, useState } from 'react'
import { fetchVehicleTypes, getBranchId } from '../../api'
import { apiRequest } from '../../api/client'
import { fetchManagerLanes } from '../../api/manager.lanes.api'
import { fetchManagerTimeSlots } from '../../api/manager.timeSlots.api'
import PageHeader from '../../components/admin/shared/PageHeader'
import FormModal from '../../components/admin/shared/FormModal'
import SlotDetailPanel from '../../components/manager/walkIn/SlotDetailPanel'
import WalkInForm from '../../components/manager/walkIn/WalkInForm'
import WeekHeader from '../../components/manager/walkIn/WeekHeader'
import WeeklyScheduleGrid from '../../components/manager/walkIn/WeeklyScheduleGrid'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { getNowInVietnam, getWeekDates } from '../../utils/week'

/**
 * Trang Walk-in cho Manager.
 *
 * Layout:
 *   1. Header tuần (prev/today/next)
 *   2. Lịch tuần T2-CN dạng grid (N hàng slot × 7 cột ngày)
 *   3. Mỗi ô:
 *      - Slot hiện tại + còn trống → mở modal walk-in (WalkInForm)
 *      - Slot hiện tại + đầy → toast error
 *      - Slot quá khứ → toast warning + mở panel chi tiết
 *      - Slot tương lai → mở panel chi tiết
 *
 * Lưu ý: dùng các API BE có sẵn, không thay đổi BE.
 */
export default function ManagerWalkInPage() {
  const { user } = useAuth()
  const branchId = getBranchId(user)
  // String param để đưa vào query URL; giữ '' khi không có branchId để rơi
  // vào fallback /services (không query) thay vì ?branchId=undefined.
  const branchIdParam = branchId != null ? String(branchId) : ''
  const toast = useToast()

  // Data
  const [services, setServices] = useState([])
  const [vehicleTypes, setVehicleTypes] = useState([])
  const [lanes, setLanes] = useState([])
  const [slots, setSlots] = useState([])
  const [bookings, setBookings] = useState([])

  // Loading flags
  const [initialLoading, setInitialLoading] = useState(true)
  const [walkInLoading, setWalkInLoading] = useState(true)

  // UI state
  const [weekAnchor, setWeekAnchor] = useState(() => getNowInVietnam())
  const [walkInOpen, setWalkInOpen] = useState(false)
  const [activeCell, setActiveCell] = useState(null)
  const [detailCell, setDetailCell] = useState(null)

  const loadWalkInData = useCallback(async () => {
    setWalkInLoading(true)
    try {
      const [servicesResult, lanesResult, vehicleTypesResult] = await Promise.allSettled([
        apiRequest(
          branchIdParam
            ? `/services?branchId=${encodeURIComponent(branchIdParam)}`
            : '/services',
        ),
        fetchManagerLanes(),
        fetchVehicleTypes(),
      ])
      if (servicesResult.status === 'fulfilled') {
        const data = servicesResult.value
        setServices(Array.isArray(data) ? data.filter((s) => s.isActive !== false) : [])
      }
      if (lanesResult.status === 'fulfilled') {
        setLanes(Array.isArray(lanesResult.value) ? lanesResult.value : [])
      }
      if (vehicleTypesResult.status === 'fulfilled') {
        const data = vehicleTypesResult.value
        setVehicleTypes(Array.isArray(data) ? data : [])
      }
    } finally {
      setWalkInLoading(false)
    }
  }, [])

  const loadScheduleData = useCallback(async () => {
    const [slotsResult, bookingsResult] = await Promise.allSettled([
      fetchManagerTimeSlots(),
      apiRequest('/manager/bookings'),
    ])
    if (slotsResult.status === 'fulfilled') {
      setSlots(Array.isArray(slotsResult.value) ? slotsResult.value : [])
    }
    if (bookingsResult.status === 'fulfilled') {
      setBookings(Array.isArray(bookingsResult.value) ? bookingsResult.value : [])
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setInitialLoading(true)
      try {
        await Promise.all([loadWalkInData(), loadScheduleData()])
      } finally {
        if (!cancelled) setInitialLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadWalkInData, loadScheduleData])

  const handleCellClick = (cell) => {
    // Slot hiện tại + đầy → toast error, không mở modal
    if (cell.cellState === 'current-full') {
      toast.error('Khung giờ đã đầy. Không thể đặt thêm walk-in.')
      setDetailCell(cell)
      return
    }

    // Slot quá khứ → toast warning + mở panel chi tiết
    if (cell.cellState === 'past') {
      toast.warning('Khung giờ này đã qua. Chỉ xem chi tiết.')
      setDetailCell(cell)
      return
    }

    // Slot hiện tại + còn trống → mở modal walk-in
    if (cell.cellState === 'current-empty') {
      setActiveCell(cell)
      setWalkInOpen(true)
      return
    }

    // Slot tương lai → mở panel chi tiết
    setDetailCell(cell)
  }

  const handleWalkInSuccess = async () => {
    setWalkInOpen(false)
    setActiveCell(null)
    await loadScheduleData()
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
      </div>
    )
  }

  const weekDates = getWeekDates(weekAnchor)

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Vận hành chi nhánh"
        title="Tiếp nhận khách vãng lai"
        description="Check-in nhanh cho xe đến trạm. Click vào ô khung giờ hiện tại để đặt."
        actionIcon="directions_car"
      />

      <div className="mb-4">
        <WeekHeader
          anchor={weekAnchor}
          onChange={(newMonday) => setWeekAnchor(newMonday)}
          onToday={() => setWeekAnchor(getNowInVietnam())}
        />
      </div>

      <WeeklyScheduleGrid
        weekDates={weekDates}
        slots={slots}
        bookings={bookings}
        lanes={lanes}
        onCellClick={handleCellClick}
      />

      {/* Modal walk-in: chỉ dùng cho ô slot hiện tại + còn trống */}
      <FormModal
        open={walkInOpen}
        title="Tiếp nhận khách vãng lai"
        submitLabel=""
        onClose={() => {
          if (walkInLoading) return
          setWalkInOpen(false)
          setActiveCell(null)
        }}
        onSubmit={() => {}}
        size="xl"
      >
        <WalkInForm
          branchId={branchIdParam}
          services={services}
          lanes={lanes}
          vehicleTypes={vehicleTypes}
          loading={walkInLoading}
          activeCell={activeCell}
          onSuccess={handleWalkInSuccess}
        />
      </FormModal>

      {/* Panel chi tiết cho các ô không walk-in được */}
      <SlotDetailPanel
        open={Boolean(detailCell)}
        cell={detailCell}
        onClose={() => setDetailCell(null)}
      />
    </div>
  )
}
