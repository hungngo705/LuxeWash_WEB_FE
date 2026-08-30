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
import DataTable from '../../components/ui/DataTable'
import { formatDateTime, formatVnd } from '../../utils/format'

const TX_STATUS_OPTIONS = ['All', 'Success', 'Failed', 'Refunded']
const TX_STATUS_LABELS = {
  All: 'Tất cả',
  Success: 'Thành công',
  Failed: 'Thất bại',
  Refunded: 'Đã hoàn tiền',
}

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async transactions load
    loadData()
  }, [loadData])

  const filteredTransactions = useMemo(() => {
    if (statusFilter === 'All') return transactions
    return transactions.filter((t) => t.status === statusFilter)
  }, [transactions, statusFilter])

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Tài chính"
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
                    {TX_STATUS_LABELS[status] ?? status}
                  </button>
                ))}
              </div>

              {filteredTransactions.length === 0 && !loadError ? (
                <EmptyState icon="payments" title="Không có giao dịch" />
              ) : (
                <DataTable
                  data={filteredTransactions}
                  loading={loading}
                  minWidth="720px"
                  emptyIcon="payments"
                  emptyTitle="Không có giao dịch"
                  columns={[
                    {
                      key: 'transactionId',
                      label: 'ID',
                      width: '80px',
                      render: (row) => (
                        <span className="text-on-surface-variant">#{row.transactionId}</span>
                      ),
                    },
                    {
                      key: 'bookingId',
                      label: 'Booking',
                      width: '100px',
                      render: (row) => <span className="text-on-surface">#{row.bookingId}</span>,
                    },
                    {
                      key: 'customerName',
                      label: 'Khách',
                      render: (row) => row.customerName,
                    },
                    {
                      key: 'amount',
                      label: 'Số tiền',
                      render: (row) => (
                        <span className="font-medium text-on-surface">
                          {formatVnd(row.amount)}
                        </span>
                      ),
                    },
                    {
                      key: 'paymentMethod',
                      label: 'Phương thức',
                      render: (row) => (
                        <span className="text-on-surface-variant">{row.paymentMethod}</span>
                      ),
                    },
                    {
                      key: 'status',
                      label: 'Trạng thái',
                      width: '140px',
                      render: (row) => <StatusBadge status={row.status} />,
                    },
                    {
                      key: 'createdAt',
                      label: 'Thời gian',
                      render: (row) => (
                        <span className="text-on-surface-variant">
                          {formatDateTime(row.createdAt)}
                        </span>
                      ),
                    },
                  ]}
                />
              )}
            </>
          )}

          {tab === 'points' && (
            <>
              {pointsHistory.length === 0 && !loadError ? (
                <EmptyState icon="stars" title="Không có lịch sử điểm" />
              ) : (
                <DataTable
                  data={pointsHistory}
                  loading={loading}
                  minWidth="800px"
                  emptyIcon="stars"
                  emptyTitle="Không có lịch sử điểm"
                  columns={[
                    {
                      key: 'customerName',
                      label: 'Khách',
                      render: (row) => row.customerName,
                    },
                    {
                      key: 'points',
                      label: 'Điểm',
                      render: (row) => (
                        <span
                          className={`font-medium ${
                            row.points >= 0 ? 'text-primary' : 'text-error'
                          }`}
                        >
                          {row.points >= 0 ? '+' : ''}
                          {row.points.toLocaleString('vi-VN')}
                        </span>
                      ),
                    },
                    {
                      key: 'type',
                      label: 'Loại',
                      render: (row) => <StatusBadge status={row.type} />,
                    },
                    {
                      key: 'reason',
                      label: 'Lý do',
                      render: (row) => (
                        <span className="text-on-surface-variant">{row.reason}</span>
                      ),
                    },
                    {
                      key: 'bookingId',
                      label: 'Booking',
                      width: '100px',
                      render: (row) => <span className="text-on-surface">#{row.bookingId}</span>,
                    },
                    {
                      key: 'expiryDate',
                      label: 'Hết hạn',
                      render: (row) => (
                        <span className="text-on-surface-variant">
                          {row.expiryDate ? formatDateTime(row.expiryDate) : '—'}
                        </span>
                      ),
                    },
                    {
                      key: 'createdAt',
                      label: 'Thời gian',
                      render: (row) => (
                        <span className="text-on-surface-variant">
                          {formatDateTime(row.createdAt)}
                        </span>
                      ),
                    },
                  ]}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}