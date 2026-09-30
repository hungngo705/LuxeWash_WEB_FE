import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  fetchBookingDetail,
  fetchBusinessIncidentOptions,
  submitBusinessIncidentDecision,
} from '../../api/business.api'
import { formatDateTime, formatVnd } from '../../utils/format'

function parseBackendDate(value) {
  if (!value) return null
  const normalized = String(value).includes('T')
    ? String(value)
    : String(value).replace(' ', 'T')
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function displayDate(value) {
  const parsed = parseBackendDate(value)
  return parsed ? formatDateTime(parsed.toISOString()) : value || '—'
}

function statusLabel(status) {
  const labels = {
    AwaitingCustomer: 'Đang chờ doanh nghiệp xử lý',
    Transferred: 'Đã chuyển chi nhánh',
    Cancelled: 'Đã hủy do sự cố',
    Kept: 'Giữ nguyên lịch',
    NeedsManualHandling: 'Cần liên hệ quản lý',
  }
  return labels[status] ?? status ?? '—'
}

function refundDestinationLabel(destination) {
  const labels = {
    BusinessCredit: 'hạn mức tháng của doanh nghiệp',
    Wallet: 'ví LuxeWash',
  }
  return labels[destination] ?? destination ?? 'tài khoản'
}

function errorMessage(error) {
  const backendMessage = error?.body?.message ?? error?.message
  const code = error?.body?.errorCode ?? error?.body?.code ?? backendMessage
  if (code === 'DESTINATION_CAPACITY_CHANGED') {
    return 'Khung giờ vừa được người khác đặt. Danh sách đã được tải lại, vui lòng chọn lại.'
  }
  if (code === 'INCIDENT_VERSION_CHANGED') {
    return 'Thông tin sự cố vừa thay đổi. Vui lòng kiểm tra lại lựa chọn mới.'
  }
  if (code === 'DECISION_ALREADY_FINAL') {
    return 'Lịch này đã được xử lý trước đó.'
  }
  return error?.message || 'Không thể xử lý lịch do sự cố. Vui lòng thử lại.'
}

export default function BusinessIncidentResolutionPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [options, setOptions] = useState(null)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState('')
  const [pendingDecision, setPendingDecision] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [bookingResult, optionResult] = await Promise.all([
        fetchBookingDetail(id),
        fetchBusinessIncidentOptions(id),
      ])
      setBooking(bookingResult)
      setOptions(optionResult)
      setSelected(null)
      setPendingDecision('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    // Initial data loading intentionally owns the page-level loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const alternativesByBranch = useMemo(() => {
    const groups = new Map()
    for (const item of options?.alternatives ?? []) {
      const current = groups.get(item.branchId) ?? {
        branchId: item.branchId,
        branchName: item.branchName,
        slots: [],
      }
      current.slots.push(item)
      groups.set(item.branchId, current)
    }
    return [...groups.values()]
  }, [options])

  const confirmationMessage = (decision) => {
    const confirmations = {
      Cancel: 'Hủy lịch này do sự cố? Khoản cam kết sẽ được giải phóng khỏi hạn mức tháng.',
      Keep: 'Giữ nguyên lịch tại chi nhánh và khung giờ ban đầu?',
      Transfer: selected
        ? `Chuyển xe sang ${selected.branchName}, khung giờ ${selected.startAt}–${selected.endAt}?`
        : '',
    }
    return confirmations[decision] ?? 'Xác nhận lựa chọn này?'
  }

  const requestDecision = (decision) => {
    if (decision === 'Transfer' && !selected) {
      setError('Vui lòng chọn chi nhánh và khung giờ muốn chuyển đến.')
      return
    }
    setError('')
    setPendingDecision(decision)
  }

  const submit = async (decision) => {
    setPendingDecision('')
    setSubmitting(decision)
    setError('')
    try {
      await submitBusinessIncidentDecision(id, {
        incidentId: Number(options.incidentId),
        caseId: Number(options.caseId),
        expectedVersion: Number(options.version),
        decision,
        targetBranchId: decision === 'Transfer' ? Number(selected.branchId) : null,
        targetSlotId: decision === 'Transfer' ? Number(selected.slotId) : null,
      })
      navigate(`/business/bookings/${id}`, {
        replace: true,
        state: {
          successMessage:
            decision === 'Transfer'
              ? 'Đã chuyển lịch sang chi nhánh mới. Giá dịch vụ được giữ nguyên.'
              : decision === 'Keep'
                ? 'Đã giữ nguyên lịch. Xe vẫn được phục vụ tại chi nhánh cũ.'
                : 'Đã hủy lịch do sự cố và giải phóng khoản cam kết khỏi hạn mức tháng.',
        },
      })
    } catch (err) {
      const message = errorMessage(err)
      if ([409, 400].includes(err?.status)) await load()
      setError(message)
    } finally {
      setSubmitting('')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-on-surface-variant">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        Đang tải phương án xử lý sự cố…
      </div>
    )
  }

  if (!options) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Link to={`/business/bookings/${id}`} className="text-sm font-semibold text-primary hover:underline">
          ← Quay lại chi tiết lịch
        </Link>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6">
          <h2 className="font-sora text-xl font-semibold text-on-surface">Lịch không còn yêu cầu xử lý</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            {error || 'Không tìm thấy sự cố đang ảnh hưởng tới lịch này.'}
          </p>
        </div>
      </div>
    )
  }

  const allowed = new Set(options.allowedActions ?? [])
  const isPending = options.caseStatus === 'AwaitingCustomer'
  const refund = options.refundPreview ?? {}
  const voucherMessage =
    options.voucherTerms?.message ||
    (options.voucherTerms?.isEligible
      ? `Bạn được nhận voucher giảm ${options.voucherTerms.discountPercent ?? 20}% theo chính sách sự cố.`
      : 'Lịch Fleet không phát hành voucher cá nhân.')

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={`/business/bookings/${id}`} className="text-sm font-semibold text-primary hover:underline">
            ← Quay lại chi tiết lịch
          </Link>
          <h2 className="mt-2 font-sora text-2xl font-semibold text-on-surface">Xử lý lịch do sự cố</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Xe {booking?.licensePlate || options.originalBooking?.licensePlate || '—'} · Lịch #{id}
          </p>
        </div>
        <span className="rounded-full border border-tertiary/30 bg-tertiary-container/25 px-3 py-1.5 text-xs font-semibold text-tertiary">
          {statusLabel(options.caseStatus)}
        </span>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-error/30 bg-error-container/20 px-4 py-3 text-sm text-error">
          <span>{error}</span>
          <button type="button" onClick={load} className="shrink-0 font-semibold underline">Tải lại</button>
        </div>
      )}


      {location.state?.warningMessage && (
        <div className="rounded-xl border border-tertiary/30 bg-tertiary-container/20 px-4 py-3 text-sm font-medium text-on-tertiary-container">
          {location.state.warningMessage}
        </div>
      )}

      <section className="grid gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Lịch ban đầu</p>
          <p className="mt-1 font-semibold text-on-surface">{displayDate(options.originalBooking?.scheduledTime)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Dự kiến khắc phục</p>
          <p className="mt-1 font-semibold text-on-surface">{displayDate(options.eta)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Nguyên nhân</p>
          <p className="mt-1 text-sm text-on-surface">{options.reason || 'Sự cố tại chi nhánh'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Hạn phản hồi</p>
          <p className="mt-1 text-sm font-semibold text-error">{displayDate(options.responseDeadlineAt)}</p>
        </div>
      </section>

      <div className="rounded-2xl border border-primary/25 bg-primary-container/10 p-5">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-primary">corporate_fare</span>
          <div>
            <h3 className="font-semibold text-on-surface">Chính sách dành cho doanh nghiệp</h3>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              Hủy lịch sẽ giải phóng {formatVnd(refund.amount ?? booking?.finalAmount ?? 0)} khỏi hạn mức cam kết tháng.
              Chuyển chi nhánh giữ nguyên giá và dịch vụ đã đặt. {voucherMessage}
            </p>
          </div>
        </div>
      </div>

      {!isPending ? (
        <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined rounded-full bg-primary/10 p-2 text-primary">task_alt</span>
            <div className="min-w-0 flex-1">
              <h3 className="font-sora text-lg font-semibold text-on-surface">Kết quả xử lý</h3>
              <p className="mt-1 font-semibold text-primary">{statusLabel(options.caseStatus)}</p>
              {options.caseStatus === 'Transferred' && (
                <div className="mt-3 space-y-1 text-sm text-on-surface-variant">
                  <p>Chi nhánh mới: <span className="font-semibold text-on-surface">{options.targetBranchName || `#${options.targetBranchId ?? '—'}`}</span></p>
                  <p>Khung giờ mới: <span className="font-semibold text-on-surface">{options.targetScheduledTime ? displayDate(options.targetScheduledTime) : options.targetSlotLabel || `#${options.targetSlotId ?? '—'}`}</span></p>
                </div>
              )}
              {options.caseStatus === 'Cancelled' && (
                <p className="mt-3 text-sm text-on-surface-variant">
                  Đã giải phóng <span className="font-semibold text-on-surface">{formatVnd(refund.amount ?? booking?.finalAmount ?? 0)}</span> về {refundDestinationLabel(refund.destination)}.
                </p>
              )}
              {options.caseStatus === 'Kept' && (
                <p className="mt-3 text-sm text-on-surface-variant">
                  Xe vẫn được phục vụ tại chi nhánh và khung giờ ban đầu.
                </p>
              )}
              {options.caseStatus === 'NeedsManualHandling' && (
                <p className="mt-3 text-sm text-on-surface-variant">
                  Quản lý chi nhánh sẽ liên hệ để hỗ trợ phương án phù hợp.
                </p>
              )}
              <p className="mt-3 text-xs text-on-surface-variant">Quyết định đã hoàn tất và không thể thay đổi.</p>
              <Link
                to={`/business/bookings/${id}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Xem chi tiết lịch
                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            {allowed.has('Keep') && (
              <section className="rounded-2xl border border-primary/30 bg-primary-container/10 p-5">
                <h3 className="font-sora text-lg font-semibold text-on-surface">Giữ nguyên lịch</h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Sự cố đã được khắc phục và chi nhánh xác nhận vẫn đủ khả năng phục vụ lịch ban đầu.
                </p>
                <button
                  type="button"
                  disabled={Boolean(submitting)}
                  onClick={() => requestDecision('Keep')}
                  className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting === 'Keep' ? 'Đang xác nhận…' : 'Giữ nguyên lịch'}
                </button>
              </section>
            )}

            {allowed.has('Cancel') && (
              <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
                <h3 className="font-sora text-lg font-semibold text-on-surface">Hủy lịch</h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Không tính phí hủy. Khoản cam kết của lịch này được loại khỏi hạn mức đã sử dụng trong tháng.
                </p>
                <button
                  type="button"
                  disabled={Boolean(submitting)}
                  onClick={() => requestDecision('Cancel')}
                  className="mt-5 w-full rounded-xl border border-error/40 px-4 py-2.5 text-sm font-semibold text-error transition-colors hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting === 'Cancel' ? 'Đang hủy…' : 'Hủy lịch do sự cố'}
                </button>
              </section>
            )}
          </div>

          {allowed.has('Transfer') && (
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
            <h3 className="font-sora text-lg font-semibold text-on-surface">Chuyển sang chi nhánh khác</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Chỉ hiển thị chi nhánh có dịch vụ, loại xe, buồng doanh nghiệp và công suất phù hợp.
            </p>

            {alternativesByBranch.length === 0 ? (
              <div className="mt-4 rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                Hiện chưa có chi nhánh khác còn chỗ phù hợp. Bạn có thể tải lại hoặc chọn hủy lịch.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {alternativesByBranch.map((branch) => (
                  <div key={branch.branchId} className="rounded-xl border border-outline-variant p-4">
                    <p className="font-semibold text-on-surface">{branch.branchName}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {branch.slots.map((slot) => {
                        const active = selected?.branchId === slot.branchId && selected?.slotId === slot.slotId
                        return (
                          <button
                            key={`${slot.branchId}-${slot.slotId}`}
                            type="button"
                            onClick={() => setSelected(slot)}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                              active
                                ? 'border-primary bg-primary text-on-primary'
                                : 'border-outline-variant text-on-surface hover:border-primary hover:text-primary'
                            }`}
                          >
                            {slot.startAt}–{slot.endAt}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              disabled={!selected || Boolean(submitting)}
              onClick={() => requestDecision('Transfer')}
              className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting === 'Transfer' ? 'Đang chuyển…' : 'Xác nhận chuyển chi nhánh'}
            </button>
          </section>
          )}

          {[...allowed].some((action) => !['Cancel', 'Transfer', 'Keep'].includes(action)) && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant">
              Hệ thống có phương án xử lý mới. Vui lòng tải lại ứng dụng hoặc liên hệ quản lý chi nhánh để được hỗ trợ.
            </div>
          )}
        </div>
      )}

      {pendingDecision && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="incident-confirmation-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined rounded-full bg-primary/10 p-2 text-primary">help</span>
              <div>
                <h3 id="incident-confirmation-title" className="font-sora text-lg font-semibold text-on-surface">
                  Xác nhận phương án xử lý
                </h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {confirmationMessage(pendingDecision)}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDecision('')}
                className="rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() => submit(pendingDecision)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
                  pendingDecision === 'Cancel' ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary/90'
                }`}
              >
                Đồng ý xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
