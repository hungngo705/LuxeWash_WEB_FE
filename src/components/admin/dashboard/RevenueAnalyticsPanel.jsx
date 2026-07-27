import { useEffect, useState } from 'react'
import {
  ApiError,
  evaluateBranchRevenue,
  fetchAdminBranches,
  triggerAllRevenueCampaigns,
  triggerBranchRevenueCampaign,
} from '../../../api'
import { formatVnd } from '../../../utils/format'

export default function RevenueAnalyticsPanel() {
  const now = new Date()
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState('')
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() })
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState('')
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchAdminBranches()
      .then((items) => {
        if (cancelled) return
        const active = items.filter((branch) => branch.isActive !== false)
        setBranches(active)
        setBranchId((value) => value || String(active[0]?.id ?? ''))
      })
      .catch((error) => {
        if (!cancelled) setMessage({ type: 'error', text: error instanceof ApiError ? error.message : 'Không tải được chi nhánh.' })
      })
    return () => { cancelled = true }
  }, [])

  const execute = async (action) => {
    if (action !== 'all' && !Number(branchId)) {
      setMessage({ type: 'error', text: 'Vui lòng chọn chi nhánh.' })
      return
    }
    setRunning(action)
    setMessage(null)
    try {
      const data = action === 'evaluate'
        ? await evaluateBranchRevenue(branchId, period)
        : action === 'branch'
          ? await triggerBranchRevenueCampaign(branchId, period)
          : await triggerAllRevenueCampaigns(period)
      setResult(data)
      setMessage({
        type: 'success',
        text: action === 'evaluate'
          ? 'Đã tải báo cáo doanh thu.'
          : 'Đã chạy phân tích kích cầu. Các voucher phù hợp được đưa vào luồng xét duyệt.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof ApiError ? `Không kết nối được AI local: ${error.message}` : 'Thao tác thất bại.',
      })
    } finally {
      setRunning('')
    }
  }

  const rows = Array.isArray(result) ? result : result ? [result] : []

  return (
    <section className="glass-panel soft-shadow mt-6 rounded-xl border border-secondary/30 bg-secondary/5 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">query_stats</span>
            <h2 className="font-sora text-lg font-semibold text-on-surface">Phân tích doanh thu chi nhánh</h2>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">Nhóm API phân tích này chạy trên backend AI local.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="min-w-52 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
          >
            <option value="">Chọn chi nhánh</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <select
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm"
            value={period.month}
            onChange={(event) => setPeriod((value) => ({ ...value, month: Number(event.target.value) }))}
          >
            {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>Tháng {index + 1}</option>)}
          </select>
          <input
            type="number"
            className="w-24 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm"
            value={period.year}
            onChange={(event) => setPeriod((value) => ({ ...value, year: Number(event.target.value) }))}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(running)}
          className="rounded-lg border border-secondary px-3 py-2 text-sm font-semibold text-secondary disabled:opacity-50"
          onClick={() => execute('evaluate')}
        >
          {running === 'evaluate' ? 'Đang tải…' : 'Xem báo cáo'}
        </button>
        <button
          type="button"
          disabled={Boolean(running)}
          className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-on-secondary disabled:opacity-50"
          onClick={() => execute('branch')}
        >
          {running === 'branch' ? 'Đang chạy…' : 'Tạo đề xuất cho chi nhánh'}
        </button>
        <button
          type="button"
          disabled={Boolean(running)}
          className="rounded-lg border border-tertiary px-3 py-2 text-sm font-semibold text-tertiary disabled:opacity-50"
          onClick={() => execute('all')}
        >
          {running === 'all' ? 'Đang quét toàn hệ thống…' : 'Quét toàn bộ chi nhánh'}
        </button>
      </div>

      {message && (
        <p className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
          message.type === 'error'
            ? 'border-error/40 bg-error-container/20 text-error'
            : 'border-primary/30 bg-primary/10 text-primary'
        }`}>{message.text}</p>
      )}

      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface-container-low text-xs uppercase text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">Chi nhánh</th>
                <th className="px-4 py-3">Tháng trước</th>
                <th className="px-4 py-3">Tháng hiện tại</th>
                <th className="px-4 py-3">Mức giảm</th>
                <th className="px-4 py-3">Voucher / trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {rows.map((row, index) => (
                <tr key={`${row.branchId}-${index}`}>
                  <td className="px-4 py-3 font-medium text-on-surface">{row.branchName || `#${row.branchId}`}</td>
                  <td className="px-4 py-3">{formatVnd(row.previousMonthRevenue)}</td>
                  <td className="px-4 py-3">{formatVnd(row.currentMonthRevenue)}</td>
                  <td className="px-4 py-3 text-error">{Number(row.revenueDropPercentage || 0).toFixed(2)}%</td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs">{row.generatedVoucherCode || 'Chưa tạo'}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{row.approvalStatus || (row.isRevenueDropped ? 'Cần kích cầu' : 'Ổn định')}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
