import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBusinessInvoices } from '../../api/business.api'
import { formatVnd, formatDateTime } from '../../utils/format'

export default function BusinessInvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState({ status: '', dateFrom: '', dateTo: '' })

  useEffect(() => {
    fetchBusinessInvoices()
      .then((data) => setInvoices(Array.isArray(data) ? data : data.items || []))
      .catch(() => setError('Không thể tải danh sách hóa đơn.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = invoices.filter((inv) => {
    if (filter.status === 'Paid' && inv.status !== 'Paid') return false
    if (filter.status === 'Unpaid' && inv.status === 'Paid') return false
    if (filter.dateFrom && new Date(inv.issuedAt) < new Date(filter.dateFrom)) return false
    if (filter.dateTo && new Date(inv.issuedAt) > new Date(filter.dateTo)) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-sora text-lg font-semibold text-on-surface">Hóa đơn</h2>
        <p className="text-sm text-on-surface-variant">{filtered.length} hóa đơn</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 flex-wrap">
        {['', 'Paid', 'Unpaid'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter((prev) => ({ ...prev, status: s }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter.status === s
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {s === '' ? 'Tất cả' : s === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
          </button>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Mã hóa đơn</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Ngày phát hành</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Loại</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant uppercase">Tổng tiền</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-on-surface-variant uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-on-surface-variant">
                    Không có hóa đơn nào.
                  </td>
                </tr>
              ) : (
                filtered.map((invoice) => (
                  <tr key={invoice.invoiceId || invoice.id} className="hover:bg-surface-container transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-primary">{invoice.invoiceCode || `INV-${invoice.invoiceId}`}</td>
                    <td className="px-4 py-3 text-sm text-on-surface">{formatDateTime(invoice.issuedAt)}</td>
                    <td className="px-4 py-3 text-sm text-on-surface">
                      {invoice.invoiceType === 'RedInvoice' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">Hóa đơn đỏ</span>
                      ) : invoice.invoiceType === 'MonthlyStatement' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">Hóa đơn tháng</span>
                      ) : (
                        <span className="text-on-surface-variant">Hóa đơn thường</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-primary">{formatVnd(invoice.totalAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        invoice.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/business/invoices/${invoice.invoiceId || invoice.id}`}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Xem chi tiết
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
