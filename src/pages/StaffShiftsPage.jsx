import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  createStaffOvertimeRequest,
  createStaffShiftSwapRequest,
  fetchStaffAvailableShiftsForSwap,
  fetchStaffOvertimeRequests,
  fetchStaffShifts,
  fetchStaffShiftSwapRequests,
  fetchStaffWorkShifts,
  swapStaffLaneByPhone,
  toTimeInputValue,
} from '../api'
import EmptyState from '../components/admin/shared/EmptyState'
import FormModal from '../components/admin/shared/FormModal'
import PageHeader from '../components/admin/shared/PageHeader'
import StatusBadge from '../components/admin/shared/StatusBadge'
import ShiftCalendar from '../components/staff/ShiftCalendar'
import { formatDateTime } from '../utils/format'

const TABS = [
  { id: 'schedule', label: 'Lịch ca' },
  { id: 'overtime', label: 'Tăng ca' },
  { id: 'swap', label: 'Đổi ca' },
]

const emptyOvertimeForm = { workDate: '', startTime: '17:00', endTime: '20:00', reason: '' }
const emptySwapForm = { fromAssignmentId: '', toAssignmentId: '', reason: '' }
const emptyLaneSwapForm = { targetPhoneNumber: '', date: '' }

const SWAP_HORIZON_DAYS = 30

