import { useEffect, useState } from 'react'
import { fetchBusinessProfile, fetchMonthlyStatement } from '../../api/business.api'
import { fetchPointsHistory } from '../../api/admin.transactions.api'
import { createWalletTopUp, fetchMyWallet } from '../../api/wallet.api'
import { formatVnd } from '../../utils/format'

export default function BusinessCreditPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [statement, setStatement] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpLoading, setTopUpLoading] = useState(false)
  
  const [pointHistory, setPointHistory] = useState([])
  const [pointHistoryOpen, setPointHistoryOpen] = useState(false)
  const [loadingPoints, setLoadingPoints] = useState(false)

  useEffect(() => {
    fetchBusinessProfile()
      .then(setProfile)
      .catch(() => setError('Không thể tải thông tin hạn mức.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    let retryTimer

    const loadWallet = () =>
      fetchMyWallet()
        .then((data) => {
          if (!cancelled) setWallet(data)
        })
        .catch(() => {
          if (!cancelled) setWallet(null)
        })

    loadWallet()

    // PayOS redirects back before a localhost webhook can be delivered (or
    // before a production webhook finishes). Retry shortly so the reconciled
    // balance is shown without requiring a manual page refresh.
    const params = new URLSearchParams(window.location.search)
    const returnedFromPayOs =
      params.has('orderCode') || params.has('status') || params.has('code')
    if (returnedFromPayOs) {
      let attempts = 0
      const retry = () => {
        attempts += 1
        loadWallet()
        if (attempts < 3 && !cancelled) {
          retryTimer = window.setTimeout(retry, 1500)
        }
      }
      retryTimer = window.setTimeout(retry, 800)
    }

    const handleFocus = () => loadWallet()
    window.addEventListener('focus', handleFocus)

    return () => {
      cancelled = true
      if (retryTimer) window.clearTimeout(retryTimer)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  useEffect(() => {
    fetchMonthlyStatement(selectedYear, selectedMonth)
      .then(setStatement)
      .catch(() => setStatement(null))
  }, [selectedYear, selectedMonth])

  const handleTopUp = async () => {
    const amount = Number(topUpAmount)
    if (!amount || amount < 1) return
    setTopUpLoading(true)
    try {
      const base = `${window.location.origin}/business/credit`
      const result = await createWalletTopUp({
        amount,
        returnUrl: base,
        cancelUrl: base,
      })
      const checkoutUrl =
        result?.checkoutUrl ?? result?.paymentUrl ?? result?.url ?? result?.data?.checkoutUrl
      if (checkoutUrl) {
        window.location.href = String(checkoutUrl)
      } else {
        setError('Không nhận được link thanh toán. Vui lòng thử lại.')
      }
    } catch {
      setError('Không tạo được yêu cầu nạp ví.')
    } finally {
      setTopUpLoading(false)
    }
  }

  const handleLoadPoints = async () => {
    setPointHistoryOpen(true)
    setLoadingPoints(true)
    try {
      const data = await fetchPointsHistory()
      setPointHistory(Array.isArray(data) ? data : [])
    } catch {
      setError('Không tải được lịch sử điểm.')
    } finally {
      setLoadingPoints(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  const limit = profile?.monthlyCreditLimit || 0
  const used = profile?.currentMonthUsage || 0
  const remaining = Math.max(0, limit - used)
  const usagePercent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  const isWarning = usagePercent >= 80

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-sora text-lg font-semibold text-on-surface">Hạn mức tín dụng</h2>
        <p className="text-sm text-on-surface-variant">Theo dõi hạn mức và chi tiêu doanh nghiệp</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {isWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-yellow-600 flex-shrink-0">warning</span>
          <p className="text-sm text-yellow-800">
            Bạn đã sử dụng {usagePercent.toFixed(0)}% hạn mức tín dụng. Vui lòng liên hệ quản lý để tăng hạn mức.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {wallet && (
          <div className="lg:col-span-3 bg-surface-container-lowest rounded-2xl border border-outline-variant p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-on-surface text-sm">Ví điện tử & Điểm</h3>
                <div className="mt-1 flex items-baseline gap-4">
                  <p className="text-2xl font-bold text-primary">{formatVnd(wallet.balance)}</p>
                  {(wallet.totalPoints > 0 || wallet.promotionPoints > 0) && (
                    <div className="flex flex-col">
                      <span className="text-sm text-on-surface-variant font-medium">
                        Điểm thưởng: <span className="text-primary">{wallet.totalPoints.toLocaleString('vi-VN')}</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleLoadPoints}
                        className="text-xs text-primary hover:underline self-start"
                      >
                        Xem lịch sử
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-end gap-2">
                <label className="block">
                  <span className="text-xs text-on-surface-variant">Nạp tiền (VND)</span>
                  <input
                    type="number"
                    min={1000}
                    className="mt-1 block w-40 rounded-lg border border-outline-variant px-3 py-2 text-sm"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={topUpLoading}
                  onClick={handleTopUp}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
                >
                  {topUpLoading ? 'Đang xử lý…' : 'Nạp ví'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant p-6">
          <h3 className="font-medium text-on-surface mb-4 text-sm">Sử dụng tháng này</h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-on-surface-variant">Đã sử dụng</span>
                <span className="font-semibold text-on-surface">{formatVnd(used)}</span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usagePercent >= 100
                      ? 'bg-red-500'
                      : usagePercent >= 80
                      ? 'bg-yellow-500'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-on-surface-variant mt-1">
                <span>0</span>
                <span>{formatVnd(limit)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-outline-variant">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{formatVnd(used)}</p>
                <p className="text-xs text-on-surface-variant mt-1">Đã sử dụng</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{formatVnd(remaining)}</p>
                <p className="text-xs text-on-surface-variant mt-1">Còn lại</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-on-surface">{formatVnd(limit)}</p>
                <p className="text-xs text-on-surface-variant mt-1">Hạn mức</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6">
          <h3 className="font-medium text-on-surface mb-4 text-sm">Thông tin hợp đồng</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Hạn mức/tháng</span>
              <span className="font-medium text-on-surface">{formatVnd(limit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Chu kỳ thanh toán</span>
              <span className="text-on-surface">{profile?.paymentTermDays || 30} ngày</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">% Giảm giá</span>
              <span className="text-primary font-medium">{profile?.discountPercent || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Ngày bắt đầu</span>
              <span className="text-on-surface">{profile?.contractStartDate || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Ngày kết thúc</span>
              <span className="text-on-surface">{profile?.contractEndDate || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Trạng thái</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                profile?.approvalStatus === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {profile?.approvalStatus === 'Approved' ? 'Đang hoạt động' : profile?.approvalStatus || '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
          <h3 className="font-medium text-on-surface text-sm">Chi tiêu theo tháng</h3>
          <div className="flex gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs text-on-surface"
            >
              {months.map((m) => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs text-on-surface"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-5">
          {statement ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{statement.totalWashes || 0}</p>
                  <p className="text-xs text-on-surface-variant mt-1">Tổng lần rửa</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{formatVnd(statement.totalCost || 0)}</p>
                  <p className="text-xs text-on-surface-variant mt-1">Tổng chi phí</p>
                </div>
              </div>

              {Array.isArray(statement.vehicles) && statement.vehicles.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-outline-variant">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-on-surface-variant">Biển số</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-on-surface-variant">Số lần rửa</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-on-surface-variant">Tổng chi phí</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {statement.vehicles.map((v, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-sm text-primary font-medium">{v.licensePlate}</td>
                          <td className="px-3 py-2 text-sm text-center text-on-surface">{v.washCount || 0}</td>
                          <td className="px-3 py-2 text-sm text-right text-primary font-medium">{formatVnd(v.totalCost || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant text-center py-4">Không có dữ liệu cho tháng này.</p>
          )}
        </div>
      </div>
      {pointHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-surface p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-sora text-xl font-bold text-on-surface">Lịch sử điểm</h3>
              <button
                type="button"
                onClick={() => setPointHistoryOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {loadingPoints ? (
                <p className="py-8 text-center text-on-surface-variant">Đang tải...</p>
              ) : pointHistory.length === 0 ? (
                <p className="py-8 text-center text-on-surface-variant">Không có giao dịch nào.</p>
              ) : (
                <table className="w-full text-left text-sm text-on-surface">
                  <thead className="sticky top-0 bg-surface text-xs text-on-surface-variant uppercase">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Thời gian</th>
                      <th className="px-4 py-3 font-semibold">Biến động</th>
                      <th className="px-4 py-3 font-semibold">Lý do</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {pointHistory.map((pt) => {
                      const net = (pt.pointsAdded || 0) - (pt.pointsDeducted || 0)
                      return (
                        <tr key={pt.ledgerId} className="hover:bg-surface-container-lowest">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {pt.transactionDate ? new Date(pt.transactionDate).toLocaleString('vi-VN') : '—'}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            <span className={net > 0 ? 'text-primary' : net < 0 ? 'text-error' : ''}>
                              {net > 0 ? '+' : ''}{net}
                            </span>
                          </td>
                          <td className="px-4 py-3">{pt.reason || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
