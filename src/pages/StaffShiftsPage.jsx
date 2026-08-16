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

/**
 * Trích xuất các ngày (YYYY-MM-DD) từ danh sách swap requests.
 * Dùng để gọi `available-shifts-for-swap?date=X` lấy các ca của Staff khác
 * nhằm hiển thị tên ca khi assignment không thuộc Staff đang login.
 * @param {Array<{ fromWorkDate?: string, toWorkDate?: string }>} swaps
 * @returns {string[]} danh sách date unique (YYYY-MM-DD)
 */
function collectDatesFromSwapRequests(swaps) {
  const out = new Set()
  for (const s of swaps) {
    for (const raw of [s.fromWorkDate, s.toWorkDate]) {
      const key = toDateInputValue(raw)
      if (key) out.add(key)
    }
  }
  return Array.from(out)
}

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
  const [laneSwapModalOpen, setLaneSwapModalOpen] = useState(false)
  const [laneSwapForm, setLaneSwapForm] = useState(emptyLaneSwapForm)
  const [saving, setSaving] = useState(false)
  const [workShiftCatalog, setWorkShiftCatalog] = useState([])
  // Cache assignments của Staff khác theo date — dùng để lookup tên ca
  // khi swap request liên quan tới assignment không thuộc Staff đang login.
  const [otherStaffAssignments, setOtherStaffAssignments] = useState([])

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

      // Với mỗi swap request, nếu assignment không thuộc Staff đang login
      // (vd. Staff khác gửi swap tới mình, hoặc mình là người gửi đổi với Staff khác),
      // ta fetch `available-shifts-for-swap?date=X` để lấy shiftName từ assignment id.
      const otherDates = collectDatesFromSwapRequests(swaps)
      const otherLists = await Promise.all(
        otherDates.map((d) =>
          fetchStaffAvailableShiftsForSwap({ date: d }).catch(() => []),
        ),
      )
      const merged = []
      const seen = new Set()
      for (const list of otherLists) {
        for (const item of list) {
          const key = item.shiftAssignmentId
          if (seen.has(key)) continue
          seen.add(key)
          merged.push(item)
        }
      }
      setOtherStaffAssignments(merged)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được lịch ca')
      setOtherStaffAssignments([])
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
      // Chỉ lấy ca của nhân viên khác trong ngày đã chọn — form đổi ca
      // hiện chỉ hỗ trợ đổi chéo với nhân viên khác, không cho đổi với
      // chính mình hay đổi qua ca trống.
      const otherStaffShifts = await fetchStaffAvailableShiftsForSwap({
        date: toDateInputValue(date),
      }).catch(() => [])
      const today = swapHorizonStart.getTime()
      const isFutureScheduled = (s) => {
        const d = new Date(s.workDate)
        if (Number.isNaN(d.getTime())) return false
        d.setHours(0, 0, 0, 0)
        return d.getTime() >= today && s.status === 'Scheduled'
      }
      // Lọc bỏ ca đã qua / đã hủy
      const otherFuture = otherStaffShifts.filter(isFutureScheduled)
      setSwapTargetShifts(otherFuture)
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
    if (!swapToShift) {
      showToast('Vui lòng chọn ca đích')
      return
    }
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
    setSaving(true)
    try {
      await createStaffShiftSwapRequest({
        fromAssignmentId: swapFromShift.shiftAssignmentId,
        toAssignmentId: swapToShift.shiftAssignmentId,
        reason: swapForm.reason,
      })
      showToast('Đã gửi yêu cầu đổi ca')
      setSwapModalOpen(false)
      setSwapForm(emptySwapForm)
      setSwapFromDate(null)
      setSwapToDate(null)
      setSwapFromShift(null)
      setSwapToShift(null)
      setSwapTargetShifts([])
      await loadAll()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không gửi được yêu cầu')
    } finally {
      setSaving(false)
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
    if (!swapFromShift) return 'Bước 1: Chọn ca cần đổi — ca của bạn muốn đổi đi'
    if (!swapFromDate) return 'Bước 2: Chọn ngày muốn đổi sang'
    if (!swapToShift) return 'Bước 3: Chọn ca của nhân viên khác muốn đổi sang'
    return 'Đã chọn xong. Có thể bấm "Chọn lại từ đầu" để thao tác lại.'
  })()

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
          {swapRequests.map((req) => {
            // Lookup tên ca từ dữ liệu đã load để hiển thị thân thiện
            // thay vì fallback "Ca #13", "Ca #null".
            // Priority:
            //  1. Từ `shifts` (assignment của Staff đang login) — có shiftName sẵn
            //  2. Từ `otherStaffAssignments` (assignment của Staff khác, fetch qua
            //     `available-shifts-for-swap?date=X`) — bao gồm ca của Staff khác
            //     trong swap request
            //  3. Từ `workShiftCatalog` (toàn bộ work shifts Manager đã tạo)
            //     bằng cách match qua assignment.workShiftId
            //  4. Fallback "Ca #X" nếu id hợp lệ, "Ca" nếu không
            const allKnownAssignments = shifts.concat(otherStaffAssignments)
            const fromAssign = allKnownAssignments.find(
              (s) => s.shiftAssignmentId === req.fromAssignmentId,
            )
            const toAssign = req.toAssignmentId != null
              ? allKnownAssignments.find((s) => s.shiftAssignmentId === req.toAssignmentId)
              : null
            const isEmptyMode = req.toAssignmentId == null && req.toWorkShiftId != null
            const targetWorkShift = isEmptyMode
              ? workShiftCatalog.find((w) => w.workShiftId === req.toWorkShiftId)
              : workShiftCatalog.find((w) => w.workShiftId === toAssign?.workShiftId)
            const fromWorkShiftCatalog = workShiftCatalog.find(
              (w) => w.workShiftId === fromAssign?.workShiftId,
            )
            const fromShift =
              fromAssign?.shiftName ||
              fromWorkShiftCatalog?.shiftName ||
              (req.fromAssignmentId ? `Ca #${req.fromAssignmentId}` : 'Ca')
            const toShift = isEmptyMode
              ? (targetWorkShift?.shiftName || 'Ca trống')
              : (toAssign?.shiftName ||
                targetWorkShift?.shiftName ||
                (req.toAssignmentId ? `Ca #${req.toAssignmentId}` : 'Ca trống'))
            const fromDate = fromAssign?.workDate || req.fromWorkDate || ''
            const toDate = isEmptyMode
              ? (req.toWorkDate || '')
              : (toAssign?.workDate || req.toWorkDate || '')
            return (
              <div
                key={req.shiftSwapRequestId}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-on-surface">
                      Đổi từ <span className="font-medium">{fromShift}</span>{' '}
                      ({fromDate ? formatDateTime(fromDate) : '—'}) sang{' '}
                      <span className="font-medium">{toShift}</span>{' '}
                      ({toDate ? formatDateTime(toDate) : '—'})
                    </p>
                    {req.reason && <p className="mt-1 text-sm text-on-surface-variant">{req.reason}</p>}
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              </div>
            )
          })}
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
              <li>Bước 1: chọn ca cần đổi — ca của bạn muốn đổi đi.</li>
              <li>Bước 2: chọn ngày có ca muốn đổi sang.</li>
              <li>Bước 3: chọn ca của nhân viên khác muốn đổi sang. Chỉ hiển thị ca của nhân viên khác trong ngày.</li>
              <li>Lưu ý: Không được chọn ngày cần đổi với ngày đổi giống nhau</li>
              <li>Sau khi gửi, manager sẽ duyệt yêu cầu.</li>
            </ul>
          </div>

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
                        Chưa có nhân viên nào khác giữ ca trong ngày{' '}
                        <span className="font-medium">{formatDateTime(swapToDate)}</span>.
                      </p>
                      <p>Hãy chọn ngày khác.</p>
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {swapTargetShifts.map((s) => {
                        const isCurrentFromShift =
                          swapFromShift && s.shiftAssignmentId === swapFromShift.shiftAssignmentId
                        const fromKey = toDateInputValue(swapFromShift?.workDate)
                        const sKey = toDateInputValue(s.workDate)
                        const isSameShiftSameDay =
                          swapFromShift?.workShiftId != null &&
                          s.workShiftId === swapFromShift.workShiftId &&
                          fromKey === sKey
                        const disabled = Boolean(isCurrentFromShift || isSameShiftSameDay)
                        const selected = swapToShift?.shiftAssignmentId === s.shiftAssignmentId
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
                            <span className="font-medium">{s.shiftName}</span>
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

          {(swapFromShift || swapToShift) && (
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

          {swapFromShift && swapToShift && (
            <div className="rounded-lg border border-primary/30 bg-primary-container/20 p-3 text-sm text-on-primary-container">
              <p>
                Đổi từ <span className="font-semibold">{swapFromShift.shiftName}</span> ({formatDateTime(swapFromShift.workDate)}) →{' '}
                <span className="font-semibold">{swapToShift.shiftName}</span> ({formatDateTime(swapToShift.workDate)})
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Ca đích sẽ được gửi về ID <span className="font-mono">{swapToShift.shiftAssignmentId}</span> — ca này sẽ do quản lý duyệt.
              </p>
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