function toDateInputValue(date) {
  if (!date) return ''
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isFutureOrToday(dateStr) {
  if (!dateStr) return false
  const target = new Date(dateStr)
  if (Number.isNaN(target.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return target.getTime() >= today.getTime()
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function StaffShiftsPage() {
  const [tab, setTab] = useState('schedule')
  const [shifts, setShifts] = useState([])
  const [overtimeRequests, setOvertimeRequests] = useState([])
  const [swapRequests, setSwapRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState('')
  const [shiftFilter, setShiftFilter] = useState({ fromDate: '', toDate: '' })

  const [overtimeModalOpen, setOvertimeModalOpen] = useState(false)
  const [swapModalOpen, setSwapModalOpen] = useState(false)
  const [overtimeForm, setOvertimeForm] = useState(emptyOvertimeForm)
  const [swapForm, setSwapForm] = useState(emptySwapForm)
  const [swapFromDate, setSwapFromDate] = useState(null)
  const [swapToDate, setSwapToDate] = useState(null)
  const [swapFromShift, setSwapFromShift] = useState(null)
  const [swapToShift, setSwapToShift] = useState(null)
  const [swapTargetShifts, setSwapTargetShifts] = useState([])
  const [swapTargetLoading, setSwapTargetLoading] = useState(false)
  const [swapMode, setSwapMode] = useState('other')
  const [swapEmptyWorkShiftId, setSwapEmptyWorkShiftId] = useState('')
  const [swapEmptyDate, setSwapEmptyDate] = useState('')
  const [swapEmptyShifts, setSwapEmptyShifts] = useState([])
  const [swapEmptyLoading, setSwapEmptyLoading] = useState(false)
  const [laneSwapModalOpen, setLaneSwapModalOpen] = useState(false)
  const [laneSwapForm, setLaneSwapForm] = useState(emptyLaneSwapForm)
  const [saving, setSaving] = useState(false)
  const [workShiftCatalog, setWorkShiftCatalog] = useState([])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadAll = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [shiftList, overtime, swaps, workShifts] = await Promise.all([
        fetchStaffShifts(shiftFilter),
        fetchStaffOvertimeRequests(),
        fetchStaffShiftSwapRequests(),
        fetchStaffWorkShifts(),
      ])
      setShifts(shiftList)
      setOvertimeRequests(overtime)
      setSwapRequests(swaps)
      setWorkShiftCatalog(workShifts)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được lịch ca')
    } finally {
      setLoading(false)
    }
  }, [shiftFilter])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const swapHorizonStart = useMemo(() => startOfDay(new Date()), [])
  const swapHorizonEnd = useMemo(() => addDays(swapHorizonStart, SWAP_HORIZON_DAYS), [swapHorizonStart])

  const myFutureShifts = useMemo(() => {
    const today = swapHorizonStart.getTime()
    return shifts.filter((s) => {
      if (!s.workDate) return false
      const d = new Date(s.workDate)
      if (Number.isNaN(d.getTime())) return false
      d.setHours(0, 0, 0, 0)
      return d.getTime() >= today && s.status === 'Scheduled'
    })
  }, [shifts, swapHorizonStart])

  // Lookup "ca nào của Manager tôi đang giữ ở ngày nào"
  // Dùng để làm mờ / disable khi Staff chọn ca đích trùng workShiftId + ngày.
  const myShiftByDate = useMemo(() => {
    /** @type {Record<string, { workShiftId: number, shiftName: string, startTime: string, endTime: string }>} */
    const map = {}
    for (const s of myFutureShifts) {
      const key = toDateInputValue(s.workDate)
      if (!key) continue
      map[key] = {
        workShiftId: s.workShiftId,
        shiftName: s.shiftName,
        startTime: s.startTime,
        endTime: s.endTime,
      }
    }
    return map
  }, [myFutureShifts])

  // Helper: ca tôi đang giữ ở 1 ngày cụ thể hay không
  const findMyShiftOnDate = (date) => {
    if (!date) return null
    const key = toDateInputValue(date)
    return myShiftByDate[key] || null
  }

  const handleCreateOvertime = async () => {
    if (!overtimeForm.workDate) {
      showToast('Vui lòng chọn ngày tăng ca')
      return
    }
    if (!isFutureOrToday(overtimeForm.workDate)) {
      showToast('Ngày tăng ca phải là hôm nay hoặc trong tương lai')
      return
    }
    setSaving(true)
    try {
      await createStaffOvertimeRequest(overtimeForm)
      showToast('Đã gửi yêu cầu tăng ca')
      setOvertimeModalOpen(false)
      setOvertimeForm(emptyOvertimeForm)
      await loadAll()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không gửi được yêu cầu')
    } finally {
      setSaving(false)
    }
  }

  const openSwapModal = () => {
    resetSwapFlow()
    setSwapModalOpen(true)
  }

  const closeSwapModal = () => {
    if (saving) return
    setSwapModalOpen(false)
  }

  const fetchTargetShiftsForDate = async (date) => {
    setSwapTargetLoading(true)
    try {
      // Lấy song song: ca của nhân viên khác (ưu tiên) + ca của chính tôi ở ngày đó
      // để hỗ trợ cả case "đổi với nhân viên khác" lẫn "đổi giữa 2 ca của tôi cùng workShiftId khác ngày".
      const [otherStaffShifts, myShifts] = await Promise.all([
        fetchStaffAvailableShiftsForSwap({ date: toDateInputValue(date) }).catch(() => []),
        fetchStaffShifts({
          fromDate: toDateInputValue(date),
          toDate: toDateInputValue(date),
        }).catch(() => []),
      ])
      const today = swapHorizonStart.getTime()
      const isFutureScheduled = (s) => {
        const d = new Date(s.workDate)
        if (Number.isNaN(d.getTime())) return false
        d.setHours(0, 0, 0, 0)
        return d.getTime() >= today && s.status === 'Scheduled'
      }
      const mineFuture = myShifts.filter(isFutureScheduled)
      // Loại trừ ca của chính mình khỏi danh sách "other", tránh trùng
      const otherFuture = otherStaffShifts
        .filter(isFutureScheduled)
        .filter((s) => !mineFuture.some((m) => m.shiftAssignmentId === s.shiftAssignmentId))
      // Gộp: ca của staff khác trước (mục đích chính của mode "đổi với nhân viên khác"),
      // rồi đến ca của tôi (cho case đổi giữa 2 ca của mình).
      setSwapTargetShifts([...otherFuture, ...mineFuture])
    } catch {
      setSwapTargetShifts([])
      showToast('Không tải được ca trong ngày đã chọn')
    } finally {
      setSwapTargetLoading(false)
    }
  }

  const resetSwapTarget = () => {
    setSwapToDate(null)
    setSwapToShift(null)
    setSwapTargetShifts([])
    setSwapForm((f) => ({ ...f, toAssignmentId: '' }))
  }

  const resetSwapFlow = () => {
    setSwapForm(emptySwapForm)
    setSwapFromDate(null)
    setSwapToDate(null)
    setSwapFromShift(null)
    setSwapToShift(null)
    setSwapTargetShifts([])
    setSwapMode('other')
    setSwapEmptyWorkShiftId('')
    setSwapEmptyDate('')
    setSwapEmptyShifts([])
  }

  const handleCalendarSelect = (date) => {
    const next = startOfDay(date)
    if (!swapFromDate) {
      setSwapFromDate(next)
      setSwapFromShift(null)
      setSwapForm((f) => ({ ...f, fromAssignmentId: '' }))
      return
    }
    if (next.getTime() === swapFromDate.getTime()) {
      showToast('Ngày ca đích phải khác ngày ca nguồn')
      return
    }
    if (!swapToDate || next.getTime() !== swapToDate.getTime()) {
      setSwapToDate(next)
      setSwapToShift(null)
      setSwapForm((f) => ({ ...f, toAssignmentId: '' }))
      fetchTargetShiftsForDate(next)
    }
  }

  const handleCreateSwap = async () => {
    if (!swapFromShift) {
      showToast('Vui lòng chọn ca nguồn')
      return
    }
    const isEmptyMode = swapMode === 'empty'
    if (!isEmptyMode && !swapToShift) {
      showToast('Vui lòng chọn ca đích')
      return
    }
    if (isEmptyMode) {
      if (!swapEmptyWorkShiftId || !swapEmptyDate) {
        showToast('Vui lòng chọn ca và ngày muốn đổi sang')
        return
      }
      const fromKey = toDateInputValue(swapFromShift.workDate)
      const sameDay = toDateInputValue(swapEmptyDate) === fromKey
      const sameShift = Number(swapEmptyWorkShiftId) === swapFromShift.workShiftId
      if (sameDay && sameShift) {
        showToast('Ca trống phải khác ca hoặc khác ngày so với ca nguồn')
        return
      }
    } else {
      if (swapFromShift.shiftAssignmentId === swapToShift.shiftAssignmentId) {
        showToast('Không thể đổi sang cùng một ca')
        return
      }
      if (
        swapFromShift.workShiftId === swapToShift.workShiftId &&
        toDateInputValue(swapFromShift.workDate) === toDateInputValue(swapToShift.workDate)
      ) {
        showToast('Ca đích phải khác ngày hoặc khác ca với ca nguồn')
        return
      }
    }
    setSaving(true)
    try {
      if (isEmptyMode) {
        await createStaffShiftSwapRequest({
          fromAssignmentId: swapFromShift.shiftAssignmentId,
          toWorkShiftId: swapEmptyWorkShiftId,
          toWorkDate: swapEmptyDate,
          reason: swapForm.reason,
        })
      } else {
        await createStaffShiftSwapRequest({
          fromAssignmentId: swapFromShift.shiftAssignmentId,
          toAssignmentId: swapToShift.shiftAssignmentId,
          reason: swapForm.reason,
        })
      }
      showToast('Đã gửi yêu cầu đổi ca')
      setSwapModalOpen(false)
      setSwapForm(emptySwapForm)
      setSwapFromDate(null)
      setSwapToDate(null)
      setSwapFromShift(null)
      setSwapToShift(null)
      setSwapTargetShifts([])
      setSwapMode('other')
      setSwapEmptyWorkShiftId('')
      setSwapEmptyDate('')
      setSwapEmptyShifts([])
      await loadAll()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không gửi được yêu cầu')
    } finally {
      setSaving(false)
    }
  }

  // Lấy các ca của nhân viên khác đang giữ workShift+date đã chọn (cho mode "swap sang ca trống").
  const fetchEmptyShiftOptions = async (workShiftId, date) => {
    if (!workShiftId || !date) {
      setSwapEmptyShifts([])
      return
    }
    setSwapEmptyLoading(true)
    try {
      const list = await fetchStaffAvailableShiftsForSwap({
        workShiftId: Number(workShiftId),
        date: toDateInputValue(date),
      })
      setSwapEmptyShifts(list.filter((s) => s.status === 'Scheduled'))
    } catch {
      setSwapEmptyShifts([])
    } finally {
      setSwapEmptyLoading(false)
    }
  }

  const handleSwapLaneByPhone = async () => {
    if (!laneSwapForm.targetPhoneNumber.trim()) {
      showToast('Vui lòng nhập số điện thoại nhân viên muốn đổi làn')
      return
    }
    setSaving(true)
    try {
      await swapStaffLaneByPhone({
        targetPhoneNumber: laneSwapForm.targetPhoneNumber.trim(),
        date: laneSwapForm.date || undefined,
      })
      showToast('Đã đổi làn thành công')
      setLaneSwapModalOpen(false)
      setLaneSwapForm(emptyLaneSwapForm)
      await loadAll()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không đổi làn được')
    } finally {
      setSaving(false)
    }
  }

  const stepLabel = (() => {
    if (!swapFromShift) return 'Bước 1: Chọn ca nguồn — ca của bạn muốn đổi đi'
    if (swapMode === 'other') {
      if (!swapFromDate) return 'Bước 2: Chọn ngày có ca bạn muốn đổi sang'
      if (!swapToShift) return 'Bước 3: Chọn ca của nhân viên khác muốn đổi sang'
      return 'Đã chọn xong. Có thể bấm "Chọn lại từ đầu" để thao tác lại.'
    }
    if (!swapEmptyWorkShiftId) return 'Bước 2: Chọn ca muốn đổi sang (ca trống của quản lý)'
    if (!swapEmptyDate) return 'Bước 3: Chọn ngày muốn đổi sang'
    return 'Đã chọn xong. Có thể bấm "Chọn lại từ đầu" để thao tác lại.'
  })()

  // Tính ngày tối thiểu cho date input "ngày muốn đổi sang ca trống" (từ hôm nay → +30 ngày)
  const minSwapDate = useMemo(() => toDateInputValue(new Date()), [])
  const maxSwapDate = useMemo(() => toDateInputValue(addDays(new Date(), SWAP_HORIZON_DAYS)), [])
  return (
    <div className="w-full">
      <PageHeader
        title="Ca làm của tôi"
        description="Xem lịch ca, gửi yêu cầu tăng ca hoặc đổi ca"
        actionLabel={tab === 'overtime' ? 'Xin tăng ca' : tab === 'swap' ? 'Xin đổi ca' : 'Đổi làn'}
        onAction={
          tab === 'overtime'
            ? () => setOvertimeModalOpen(true)
            : tab === 'swap'
            ? openSwapModal
            : () => setLaneSwapModalOpen(true)
        }
      />

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'schedule' && (
        <div className="mb-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase text-on-surface-variant">Từ ngày</span>
              <input
                type="date"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
                value={shiftFilter.fromDate}
                onChange={(e) => setShiftFilter((f) => ({ ...f, fromDate: e.target.value }))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase text-on-surface-variant">Đến ngày</span>
              <input
                type="date"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
                value={shiftFilter.toDate}
                onChange={(e) => setShiftFilter((f) => ({ ...f, toDate: e.target.value }))}
              />
            </label>
            <button
              type="button"
              className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container"
              onClick={() => setShiftFilter({ fromDate: '', toDate: '' })}
              disabled={!shiftFilter.fromDate && !shiftFilter.toDate}
            >
              Xóa lọc
            </button>
          </div>
        </div>
      )}

      {loadError && (
        <div className="mb-4 rounded-lg border border-error-container bg-error-container/30 px-4 py-3 text-sm text-error">
          {loadError}
          <button type="button" className="ml-3 underline" onClick={loadAll}>
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải…</p>
      ) : tab === 'schedule' ? (
        <div className="space-y-4">
          <ShiftCalendar
            shifts={shifts}
            futureOnly={true}
            minDate={swapHorizonStart}
            maxDate={swapHorizonEnd}
            selectedDate={null}
            onSelectDate={() => {}}
            title="Lịch ca trong 30 ngày tới"
            helperText="Chỉ hiển thị các ngày trong tương lai. Qua ngày, ca sẽ tự động chuyển sang lịch sử."
          />
          {shifts.length === 0 ? (
            <EmptyState icon="calendar_month" title="Chưa có ca được phân" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-xs uppercase text-on-surface-variant">
                    <th className="px-4 py-3">Ca</th>
                    <th className="px-4 py-3">Ngày</th>
                    <th className="px-4 py-3">Giờ</th>
                    <th className="px-4 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {shifts.map((row) => (
                    <tr key={row.shiftAssignmentId}>
                      <td className="px-4 py-3 font-medium">{row.shiftName}</td>
                      <td className="px-4 py-3">{formatDateTime(row.workDate)}</td>
                      <td className="px-4 py-3">
                        {toTimeInputValue(row.startTime)} – {toTimeInputValue(row.endTime)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : tab === 'overtime' ? (
        overtimeRequests.length === 0 ? (
          <EmptyState icon="more_time" title="Chưa có yêu cầu tăng ca" />
        ) : (
          <div className="space-y-3">
            {overtimeRequests.map((req) => (
              <div
                key={req.overtimeRequestId}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-on-surface">
                      {formatDateTime(req.workDate)} · {toTimeInputValue(req.startTime)} –{' '}
                      {toTimeInputValue(req.endTime)}
                    </p>
                    {req.reason && <p className="mt-1 text-sm text-on-surface-variant">{req.reason}</p>}
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : swapRequests.length === 0 ? (
        <EmptyState icon="swap_horiz" title="Chưa có yêu cầu đổi ca" />
      ) : (
        <div className="space-y-3">
          {swapRequests.map((req) => (
            <div
              key={req.shiftSwapRequestId}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-on-surface">
                    Đổi từ{' '}
                    <span className="font-medium">{req.fromShiftName || `Ca #${req.fromAssignmentId}`}</span>{' '}
                    ({req.fromWorkDate ? formatDateTime(req.fromWorkDate) : '—'}) sang{' '}
                    <span className="font-medium">{req.toShiftName || `Ca #${req.toAssignmentId}`}</span>{' '}
                    ({req.toWorkDate ? formatDateTime(req.toWorkDate) : '—'})
                  </p>
                  {req.reason && <p className="mt-1 text-sm text-on-surface-variant">{req.reason}</p>}
                </div>
                <StatusBadge status={req.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      <FormModal
        open={overtimeModalOpen}
        title="Xin tăng ca"
        submitLabel={saving ? 'Đang gửi…' : 'Gửi'}
        onClose={() => !saving && setOvertimeModalOpen(false)}
        onSubmit={handleCreateOvertime}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Ngày</span>
            <input
              type="date"
              min={toDateInputValue(swapHorizonStart)}
              className="w-full rounded-lg border border-outline-variant px-3 py-2"
              value={overtimeForm.workDate}
              onChange={(e) => setOvertimeForm((f) => ({ ...f, workDate: e.target.value }))}
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase text-on-surface-variant">Từ</span>
              <input
                type="time"
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                value={overtimeForm.startTime}
                onChange={(e) => setOvertimeForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase text-on-surface-variant">Đến</span>
              <input
                type="time"
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                value={overtimeForm.endTime}
                onChange={(e) => setOvertimeForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Lý do</span>
            <textarea
              className="w-full rounded-lg border border-outline-variant px-3 py-2"
              rows={3}
              value={overtimeForm.reason}
              onChange={(e) => setOvertimeForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </label>
        </div>
      </FormModal>

      <FormModal
        open={swapModalOpen}
        title="Xin đổi ca"
        submitLabel={saving ? 'Đang gửi…' : 'Gửi'}
        onClose={closeSwapModal}
        onSubmit={handleCreateSwap}
        size="lg"
      >
        <div className="space-y-5">
          <div className="rounded-lg border border-primary/30 bg-primary-container/20 p-3 text-xs text-on-primary-container">
            <p className="font-medium">Hướng dẫn:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>Bước 1: chọn ca nguồn — ca của bạn muốn đổi đi.</li>
              <li>Bước 2: chọn ca đích — ca khác (của bạn hoặc nhân viên khác) muốn đổi sang.</li>
              <li>Ca hiện đang do bạn giữ sẽ tự động bị làm mờ và không thể chọn làm ca đích.</li>
              <li>Sau khi gửi, manager sẽ duyệt yêu cầu.</li>
            </ul>
          </div>

          {workShiftCatalog.length > 0 && (
            <div className="space-y-2 rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <p className="text-xs font-semibold uppercase text-on-surface-variant">
                Ca làm việc quản lý đang tạo ({workShiftCatalog.length} ca)
              </p>
              <p className="text-[11px] text-on-surface-variant">
                Đây là danh sách ca mà quản lý đã tạo. Ca nào trùng với ca bạn đang giữ sẽ bị làm mờ khi chọn ca đích.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {workShiftCatalog.map((w) => {
                  const isMyShiftId = swapFromShift?.workShiftId === w.workShiftId
                  return (
                    <div
                      key={w.workShiftId}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                        isMyShiftId
                          ? 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant/60'
                          : 'border-outline-variant bg-surface-container-lowest text-on-surface'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{w.shiftName}</span>
                        <span className="text-[11px]">
                          {toTimeInputValue(w.startTime)} – {toTimeInputValue(w.endTime)}
                        </span>
                      </div>
                      {isMyShiftId && (
                        <span className="ml-2 rounded-full bg-warning-container px-2 py-0.5 text-[10px] font-medium text-on-warning-container">
                          Ca nguồn
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">
              {swapFromDate && swapFromShift && swapToDate && swapToShift
                ? 'Đã chọn xong. Có thể bấm "Chọn lại" để thao tác từ đầu.'
                : 'Chỉ có thể chọn ngày từ hôm nay trở đi.'}
            </p>
            {(swapFromDate || swapToDate) && (
              <button
                type="button"
                onClick={resetSwapFlow}
                className="text-xs font-medium text-primary underline"
              >
                Chọn lại từ đầu
              </button>
            )}
          </div>

          {/* Bước 1 - chọn ca nguồn */}
          <div className="space-y-2 rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <p className="text-xs font-semibold uppercase text-on-surface-variant">
              Ca của bạn (chọn ca muốn đổi đi)
            </p>
            {myFutureShifts.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Bạn không có ca nào trong tương lai.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {myFutureShifts.map((s) => {
                  const selected = swapFromShift?.shiftAssignmentId === s.shiftAssignmentId
                  return (
                    <button
                      key={s.shiftAssignmentId}
                      type="button"
                      onClick={() => {
                        setSwapFromShift(s)
                        setSwapFromDate(startOfDay(s.workDate))
                        setSwapForm((f) => ({ ...f, fromAssignmentId: s.shiftAssignmentId }))
                        setSwapToDate(null)
                        setSwapToShift(null)
                        setSwapTargetShifts([])
                        setSwapEmptyDate('')
                        setSwapEmptyWorkShiftId('')
                        setSwapEmptyShifts([])
                      }}
                      className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        selected
                          ? 'border-primary bg-primary-container text-on-primary-container'
                          : 'border-outline-variant bg-surface-container-lowest hover:border-primary'
                      }`}
                    >
                      <span className="font-medium">{s.shiftName}</span>
                      <span className="text-[11px]">
                        {formatDateTime(s.workDate)} · {toTimeInputValue(s.startTime)} – {toTimeInputValue(s.endTime)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {swapFromShift && (
            <div className="space-y-3 rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <p className="text-xs font-semibold uppercase text-on-surface-variant">Chọn hình thức đổi ca</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setSwapMode('other')
                    setSwapEmptyWorkShiftId('')
                    setSwapEmptyDate('')
                    setSwapEmptyShifts([])
                  }}
                  className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    swapMode === 'other'
                      ? 'border-primary bg-primary-container text-on-primary-container'
                      : 'border-outline-variant bg-surface-container-lowest hover:border-primary'
                  }`}
                >
                  <span className="font-medium">Đổi với nhân viên khác</span>
                  <span className="text-[11px] text-on-surface-variant">
                    Chọn ca của nhân viên khác cùng workShift + ngày để hoán đổi.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSwapMode('empty')
                    setSwapFromDate(null)
                    setSwapToDate(null)
                    setSwapToShift(null)
                    setSwapTargetShifts([])
                  }}
                  className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    swapMode === 'empty'
                      ? 'border-primary bg-primary-container text-on-primary-container'
                      : 'border-outline-variant bg-surface-container-lowest hover:border-primary'
                  }`}
                >
                  <span className="font-medium">Đổi sang ca trống</span>
                  <span className="text-[11px] text-on-surface-variant">
                    Chọn ca quản lý đã tạo + ngày trống — manager sẽ duyệt.
                  </span>
                </button>
              </div>
            </div>
          )}

          {swapFromShift && swapMode === 'other' && (
            <>
              <ShiftCalendar
                shifts={myFutureShifts}
                futureOnly={true}
                minDate={swapHorizonStart}
                maxDate={swapHorizonEnd}
                selectedDate={swapToDate}
                onSelectDate={handleCalendarSelect}
                title={stepLabel}
                helperText="Bấm vào 1 ngày để chọn ngày muốn đổi sang. Ngày quá khứ sẽ bị vô hiệu."
                emptyText="Không có ca"
              />

              {swapToDate && (
                <div className="space-y-2 rounded-lg border border-outline-variant bg-surface-container-low p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-on-surface-variant">
                      Ca của nhân viên khác — {formatDateTime(swapToDate)}
                    </p>
                    <button
                      type="button"
                      onClick={resetSwapTarget}
                      className="text-xs text-primary underline"
                    >
                      Đổi ngày khác
                    </button>
                  </div>
                  {swapTargetLoading ? (
                    <p className="text-sm text-on-surface-variant">Đang tải ca trong ngày…</p>
                  ) : swapTargetShifts.length === 0 ? (
                    <div className="space-y-2 text-sm text-on-surface-variant">
                      <p>
                        Chưa có nhân viên nào được phân ca trong ngày{' '}
                        <span className="font-medium">{formatDateTime(swapToDate)}</span>.
                      </p>
                      <p>Hãy chọn ngày khác hoặc chuyển sang chế độ "Đổi sang ca trống".</p>
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {swapTargetShifts.map((s) => {
                        const isCurrentFromShift =
                          swapFromShift && s.shiftAssignmentId === swapFromShift.shiftAssignmentId
                        // BE cho phép swap 2 ca cùng workShiftId nếu KHÁC NGÀY.
                        // Vậy disable chỉ khi cùng workShiftId + cùng workDate với ca nguồn
                        // (đây chính là "cùng ngày, cùng ca" — không có ý nghĩa swap).
                        const fromKey = toDateInputValue(swapFromShift?.workDate)
                        const sKey = toDateInputValue(s.workDate)
                        const isSameShiftSameDay =
                          swapFromShift?.workShiftId != null &&
                          s.workShiftId === swapFromShift.workShiftId &&
                          fromKey === sKey
                        const disabled = Boolean(isCurrentFromShift || isSameShiftSameDay)
                        const selected = swapToShift?.shiftAssignmentId === s.shiftAssignmentId
                        const myOnTarget = findMyShiftOnDate(swapToDate)
                        const myHereTag =
                          myOnTarget && s.shiftAssignmentId === myOnTarget.shiftAssignmentId
                            ? ' (Ca bạn đang giữ)'
                            : ''
                        const isMyShift = Boolean(myOnTarget && s.shiftAssignmentId === myOnTarget.shiftAssignmentId)
                        return (
                          <button
                            key={s.shiftAssignmentId}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              if (disabled) return
                              setSwapToShift(s)
                              setSwapForm((f) => ({
                                ...f,
                                toAssignmentId: String(s.shiftAssignmentId),
                              }))
                            }}
                            className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                              disabled
                                ? 'cursor-not-allowed border-outline-variant/40 bg-surface-container-low/60 text-on-surface-variant/50'
                                : selected
                                  ? 'border-primary bg-primary-container text-on-primary-container'
                                  : 'border-outline-variant bg-surface-container-lowest hover:border-primary'
                            }`}
                          >
                            <span className="flex w-full items-center justify-between gap-2">
                              <span className="font-medium">
                                {s.shiftName}
                                {myHereTag}
                              </span>
                              {isMyShift && (
                                <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-medium text-on-secondary-container">
                                  Của bạn
                                </span>
                              )}
                            </span>
                            <span className="text-[11px]">
                              {s.staffName || 'Nhân viên'} · {toTimeInputValue(s.startTime)} – {toTimeInputValue(s.endTime)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {swapFromShift && swapMode === 'empty' && (
            <div className="space-y-3 rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <p className="text-xs font-semibold uppercase text-on-surface-variant">Chọn ca trống muốn đổi sang</p>

              <div className="space-y-1">
                <span className="text-xs font-medium text-on-surface-variant">Ca làm việc (của quản lý)</span>
                {workShiftCatalog.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">Chưa có ca làm việc nào được tạo.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {workShiftCatalog.map((w) => {
                      const isMyFromShift =
                        swapFromShift && swapFromShift.workShiftId === w.workShiftId
                      const selected = String(swapEmptyWorkShiftId) === String(w.workShiftId)
                      return (
                        <button
                          key={w.workShiftId}
                          type="button"
                          disabled={Boolean(isMyFromShift)}
                          onClick={() => {
                            setSwapEmptyWorkShiftId(w.workShiftId)
                            setSwapEmptyDate('')
                            setSwapEmptyShifts([])
                            fetchEmptyShiftOptions(w.workShiftId, '')
                          }}
                          className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                            isMyFromShift
                              ? 'cursor-not-allowed border-outline-variant/40 bg-surface-container-low text-on-surface-variant/50'
                              : selected
                                ? 'border-primary bg-primary-container text-on-primary-container'
                                : 'border-outline-variant bg-surface-container-lowest hover:border-primary'
                          }`}
                        >
                          <span className="font-medium">{w.shiftName}</span>
                          <span className="text-[11px]">
                            {toTimeInputValue(w.startTime)} – {toTimeInputValue(w.endTime)}
                          </span>
                          {isMyFromShift && (
                            <span className="mt-1 rounded-full bg-warning-container px-2 py-0.5 text-[10px] font-medium text-on-warning-container">
                              Ca nguồn của bạn
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {swapEmptyWorkShiftId && (
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-on-surface-variant">Ngày muốn đổi sang</span>
                  <input
                    type="date"
                    min={minSwapDate}
                    max={maxSwapDate}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm"
                    value={swapEmptyDate}
                    onChange={(e) => {
                      setSwapEmptyDate(e.target.value)
                      fetchEmptyShiftOptions(swapEmptyWorkShiftId, e.target.value)
                    }}
                  />
                </label>
              )}

              {swapEmptyWorkShiftId && swapEmptyDate && (
                <div className="space-y-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
                  <p className="text-[11px] text-on-surface-variant">
                    {swapEmptyLoading
                      ? 'Đang kiểm tra xem ngày này có nhân viên nào giữ ca đó không…'
                      : swapEmptyShifts.length === 0
                        ? 'Chưa có nhân viên nào giữ ca này vào ngày đã chọn — đây là ca trống. Manager sẽ duyệt yêu cầu của bạn.'
                        : `Có ${swapEmptyShifts.length} nhân viên đang giữ ca này — nếu được duyệt, ca của bạn sẽ được gán sang workShift & ngày đó.`}
                  </p>
                  {!swapEmptyLoading && swapEmptyShifts.length > 0 && (
                    <ul className="space-y-1 text-xs text-on-surface-variant">
                      {swapEmptyShifts.map((s) => (
                        <li key={s.shiftAssignmentId}>
                          • {s.staffName || 'Nhân viên'} · {toTimeInputValue(s.startTime)} – {toTimeInputValue(s.endTime)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {(swapFromShift || swapToShift || swapEmptyWorkShiftId) && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase text-on-surface-variant">Lý do</span>
              <textarea
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                rows={3}
                value={swapForm.reason}
                onChange={(e) => setSwapForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Nhập lý do đổi ca (không bắt buộc)"
              />
            </label>
          )}

          {swapFromShift && (swapMode === 'other' ? swapToShift : (swapEmptyWorkShiftId && swapEmptyDate)) && (
            <div className="rounded-lg border border-primary/30 bg-primary-container/20 p-3 text-sm text-on-primary-container">
              {swapMode === 'other' ? (
                <>
                  <p>
                    Đổi từ <span className="font-semibold">{swapFromShift.shiftName}</span> ({formatDateTime(swapFromShift.workDate)}) →{' '}
                    <span className="font-semibold">{swapToShift.shiftName}</span> ({formatDateTime(swapToShift.workDate)})
                  </p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Ca đích sẽ được gửi về ID <span className="font-mono">{swapToShift.shiftAssignmentId}</span> — ca này sẽ do quản lý duyệt.
                  </p>
                </>
              ) : (
                (() => {
                  const target = workShiftCatalog.find(
                    (w) => String(w.workShiftId) === String(swapEmptyWorkShiftId),
                  )
                  return (
                    <>
                      <p>
                        Xin đổi từ <span className="font-semibold">{swapFromShift.shiftName}</span> ({formatDateTime(swapFromShift.workDate)}) →{' '}
                        ca trống <span className="font-semibold">{target?.shiftName || `Ca #${swapEmptyWorkShiftId}`}</span> ({swapEmptyDate})
                      </p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        Yêu cầu sẽ được quản lý duyệt. Nếu được duyệt, ca của bạn sẽ chuyển sang workShift và ngày đã chọn.
                      </p>
                    </>
                  )
                })()
              )}
            </div>
          )}
        </div>
      </FormModal>

      <FormModal
        open={laneSwapModalOpen}
        title="Đổi làn theo số điện thoại"
        submitLabel={saving ? 'Đang đổi…' : 'Đổi làn'}
        onClose={() => !saving && setLaneSwapModalOpen(false)}
        onSubmit={handleSwapLaneByPhone}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Số điện thoại nhân viên</span>
            <input
              type="tel"
              className="w-full rounded-lg border border-outline-variant px-3 py-2"
              value={laneSwapForm.targetPhoneNumber}
              onChange={(e) => setLaneSwapForm((f) => ({ ...f, targetPhoneNumber: e.target.value }))}
              placeholder="VD: 0901234567"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Ngày đổi làn</span>
            <input
              type="date"
              className="w-full rounded-lg border border-outline-variant px-3 py-2"
              value={laneSwapForm.date}
              onChange={(e) => setLaneSwapForm((f) => ({ ...f, date: e.target.value }))}
            />
          </label>
          <p className="text-xs text-on-surface-variant">
            Nếu bỏ trống ngày, hệ thống sẽ đổi làn cho hôm nay.
          </p>
        </div>
      </FormModal>
    </div>
  )
}
