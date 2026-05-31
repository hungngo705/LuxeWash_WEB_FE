import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  fetchPointsHistory,
  fetchTransactions,
  normalizePointsEntry,
  normalizeTransaction,
} from '../../api'
import EmptyState from '../../components/admin/shared/EmptyState'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import { formatDateTime, formatVnd } from '../../utils/format'

const TX_STATUS_OPTIONS = ['All', 'Success', 'Failed', 'Refunded']

export default function AdminTransactionsPage() {
  const [tab, setTab] = useState('transactions')
  const [transactions, setTransactions] = useState([])
  const [pointsHistory, setPointsHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [transactionsData, pointsData] = await Promise.all([
        fetchTransactions(),
        fetchPointsHistory(),
      ])
      setTransactions(
        Array.isArray(transactionsData) ? transactionsData.map(normalizeTransaction) : [],
      )
      setPointsHistory(
        Array.isArray(pointsData) ? pointsData.map(normalizePointsEntry) : [],
      )
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu giao dịch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredTransactions = useMemo(() => {
    if (statusFilter === 'All') return transactions
    return transactions.filter((t) => t.status === statusFilter)
  }, [transactions, statusFilter])

  return (
    <div className="w-full">
      <PageHeader
        title="Giao dịch & điểm"
        description="Theo dõi thanh toán và lịch sử điểm loyalty"
      />

      <div className="mb-4 flex gap-2 border-b border-outline-variant">
        {[
          { id: 'transactions', label: 'Giao dịch' },
          { id: 'points', label: 'Lịch sử điểm' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="rounded-lg border border-error/30 px-3 py-1.5 text-sm font-medium text-error hover:bg-error-container/20"
            onClick={loadData}
          >
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải dữ liệu…</p>
      ) : (
        <>
          {tab === 'transactions' && (
            <>
              <div className="mb-4 flex gap-2">
                {TX_STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                      statusFilter === status
                        ? 'bg-primary text-on-primary'
                        : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
                    }`}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status === 'All' ? 'Tất cả' : status}
                  </button>
                ))}
              </div>

              {filteredTransactions.length === 0 && !loadError ? (
                <EmptyState icon="payments" title="Không có giao dịch" />
              ) : (
                <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Booking</th>
                        <th className="px-4 py-3">Khách</th>
                        <th className="px-4 py-3">Số tiền</th>
                        <th className="px-4 py-3">Phương thức</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-4 py-3">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60">
                      {filteredTransactions.map((tx) => (
                        <tr key={tx.transactionId} className="hover:bg-surface-container-low/50">
                          <td className="px-4 py-3 text-on-surface-variant">#{tx.transactionId}</td>
                          <td className="px-4 py-3 text-on-surface">#{tx.bookingId}</td>
                          <td className="px-4 py-3 text-on-surface">{tx.customerName}</td>
                          <td className="px-4 py-3 font-medium text-on-surface">
                            {formatVnd(tx.amount)}
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">{tx.paymentMethod}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={tx.status} />
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">
                            {formatDateTime(tx.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === 'points' && (
            <>
              {pointsHistory.length === 0 && !loadError ? (
                <EmptyState icon="stars" title="Không có lịch sử điểm" />
              ) : (
                <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                        <th className="px-4 py-3">Khách</th>
                        <th className="px-4 py-3">Điểm</th>
                        <th className="px-4 py-3">Loại</th>
                        <th className="px-4 py-3">Lý do</th>
                        <th className="px-4 py-3">Booking</th>
                        <th className="px-4 py-3">Hết hạn</th>
                        <th className="px-4 py-3">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60">
                      {pointsHistory.map((entry) => (
                        <tr key={entry.id} className="hover:bg-surface-container-low/50">
                          <td className="px-4 py-3 text-on-surface">{entry.customerName}</td>
                          <td
                            className={`px-4 py-3 font-medium ${
                              entry.points >= 0 ? 'text-primary' : 'text-error'
                            }`}
                          >
                            {entry.points >= 0 ? '+' : ''}
                            {entry.points.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={entry.type} />
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">{entry.reason}</td>
                          <td className="px-4 py-3 text-on-surface">#{entry.bookingId}</td>
                          <td className="px-4 py-3 text-on-surface-variant">
                            {entry.expiryDate ? formatDateTime(entry.expiryDate) : '—'}
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">
                            {formatDateTime(entry.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
