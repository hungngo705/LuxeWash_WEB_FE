import { useState } from 'react'
import EmptyState from '../../components/admin/shared/EmptyState'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import {
  initialAdminPointsHistory,
  initialAdminTransactions,
} from '../../data/mockAdminTransactions'
import { formatDateTime, formatVnd } from '../../utils/format'

export default function AdminTransactionsPage() {
  const [tab, setTab] = useState('transactions')
  const [transactions] = useState(initialAdminTransactions)
  const [pointsHistory] = useState(initialAdminPointsHistory)
  const [statusFilter, setStatusFilter] = useState('All')

  const filteredTransactions =
    statusFilter === 'All'
      ? transactions
      : transactions.filter((t) => t.status === statusFilter)

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

      {tab === 'transactions' && (
        <>
          <div className="mb-4 flex gap-2">
            {['All', 'Success', 'Failed'].map((status) => (
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

          {filteredTransactions.length === 0 ? (
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
                      <td className="px-4 py-3 font-medium text-on-surface">{formatVnd(tx.amount)}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{tx.paymentMethod}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">{formatDateTime(tx.createdAt)}</td>
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
          {pointsHistory.length === 0 ? (
            <EmptyState icon="stars" title="Không có lịch sử điểm" />
          ) : (
            <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                    <th className="px-4 py-3">Khách</th>
                    <th className="px-4 py-3">Điểm</th>
                    <th className="px-4 py-3">Loại</th>
                    <th className="px-4 py-3">Lý do</th>
                    <th className="px-4 py-3">Booking</th>
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
                      <td className="px-4 py-3 text-on-surface-variant">{formatDateTime(entry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
