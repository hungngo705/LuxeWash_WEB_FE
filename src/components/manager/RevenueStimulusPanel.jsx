import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  approveRevenueStimulusProposal,
  checkManagerRevenueStimulus,
  fetchRevenueStimulusProposals,
  generateComprehensiveRevenueProposals,
  modifyRevenueStimulusProposal,
  rejectRevenueStimulusProposal,
} from '../../api'
import { formatVnd } from '../../utils/format'

function currentPeriod() {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

function ProposalModal({ proposal, mode, busy, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    code: proposal?.code ?? '',
    discountAmount: proposal?.discountAmount ?? 0,
    maxUsages: proposal?.maxUsages ?? 1,
    expiryDays: proposal?.expiryDays ?? 30,
    proposalNote: proposal?.proposalNote ?? '',
    rejectReason: '',
  }))

  const isReject = mode === 'reject'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault()
          onSave(form)
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-sora text-lg font-semibold text-on-surface">
              {isReject ? 'Từ chối đề xuất' : 'Chỉnh sửa đề xuất voucher'}
            </h3>
            <p className="mt-1 text-xs text-on-surface-variant">{proposal?.code}</p>
          </div>
          <button type="button" className="text-on-surface-variant" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {isReject ? (
          <label className="block text-sm text-on-surface">
            Lý do từ chối
            <textarea
              className="mt-2 min-h-28 w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2"
              value={form.rejectReason}
              onChange={(event) => setForm((value) => ({ ...value, rejectReason: event.target.value }))}
              placeholder="Ví dụ: Doanh thu giảm do chi nhánh bảo trì..."
            />
          </label>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-on-surface sm:col-span-2">
              Mã voucher
              <input
                className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 font-mono"
                value={form.code}
                onChange={(event) => setForm((value) => ({ ...value, code: event.target.value.toUpperCase() }))}
                required
              />
            </label>
            <label className="text-sm text-on-surface">
              Mức giảm (%)
              <input
                type="number"
                min="1"
                max="100"
                className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2"
                value={form.discountAmount}
                onChange={(event) => setForm((value) => ({ ...value, discountAmount: event.target.value }))}
                required
              />
            </label>
            <label className="text-sm text-on-surface">
              Số lượt tối đa
              <input
                type="number"
                min="1"
                className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2"
                value={form.maxUsages}
                onChange={(event) => setForm((value) => ({ ...value, maxUsages: event.target.value }))}
                required
              />
            </label>
            <label className="text-sm text-on-surface">
              Hết hạn sau (ngày)
              <input
                type="number"
                min="1"
                className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2"
                value={form.expiryDays}
                onChange={(event) => setForm((value) => ({ ...value, expiryDays: event.target.value }))}
                required
              />
            </label>
            <label className="text-sm text-on-surface sm:col-span-2">
              Ghi chú phân tích
              <textarea
                className="mt-1 min-h-24 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2"
                value={form.proposalNote}
                onChange={(event) => setForm((value) => ({ ...value, proposalNote: event.target.value }))}
              />
            </label>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg border border-outline-variant px-4 py-2 text-sm" onClick={onClose}>
            Hủy
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
              isReject ? 'bg-error text-on-error' : 'bg-primary text-on-primary'
            }`}
          >
            {busy ? 'Đang lưu…' : isReject ? 'Xác nhận từ chối' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function RevenueStimulusPanel() {
  const [period, setPeriod] = useState(currentPeriod)
  const [analysis, setAnalysis] = useState(null)
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState('')
  const [actionId, setActionId] = useState(null)
  const [modal, setModal] = useState(null)
  const [message, setMessage] = useState(null)

  const loadProposals = useCallback(async () => {
    setLoading(true)
    try {
      setProposals(await fetchRevenueStimulusProposals())
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof ApiError
          ? `Không kết nối được AI local: ${error.message}`
          : 'Không tải được đề xuất voucher.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial AI proposal load
    loadProposals()
  }, [loadProposals])

  const runAnalysis = async (comprehensive) => {
    setRunning(comprehensive ? 'comprehensive' : 'revenue')
    setMessage(null)
    try {
      const result = comprehensive
        ? await generateComprehensiveRevenueProposals(period)
        : await checkManagerRevenueStimulus(period)
      if (comprehensive) setAnalysis(result)
      setMessage({ type: 'success', text: result?.message || 'Đã hoàn tất phân tích.' })
      await loadProposals()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof ApiError ? error.message : 'Phân tích thất bại.' })
    } finally {
      setRunning('')
    }
  }

  const performProposalAction = async (proposal, action, payload) => {
    setActionId(proposal.voucherId)
    try {
      if (action === 'approve') await approveRevenueStimulusProposal(proposal.voucherId)
      if (action === 'modify') {
        await modifyRevenueStimulusProposal(proposal.voucherId, {
          code: payload.code.trim(),
          discountAmount: Number(payload.discountAmount),
          maxUsages: Number(payload.maxUsages),
          expiryDays: Number(payload.expiryDays),
          proposalNote: payload.proposalNote.trim() || null,
        })
      }
      if (action === 'reject') {
        await rejectRevenueStimulusProposal(proposal.voucherId, payload.rejectReason)
      }
      setModal(null)
      setMessage({
        type: 'success',
        text: action === 'approve' ? 'Voucher đã được phê duyệt và phát hành.' : 'Đã cập nhật đề xuất.',
      })
      await loadProposals()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof ApiError ? error.message : 'Thao tác thất bại.' })
    } finally {
      setActionId(null)
    }
  }

  const traffic = analysis?.trafficAndCustomerStats

  return (
    <section className="mt-6 rounded-2xl border border-secondary/30 bg-secondary/5 p-5">
      {modal && (
        <ProposalModal
          proposal={modal.proposal}
          mode={modal.mode}
          busy={actionId === modal.proposal.voucherId}
          onClose={() => setModal(null)}
          onSave={(payload) => performProposalAction(modal.proposal, modal.mode, payload)}
        />
      )}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">psychology</span>
            <h2 className="font-sora text-lg font-semibold text-on-surface">AI kích cầu doanh thu</h2>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            Phân tích chạy trên backend AI local; voucher luôn ở trạng thái chờ duyệt trước khi phát hành.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm"
            value={period.month}
            onChange={(event) => setPeriod((value) => ({ ...value, month: Number(event.target.value) }))}
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>Tháng {index + 1}</option>
            ))}
          </select>
          <input
            type="number"
            min="2020"
            max="2100"
            className="w-24 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm"
            value={period.year}
            onChange={(event) => setPeriod((value) => ({ ...value, year: Number(event.target.value) }))}
          />
          <button
            type="button"
            disabled={Boolean(running)}
            className="rounded-lg border border-secondary px-3 py-2 text-sm font-semibold text-secondary disabled:opacity-50"
            onClick={() => runAnalysis(false)}
          >
            {running === 'revenue' ? 'Đang kiểm tra…' : 'Kiểm tra doanh thu'}
          </button>
          <button
            type="button"
            disabled={Boolean(running)}
            className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-on-secondary disabled:opacity-50"
            onClick={() => runAnalysis(true)}
          >
            {running === 'comprehensive' ? 'AI đang phân tích…' : 'Phân tích & đề xuất AI'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
          message.type === 'error'
            ? 'border-error/40 bg-error-container/20 text-error'
            : 'border-primary/30 bg-primary/10 text-primary'
        }`}>
          {message.text}
        </div>
      )}

      {analysis && (
        <div className="mt-5">
          <p className="rounded-xl bg-surface-container-lowest p-4 text-sm leading-6 text-on-surface">
            {analysis.comprehensiveAnalysisSummary}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <p className="text-xs text-on-surface-variant">Doanh thu tháng</p>
              <p className="mt-1 font-sora font-semibold text-on-surface">{formatVnd(analysis.currentMonthRevenue)}</p>
              <p className="text-xs text-error">Giảm {Number(analysis.revenueDropPercentage || 0).toFixed(2)}%</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <p className="text-xs text-on-surface-variant">Lưu lượng trung bình</p>
              <p className="mt-1 font-sora font-semibold text-on-surface">{traffic?.averageDailyCheckIns ?? 0} xe/ngày</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <p className="text-xs text-on-surface-variant">Ngày vắng khách</p>
              <p className="mt-1 font-sora font-semibold text-on-surface">{traffic?.slowestDaysOfWeek || '—'}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <p className="text-xs text-on-surface-variant">Khách có nguy cơ rời bỏ</p>
              <p className="mt-1 font-sora font-semibold text-on-surface">{traffic?.atRiskLoyalCustomersCount ?? 0} khách</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <h3 className="font-sora font-semibold text-on-surface">Đề xuất chờ duyệt</h3>
        <button type="button" className="text-sm text-secondary hover:underline" onClick={loadProposals}>
          Làm mới
        </button>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-on-surface-variant">Đang tải đề xuất từ AI local…</p>
      ) : proposals.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-outline-variant p-6 text-center text-sm text-on-surface-variant">
          Chưa có đề xuất nào đang chờ duyệt.
        </p>
      ) : (
        <div className="mt-3 grid gap-4 xl:grid-cols-2">
          {proposals.map((proposal) => (
            <article key={proposal.voucherId} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-secondary">{proposal.code}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Giảm {proposal.discountAmount}% · {proposal.maxUsages?.toLocaleString('vi-VN')} lượt · {proposal.expiryDays} ngày
                  </p>
                </div>
                <span className="rounded-full border border-tertiary/30 bg-tertiary/10 px-2 py-1 text-[10px] font-semibold uppercase text-tertiary">
                  {proposal.approvalStatus}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-on-surface">{proposal.proposalNote}</p>
              <p className="mt-2 text-xs text-on-surface-variant">
                Ước tính {proposal.estimatedTargetCustomers?.toLocaleString('vi-VN') ?? 0} khách mục tiêu
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold"
                  onClick={() => setModal({ proposal, mode: 'modify' })}
                >
                  Sửa thông số
                </button>
                <button
                  type="button"
                  disabled={actionId === proposal.voucherId}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                  onClick={() => performProposalAction(proposal, 'approve')}
                >
                  Phê duyệt & phát hành
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-error/40 px-3 py-2 text-xs font-semibold text-error"
                  onClick={() => setModal({ proposal, mode: 'reject' })}
                >
                  Từ chối
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
