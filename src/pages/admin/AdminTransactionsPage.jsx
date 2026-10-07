import { useEffect, useState } from 'react'
import { fetchAdminTransactions, nextDate, transactionTypes, transactionStatuses } from '../../api/admin.customer-transactions.api'
import PageHeader from '../../components/admin/shared/PageHeader'
import DataTable from '../../components/ui/DataTable'
import { formatDateTime, formatVnd } from '../../utils/format'

const fieldClass = 'rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface'
const initialFilters = { keyword: '', status: '', transactionType: '', from: '', to: '' }

export default function AdminTransactionsPage() {
  const [draft, setDraft] = useState(initialFilters)
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [validation, setValidation] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load a new server-filtered page
    setLoading(true)
    setError('')
    setData(null)
    fetchAdminTransactions({ ...filters, to: nextDate(filters.to), page, pageSize }, controller.signal)
      .then(result => {
        if (!Array.isArray(result?.items)) throw new Error('Dữ liệu giao dịch không hợp lệ.')
        if (active) setData(result)
      })
      .catch(err => { if (active) setError(err.message || 'Không thể tải giao dịch.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [filters, page, pageSize, revision])

  const update = (key, value) => setDraft(prev => ({ ...prev, [key]: value }))
  const submit = event => {
    event.preventDefault()
    if (draft.from && draft.to && draft.from > draft.to) {
      setValidation('Ngày kết thúc phải từ ngày bắt đầu trở đi.')
      return
    }
    setValidation('')
    setFilters({ ...draft, keyword: draft.keyword.trim() })
    setPage(1)
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader eyebrow="Tài chính" title="Giao dịch khách hàng"
        description="Giao dịch của khách lẻ, doanh nghiệp và khách tại quầy — mới nhất trước."
        actionLabel="Làm mới" actionIcon="refresh" onAction={() => setRevision(value => value + 1)} />
      <form onSubmit={submit} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">Tìm kiếm
            <input className={fieldClass} value={draft.keyword} maxLength={100} onChange={e => update('keyword', e.target.value)} placeholder="Tên, SĐT, mã giao dịch/lịch hẹn/hóa đơn" />
          </label>
          {[
            ['transactionType', 'Loại giao dịch', transactionTypes],
            ['status', 'Trạng thái', transactionStatuses],
          ].map(([key, label, options]) => (
            <label key={key} className="flex flex-col gap-1 text-sm">{label}
              <select className={fieldClass} value={draft[key]} onChange={e => update(key, e.target.value)}>
                <option value="">Tất cả</option>
                {Object.entries(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </select>
            </label>
          ))}
          {['from', 'to'].map(key => (
            <label key={key} className="flex flex-col gap-1 text-sm">{key === 'from' ? 'Từ ngày' : 'Đến hết ngày'}
              <input type="date" className={fieldClass} value={draft[key]} onChange={e => update(key, e.target.value)} />
            </label>
          ))}
          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary">Áp dụng</button>
            <button type="button" className={fieldClass} onClick={() => {
              setDraft(initialFilters); setFilters(initialFilters); setPage(1); setValidation('')
            }}>Xóa bộ lọc</button>
          </div>
        </div>
        {validation && <p role="alert" className="mt-3 text-sm text-error">{validation}</p>}
      </form>
      {error ? (
        <div role="alert" className="rounded-xl border border-error p-4 text-error">
          <p>{error}</p>
          <button className="mt-2 underline" onClick={() => setRevision(value => value + 1)}>Thử lại</button>
        </div>
      ) : (
        <>
          {!loading && <p className="text-sm text-on-surface-variant">{data?.totalItems?.toLocaleString('vi-VN') ?? 0} giao dịch phù hợp</p>}
          <DataTable data={data?.items ?? []} loading={loading} rowKey="transactionId" minWidth="1200px"
            emptyIcon="payments" emptyTitle="Không có giao dịch phù hợp" columns={[
              { key: 'transactionId', label: 'Mã / Thời gian', render: row => <div><p className="font-semibold">#{row.transactionId}</p><p className="text-xs text-on-surface-variant">{formatDateTime(row.createdAt)}</p></div> },
              { key: 'customerName', label: 'Khách hàng', render: row => <div><p className="font-medium">{row.customerName || (row.userId ? `Khách hàng #${row.userId}` : 'Khách vãng lai')}</p><p className="text-xs text-on-surface-variant">{row.phoneNumber || '—'}</p></div> },
              { key: 'transactionType', label: 'Loại', render: row => transactionTypes[row.transactionType] || row.transactionType },
              { key: 'amount', label: 'Số tiền', align: 'right', render: row => <span className="whitespace-nowrap font-semibold">{formatVnd(Math.abs(row.amount))}</span> },
              { key: 'paymentMethod', label: 'Phương thức', render: row => row.paymentMethod == null ? 'Ví' : ({ Wallet: 'Ví', Cash: 'Tiền mặt' }[row.paymentMethod] || row.paymentMethod || '—') },
              { key: 'status', label: 'Trạng thái', render: row => <span className={`rounded-md px-2 py-1 text-xs font-semibold ${['Completed', 'Success'].includes(row.status) ? 'bg-green-100 text-green-800' : row.status === 'Pending' ? 'bg-amber-100 text-amber-900' : 'bg-surface-variant text-on-surface'}`}>{transactionStatuses[row.status] || row.status}</span> },
              { key: 'referenceBookingId', label: 'Tham chiếu', render: row => <div>{row.referenceBookingId && <p>Lịch #{row.referenceBookingId}</p>}{row.referenceInvoiceId && <p>Hóa đơn #{row.referenceInvoiceId}</p>}<p className="text-xs">{row.orderCode || '—'}</p></div> },
              { key: 'description', label: 'Nội dung', tdClassName: 'max-w-xs break-words', render: row => row.description || '—' },
            ]} />
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <label>Số dòng / trang <select className={fieldClass} value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}>{[20, 50, 100].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <div className="flex items-center gap-3">
              <button className={`${fieldClass} disabled:opacity-40`} disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button>
              <span>Trang {page} / {Math.max(1, data?.totalPages ?? 1)}</span>
              <button className={`${fieldClass} disabled:opacity-40`} disabled={loading || !data || page >= data.totalPages} onClick={() => setPage(value => value + 1)}>Sau</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
