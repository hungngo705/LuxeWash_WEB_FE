import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ApiError,
  createIncident,
  extendIncident,
  fetchManagerLanes,
  getBranchId,
  getIncident,
  getIncidentImpact,
  getStoredSession,
  listIncidents,
  previewIncident,
  resolveIncident,
} from '../../api'
import PageHeader from '../../components/admin/shared/PageHeader'
import { useToast } from '../../components/ui/Toast'

const TYPES = {
  LaneFailure: 'Hỏng buồng rửa',
  PowerOutage: 'Mất điện',
  WaterOutage: 'Mất nước',
  Other: 'Sự cố khác',
}

const inputClass = 'w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
const buttonClass = 'rounded-lg border border-outline-variant bg-white px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-50'
const primaryClass = 'rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50'

function vietnamNowInput(offsetMinutes = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(Date.now() + offsetMinutes * 60_000))
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
}

function newDraft() {
  return {
    type: 'LaneFailure',
    scope: 'SelectedLanes',
    laneIds: [],
    reason: '',
    estimatedEndAtVn: vietnamNowInput(120),
  }
}

// The current BE DTO uses DateTime rather than DateTimeOffset and compares it
// directly with TimeHelper.VnNow (a VN wall-clock DateTime). Send wall-clock
// ISO with no Z/offset so the server does not shift the ETA to UTC.
function vnWallClock(localValue) {
  return localValue ? `${localValue}:00` : ''
}

function vnInstant(localValue) {
  return Date.parse(`${localValue}:00+07:00`)
}

