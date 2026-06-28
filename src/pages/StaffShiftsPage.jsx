import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createStaffOvertimeRequest,
  createStaffShiftSwapRequest,
  fetchStaffOvertimeRequests,
  fetchStaffShifts,
  fetchStaffShiftSwapRequests,
  swapStaffLaneByPhone,
  toTimeInputValue,
} from '../api'
import EmptyState from '../components/admin/shared/EmptyState'
import FormModal from '../components/admin/shared/FormModal'
import PageHeader from '../components/admin/shared/PageHeader'
import StatusBadge from '../components/admin/shared/StatusBadge'
import { formatDateTime } from '../utils/format'

const TABS = [
  { id: 'schedule', label: 'Lịch ca' },
  { id: 'overtime', label: 'Tăng ca' },
  { id: 'swap', label: 'Đổi ca' },
]

const emptyOvertimeForm = { workDate: '', startTime: '17:00', endTime: '20:00', reason: '' }
const emptySwapForm = { fromAssignmentId: '', toAssignmentId: '', reason: '' }
const emptyLaneSwapForm = { targetPhoneNumber: '', date: '' }

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
  const [laneSwapModalOpen, setLaneSwapModalOpen] = useState(false)
  const [laneSwapForm, setLaneSwapForm] = useState(emptyLaneSwapForm)
  const [saving, setSaving] = useState(false)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadAll = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [shiftList, overtime, swaps] = await Promise.all([
        fetchStaffShifts(shiftFilter),
        fetchStaffOvertimeRequests(),
        fetchStaffShiftSwapRequests(),
      ])
      setShifts(shiftList)
      setOvertimeRequests(overtime)
      setSwapRequests(swaps)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được lịch ca')
    } finally {
      setLoading(false)
    }
  }, [shiftFilter])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleCreateOvertime = async () => {
    if (!overtimeForm.workDate) {
      showToast('Vui lòng chọn ngày tăng ca')
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

  const handleCreateSwap = async () => {
    if (!swapForm.fromAssignmentId || !swapForm.toAssignmentId) {
      showToast('Vui lòng chọn ca nguồn và ca đích')
      return
    }
    setSaving(true)
    try {
      await createStaffShiftSwapRequest(swapForm)
      showToast('Đã gửi yêu cầu đổi ca')
      setSwapModalOpen(false)
      setSwapForm(emptySwapForm)
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
            ? () => setSwapModalOpen(true)
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
        shifts.length === 0 ? (
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
        )
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
                <p className="text-sm text-on-surface">
                  Ca #{req.fromAssignmentId} → Ca #{req.toAssignmentId}
                </p>
                <StatusBadge status={req.status} />
              </div>
              {req.reason && <p className="mt-1 text-sm text-on-surface-variant">{req.reason}</p>}
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
        onClose={() => !saving && setSwapModalOpen(false)}
        onSubmit={handleCreateSwap}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Ca của tôi</span>
            <select
              className="w-full rounded-lg border border-outline-variant px-3 py-2"
              value={swapForm.fromAssignmentId}
              onChange={(e) => setSwapForm((f) => ({ ...f, fromAssignmentId: e.target.value }))}
            >
              <option value="">— Chọn —</option>
              {shifts.map((s) => (
                <option key={s.shiftAssignmentId} value={s.shiftAssignmentId}>
                  {s.shiftName} · {formatDateTime(s.workDate)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Ca muốn đổi sang (ID)</span>
            <input
              type="number"
              className="w-full rounded-lg border border-outline-variant px-3 py-2"
              value={swapForm.toAssignmentId}
              onChange={(e) => setSwapForm((f) => ({ ...f, toAssignmentId: e.target.value }))}
              placeholder="Nhập ID phân ca đích"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Lý do</span>
            <textarea
              className="w-full rounded-lg border border-outline-variant px-3 py-2"
              rows={3}
              value={swapForm.reason}
              onChange={(e) => setSwapForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </label>
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