function formatVn(value) {
  if (!value) return '—'
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
  return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}` : String(value)
}

function toLocalInput(value) {
  const match = String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/)
  return match ? `${match[1]}T${match[2]}` : ''
}

function requestError(error, fallback) {
  if (error instanceof ApiError) {
    if (error.statusCode === 404) return 'Không tìm thấy dữ liệu sự cố hoặc API chưa được cập nhật trên backend đang kết nối.'
    if (error.statusCode === 409) return 'Dữ liệu lịch đặt đã thay đổi. Hãy xem ảnh hưởng lại trước khi xác nhận.'
    if (error.statusCode === 403) return 'Tài khoản này không có quyền Manager.'
    if (error.statusCode === 0) return 'Không kết nối được backend. Kiểm tra địa chỉ API và mạng.'
    return error.message || fallback
  }
  return error?.message || fallback
}

function Alert({ children, tone = 'warning' }) {
  const color = tone === 'error'
    ? 'border-error/30 bg-error-container/30 text-error'
    : 'border-amber-300 bg-amber-50 text-amber-950'
  return <div role="alert" className={`rounded-lg border px-4 py-3 text-sm ${color}`}>{children}</div>
}

export default function ManagerIncidentsPage() {
  const toast = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState(newDraft)
  const [lanes, setLanes] = useState([])
  const [lanesLoading, setLanesLoading] = useState(false)
  const [lanesError, setLanesError] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')
  const [page, setPage] = useState(1)
  const [incidents, setIncidents] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [impact, setImpact] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [impactError, setImpactError] = useState('')
  const [extensionOpen, setExtensionOpen] = useState(false)
  const [extensionEnd, setExtensionEnd] = useState('')
  const [extensionNote, setExtensionNote] = useState('')
  const [extensionError, setExtensionError] = useState('')
  const [extending, setExtending] = useState(false)
  const [resolveTargetId, setResolveTargetId] = useState(null)
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState('')
  const previewRequest = useRef(0)
  const listRequest = useRef(0)
  const detailRequest = useRef(0)

  const branchId = getBranchId(getStoredSession())

  const loadList = useCallback(async (targetPage) => {
    const request = ++listRequest.current
    setListLoading(true)
    setListError('')
    try {
      const data = await listIncidents(targetPage, 10)
      if (!Array.isArray(data?.items)) throw new Error('Backend trả danh sách sự cố không đúng định dạng.')
      if (request === listRequest.current) {
        setIncidents(data.items)
        setTotalCount(Number(data.totalCount) || 0)
      }
    } catch (error) {
      if (request === listRequest.current) setListError(requestError(error, 'Không tải được danh sách sự cố.'))
    } finally {
      if (request === listRequest.current) setListLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => loadList(page), 0)
    return () => clearTimeout(timer)
  }, [page, loadList])

  const loadDetail = useCallback(async (id) => {
    const request = ++detailRequest.current
    setDetailLoading(true)
    setDetailError('')
    setImpactError('')
    const [detailResult, impactResult] = await Promise.allSettled([getIncident(id), getIncidentImpact(id)])
    if (request !== detailRequest.current) return
    if (detailResult.status === 'fulfilled') setDetail(detailResult.value)
    else setDetailError(requestError(detailResult.reason, 'Không tải được chi tiết sự cố.'))
    if (impactResult.status === 'fulfilled' && Array.isArray(impactResult.value)) setImpact(impactResult.value)
    else setImpactError(impactResult.status === 'rejected' ? requestError(impactResult.reason, 'Không tải được lịch ảnh hưởng.') : 'Backend trả impact không đúng định dạng.')
    setDetailLoading(false)
  }, [])

  const selectIncident = (id) => {
    setSelectedId(id)
    setDetail(null)
    setImpact([])
    setExtensionOpen(false)
    setResolveTargetId(null)
    loadDetail(id)
  }

  const loadLanes = async () => {
    setLanesLoading(true)
    setLanesError('')
    try {
      const result = await fetchManagerLanes()
      setLanes(result.filter((lane) => lane.branchId === branchId))
    } catch (error) {
      setLanesError(requestError(error, 'Không tải được danh sách buồng rửa.'))
    } finally {
      setLanesLoading(false)
    }
  }

  const openForm = () => {
    ++previewRequest.current
    setDraft(newDraft())
    setPreview(null)
    setFormError('')
    setFormOpen(true)
    loadLanes()
  }

  const changeDraft = (patch) => {
    ++previewRequest.current
    setDraft((current) => ({ ...current, ...patch }))
    setPreview(null)
    setPreviewLoading(false)
    setFormError('')
  }

  const validateDraft = () => {
    if (!branchId) return 'Không xác định được chi nhánh của Manager. Hãy đăng nhập lại.'
    if (draft.scope === 'SelectedLanes' && draft.laneIds.length === 0) return 'Chọn ít nhất một buồng bị hỏng.'
    if (draft.reason.trim().length < 10) return 'Mô tả sự cố cần ít nhất 10 ký tự.'
    if (!draft.estimatedEndAtVn || !Number.isFinite(vnInstant(draft.estimatedEndAtVn))) return 'Chọn ETA hợp lệ.'
    if (vnInstant(draft.estimatedEndAtVn) <= Date.now()) return 'ETA phải sau thời điểm hiện tại.'
    return ''
  }

  const payload = () => ({
    branchId,
    type: draft.type,
    scope: draft.scope,
    laneIds: draft.scope === 'WholeBranch' ? [] : draft.laneIds,
    estimatedEndAtVn: vnWallClock(draft.estimatedEndAtVn),
  })

  const handlePreview = async () => {
    const error = validateDraft()
    if (error) { setFormError(error); return }
    const request = ++previewRequest.current
    setPreviewLoading(true)
    setPreview(null)
    setFormError('')
    try {
      const result = await previewIncident(payload())
      if (request === previewRequest.current) {
        if (!result || !Array.isArray(result.affectedBookings) || !result.expectedAffectedHash) throw new Error('Backend chưa trả expectedAffectedHash. Cần cập nhật backend trước khi tạo sự cố.')
        setPreview(result)
      }
    } catch (requestFailure) {
      if (request === previewRequest.current) setFormError(requestError(requestFailure, 'Không xem trước được ảnh hưởng.'))
    } finally {
      if (request === previewRequest.current) setPreviewLoading(false)
    }
  }

  const handleCreate = async () => {
    if (creating || !preview?.expectedAffectedHash || !Number.isInteger(preview.affectedBookingsCount)) return
    const error = validateDraft()
    if (error) { setFormError(error); setPreview(null); return }
    setCreating(true)
    setFormError('')
    try {
      const response = await createIncident({
        ...payload(),
        reason: draft.reason.trim(),
        expectedAffectedCount: preview.affectedBookingsCount,
        expectedAffectedHash: preview.expectedAffectedHash,
      })
      const id = Number(response?.incidentId)
      if (!Number.isInteger(id) || id <= 0) throw new Error('Backend không trả incidentId hợp lệ. Kiểm tra sự cố đã được tạo trước khi thử lại.')
      setFormOpen(false)
      setPreview(null)
      toast.success(`Đã ghi nhận sự cố #${id}.`)
      setPage(1)
      await loadList(1)
      selectIncident(id)
    } catch (requestFailure) {
      setFormError(requestError(requestFailure, 'Không tạo được sự cố.'))
      // A 409 means the count changed; any other failure may be ambiguous.
      // Require a fresh preview and keep the draft rather than auto-resubmit.
      setPreview(null)
    } finally {
      setCreating(false)
    }
  }

  const openExtension = () => {
    setExtensionEnd(toLocalInput(detail?.estimatedEndAtVn))
    setExtensionNote('')
    setExtensionError('')
    setExtensionOpen(true)
  }

  const handleExtend = async () => {
    if (extending || !detail || selectedId == null) return
    if (!extensionEnd || vnInstant(extensionEnd) <= Math.max(Date.now(), vnInstant(toLocalInput(detail.estimatedEndAtVn)))) {
      setExtensionError('ETA mới phải sau ETA hiện tại và sau thời điểm hiện tại.')
      return
    }
    if (extensionNote.trim().length < 10) {
      setExtensionError('Nhập lý do gia hạn ít nhất 10 ký tự.')
      return
    }
    setExtending(true)
    setExtensionError('')
    try {
      await extendIncident(selectedId, {
        newEstimatedEndAtVn: vnWallClock(extensionEnd),
        note: extensionNote.trim(),
      })
      setExtensionOpen(false)
      toast.success(`Đã gia hạn sự cố #${selectedId}.`)
      await Promise.all([loadList(page), loadDetail(selectedId)])
    } catch (requestFailure) {
      setExtensionError(requestError(requestFailure, 'Không thể gia hạn sự cố.'))
    } finally {
      setExtending(false)
    }
  }

  const handleResolve = async () => {
    if (resolveTargetId == null || resolving) return
    if (!canResolve) {
      setResolveError('Impact đã thay đổi hoặc trải qua nhiều ngày; hãy tải lại và liên hệ backend để xử lý an toàn.')
      return
    }
    setResolving(true)
    setResolveError('')
    try {
      await resolveIncident(resolveTargetId)
      setResolveTargetId(null)
      toast.success(`Đã ghi nhận khắc phục sự cố #${resolveTargetId}.`)
      await Promise.all([loadList(page), loadDetail(resolveTargetId)])
    } catch (requestFailure) {
      setResolveError(requestError(requestFailure, 'Không thể khắc phục sự cố.'))
    } finally {
      setResolving(false)
    }
  }

  // BE currently groups resolve capacity by slotId only, not by (date, slotId).
  // Keep this mutation unavailable when pending cases span multiple dates.
  const pendingImpact = impact.filter((item) => item.customerAction === 'AwaitingCustomer')
  const pendingDates = new Set(pendingImpact.map((item) => String(item.scheduledTime ?? '').slice(0, 10)))
  const canResolve = Boolean(detail && !detailLoading && !impactError &&
    pendingImpact.every((item) => /^\d{4}-\d{2}-\d{2}$/.test(String(item.scheduledTime ?? '').slice(0, 10))) &&
    pendingDates.size <= 1)

  return <div className="space-y-6">
    <PageHeader eyebrow="Điều hành chi nhánh" title="Sự cố chi nhánh" description="Báo sự cố buồng rửa, điện hoặc nước cho chi nhánh hiện tại." actionLabel="Báo sự cố" actionIcon="report_problem" onAction={openForm} />

    {formOpen && <section className="rounded-xl border border-outline-variant bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-sora text-lg font-semibold">Báo sự cố mới</h2><button type="button" className={buttonClass} disabled={creating} onClick={() => { ++previewRequest.current; setFormOpen(false) }}>Đóng</button></div>
      {formError && <div className="mb-4"><Alert tone="error">{formError}</Alert></div>}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">Loại sự cố<select className={`${inputClass} mt-1`} value={draft.type} onChange={(event) => changeDraft({ type: event.target.value })}>{Object.entries(TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-sm font-medium">Phạm vi<select className={`${inputClass} mt-1`} value={draft.scope} onChange={(event) => changeDraft({ scope: event.target.value, laneIds: [] })}><option value="SelectedLanes">Một hoặc nhiều buồng</option><option value="WholeBranch">Toàn chi nhánh</option></select></label>
        {draft.scope === 'SelectedLanes' && <div className="md:col-span-2"><p className="mb-2 text-sm font-medium">Buồng bị ảnh hưởng</p>{lanesError && <div className="mb-2"><Alert tone="error">{lanesError} <button type="button" className="underline" onClick={loadLanes}>Thử lại</button></Alert></div>}{lanesLoading ? <p className="text-sm text-on-surface-variant">Đang tải buồng rửa…</p> : <div className="flex flex-wrap gap-2">{lanes.map((lane) => <label key={lane.laneId} className="flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm"><input type="checkbox" checked={draft.laneIds.includes(lane.laneId)} disabled={!lane.isActive} onChange={(event) => changeDraft({ laneIds: event.target.checked ? [...draft.laneIds, lane.laneId] : draft.laneIds.filter((id) => id !== lane.laneId) })} />{lane.name}{!lane.isActive ? ' (không hoạt động)' : ''}</label>)}</div>}{!lanesLoading && !lanesError && lanes.length === 0 && <p className="text-sm text-on-surface-variant">Không có buồng nào để chọn.</p>}</div>}
        <label className="text-sm font-medium">Dự kiến khắc phục (giờ Việt Nam)<input type="datetime-local" className={`${inputClass} mt-1`} value={draft.estimatedEndAtVn} onChange={(event) => changeDraft({ estimatedEndAtVn: event.target.value })} /></label>
        <label className="text-sm font-medium md:col-span-2">Mô tả sự cố<textarea className={`${inputClass} mt-1 min-h-24`} maxLength={500} value={draft.reason} onChange={(event) => changeDraft({ reason: event.target.value })} placeholder="Mô tả nguyên nhân và tình trạng thực tế" /></label>
      </div>
      <p className="mt-3 text-xs text-on-surface-variant">Thời điểm bắt đầu do backend ghi nhận khi xác nhận; frontend gửi ETA theo giờ Việt Nam, không chuyển sang UTC.</p>
      {draft.scope === 'SelectedLanes' && <div className="mt-4"></div>}
      {preview && <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4"><h3 className="font-semibold">Ảnh hưởng ước tính từ backend</h3><div className="mt-2 flex flex-wrap gap-5 text-sm"><span>Lịch ảnh hưởng: <strong>{preview.affectedBookingsCount ?? preview.affectedBookings.length}</strong></span><span>Công suất mất ước tính: <strong>{preview.totalCapacityLoss ?? '—'}</strong></span></div>{preview.affectedBookings.length > 0 && <div className="mt-3 overflow-x-auto"><table className="min-w-[480px] w-full text-left text-sm"><thead><tr className="border-b border-outline-variant"><th className="p-2">Booking</th><th className="p-2">Biển số</th><th className="p-2">Giờ đặt</th><th className="p-2">Trọng số</th></tr></thead><tbody>{preview.affectedBookings.map((booking) => <tr key={booking.bookingId} className="border-b border-outline-variant/50"><td className="p-2">#{booking.bookingId}</td><td className="p-2">{booking.licensePlate || '—'}</td><td className="p-2">{booking.scheduledTime || '—'}</td><td className="p-2">{booking.capacityWeight ?? '—'}</td></tr>)}</tbody></table></div>}</div>}
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={previewLoading || creating || lanesLoading} onClick={handlePreview}>{previewLoading ? 'Đang tính…' : 'Xem ảnh hưởng'}</button><button type="button" className={primaryClass} disabled={!preview || !Number.isInteger(preview.affectedBookingsCount) || creating || previewLoading} onClick={handleCreate}>{creating ? 'Đang ghi nhận…' : 'Xác nhận sự cố'}</button></div>
    </section>}

    <section className="rounded-xl border border-outline-variant bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-sora text-lg font-semibold">Sự cố của chi nhánh</h2><button type="button" className={buttonClass} disabled={listLoading} onClick={() => loadList(page)}>Làm mới</button></div>
      {listError && <div className="mb-4"><Alert tone="error">{listError} <button type="button" className="underline" onClick={() => loadList(page)}>Thử lại</button></Alert></div>}
      {listLoading && incidents.length === 0 ? <p className="text-sm text-on-surface-variant">Đang tải sự cố…</p> : incidents.length === 0 ? (!listError && <p className="text-sm text-on-surface-variant">Chi nhánh chưa có sự cố.</p>) : <div className="overflow-x-auto"><table className="min-w-[820px] w-full text-left text-sm"><thead><tr className="border-b border-outline-variant text-on-surface-variant"><th className="p-2">Mã</th><th className="p-2">Loại</th><th className="p-2">Phạm vi</th><th className="p-2">Tạo lúc</th><th className="p-2">ETA</th><th className="p-2">Trạng thái</th><th className="p-2">Thao tác</th></tr></thead><tbody>{incidents.map((incident) => <tr key={incident.incidentId} className={`border-b border-outline-variant/50 ${selectedId === incident.incidentId ? 'bg-primary/5' : ''}`}><td className="p-2 font-semibold">#{incident.incidentId}</td><td className="p-2">{TYPES[incident.type] ?? incident.type}</td><td className="p-2">{incident.scope === 'WholeBranch' ? 'Toàn chi nhánh' : `${incident.laneIds?.length ?? 0} buồng`}</td><td className="p-2">{formatVn(incident.createdAtVn)}</td><td className="p-2">{formatVn(incident.estimatedEndAtVn)}</td><td className="p-2">{incident.status === 'Active' ? 'Đang xử lý' : incident.status === 'Resolved' ? 'Đã khắc phục' : incident.status}</td><td className="p-2"><button type="button" className="font-semibold text-primary underline" onClick={() => selectIncident(incident.incidentId)}>Xem chi tiết</button></td></tr>)}</tbody></table></div>}
      {totalCount > 10 && <div className="mt-4 flex items-center justify-end gap-3 text-sm"><button type="button" className={buttonClass} disabled={page <= 1 || listLoading} onClick={() => setPage((current) => current - 1)}>Trước</button><span>Trang {page} / {Math.ceil(totalCount / 10)}</span><button type="button" className={buttonClass} disabled={page >= Math.ceil(totalCount / 10) || listLoading} onClick={() => setPage((current) => current + 1)}>Sau</button></div>}
    </section>

    {selectedId != null && <section className="rounded-xl border border-outline-variant bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-sora text-lg font-semibold">Chi tiết sự cố #{selectedId}</h2><button type="button" className={buttonClass} disabled={detailLoading} onClick={() => loadDetail(selectedId)}>Làm mới chi tiết</button></div>
      {detailError && <div className="mb-3"><Alert tone="error">{detailError}</Alert></div>}
      {detailLoading && !detail && <p className="text-sm text-on-surface-variant">Đang tải chi tiết…</p>}
      {detail && <>
        <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4"><p><span className="text-on-surface-variant">Chi nhánh:</span> {detail.branchName || `#${detail.branchId}`}</p><p><span className="text-on-surface-variant">Trạng thái:</span> {detail.status === 'Active' ? 'Đang xử lý' : detail.status === 'Resolved' ? 'Đã khắc phục' : detail.status}</p><p><span className="text-on-surface-variant">Bắt đầu:</span> {formatVn(detail.createdAtVn)}</p><p><span className="text-on-surface-variant">ETA:</span> {formatVn(detail.estimatedEndAtVn)}</p></div>
        <p className="mt-3 text-sm"><span className="text-on-surface-variant">Loại:</span> {TYPES[detail.type] ?? detail.type} · <span className="text-on-surface-variant">Phạm vi:</span> {detail.scope === 'WholeBranch' ? 'Toàn chi nhánh' : (detail.laneIds?.map((id) => lanes.find((lane) => lane.laneId === id)?.name ?? `#${id}`).join(', ') || '—')}</p>
        <p className="mt-1 text-sm"><span className="text-on-surface-variant">Lý do:</span> {detail.reason}</p>
        {detail.resolvedAtVn && <p className="mt-1 text-sm"><span className="text-on-surface-variant">Khắc phục lúc:</span> {formatVn(detail.resolvedAtVn)}</p>}
        {detail.status === 'Active' && <><div className="mt-4 flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={extending || resolving} onClick={openExtension}>Gia hạn ETA</button><button type="button" className={primaryClass} disabled={!canResolve || extending || resolving} title={canResolve ? 'Đánh giá lại công suất và xử lý các lịch còn chờ' : 'Chỉ khả dụng khi impact tải thành công và các lịch còn chờ cùng một ngày'} onClick={() => { setResolveTargetId(selectedId); setResolveError('') }}>Xác nhận đã khắc phục</button></div>{!canResolve && <div className="mt-3"></div>}</>}
        {extensionOpen && <div className="mt-4 rounded-lg border border-outline-variant p-4"><h3 className="font-semibold">Gia hạn ETA</h3><p className="mt-1 text-sm text-on-surface-variant">Backend chưa có xem trước riêng cho gia hạn; lịch mới bị ảnh hưởng sẽ được tính và gửi thông báo khi lưu. Kiểm tra lại danh sách lịch sau khi gia hạn.</p>{extensionError && <div className="mt-3"><Alert tone="error">{extensionError}</Alert></div>}<div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm">ETA mới (giờ Việt Nam)<input type="datetime-local" className={`${inputClass} mt-1`} value={extensionEnd} onChange={(event) => setExtensionEnd(event.target.value)} /></label><label className="text-sm">Lý do gia hạn<input className={`${inputClass} mt-1`} maxLength={500} value={extensionNote} onChange={(event) => setExtensionNote(event.target.value)} /></label></div><div className="mt-3 flex gap-2"><button type="button" className={primaryClass} disabled={extending} onClick={handleExtend}>{extending ? 'Đang gia hạn…' : 'Xác nhận gia hạn'}</button><button type="button" className={buttonClass} disabled={extending} onClick={() => setExtensionOpen(false)}>Hủy</button></div></div>}
        {resolveTargetId === selectedId && <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4"><h3 className="font-semibold">Xác nhận sự cố đã được khắc phục?</h3><p className="mt-1 text-sm">Backend sẽ đánh giá lại {impact.filter((item) => item.customerAction === 'AwaitingCustomer').length} lịch còn chờ. Lịch đủ công suất được giữ, lịch vẫn thiếu chỗ có thể bị hủy/hoàn tiền. Chỉ xác nhận khi buồng đã hoạt động thực tế.</p>{resolveError && <div className="mt-3"><Alert tone="error">{resolveError}</Alert></div>}<div className="mt-3 flex gap-2"><button type="button" className={primaryClass} disabled={resolving} onClick={handleResolve}>{resolving ? 'Đang khắc phục…' : 'Xác nhận khắc phục'}</button><button type="button" className={buttonClass} disabled={resolving} onClick={() => setResolveTargetId(null)}>Hủy</button></div></div>}
      </>}
      <div className="mt-6"><h3 className="mb-2 font-semibold">Lịch đặt bị ảnh hưởng ({impact.length})</h3>{impactError && <div className="mb-3"><Alert tone="error">{impactError}</Alert></div>}{detailLoading && impact.length === 0 ? <p className="text-sm text-on-surface-variant">Đang tải lịch ảnh hưởng…</p> : impact.length === 0 ? (!impactError && <p className="text-sm text-on-surface-variant">Chưa có lịch bị ảnh hưởng.</p>) : <div className="overflow-x-auto"><table className="min-w-[850px] w-full text-left text-sm"><thead><tr className="border-b border-outline-variant text-on-surface-variant"><th className="p-2">Booking</th><th className="p-2">Biển số</th><th className="p-2">Giờ đặt</th><th className="p-2">Phản hồi</th><th className="p-2">Xử lý</th><th className="p-2">Hạn trả lời</th><th className="p-2">Đích chuyển</th></tr></thead><tbody>{impact.map((item) => <tr key={item.affectedBookingId} className="border-b border-outline-variant/50"><td className="p-2">#{item.bookingId}</td><td className="p-2">{item.licensePlate || '—'}</td><td className="p-2">{formatVn(item.scheduledTime)}</td><td className="p-2">{item.customerAction || '—'}</td><td className="p-2">{item.systemResolution || '—'}</td><td className="p-2">{formatVn(item.customerDeadlineVn)}</td><td className="p-2">{item.alternativeBranchId && item.alternativeBranchId !== '' ? `Chi nhánh #${item.alternativeBranchId}, slot ${item.alternativeTimeSlot}` : '—'}</td></tr>)}</tbody></table></div>}</div>
    </section>}
  </div>
}
