import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  downloadInvoicePdf,
  fetchInvoiceDetail,
  fetchInvoicePaymentStatus,
  payBusinessInvoice,
} from '../../api/business.api'
import { fetchMyWallet } from '../../api/wallet.api'
import { getVietnameseApiErrorMessage } from '../../api/errors'
import { formatVnd, formatDateTime } from '../../utils/format'

export default function BusinessInvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [payingMethod, setPayingMethod] = useState('')
  const [wallet, setWallet] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const params = new URLSearchParams(window.location.search)
        if (params.has('orderCode') || params.has('status') || params.has('code')) {
          await fetchInvoicePaymentStatus(id).catch(() => null)
          window.history.replaceState({}, '', window.location.pathname)
        }

        const [invoiceData, walletData] = await Promise.all([
          fetchInvoiceDetail(id),
          fetchMyWallet().catch(() => null),
        ])
        if (!cancelled) {
          setInvoice(invoiceData)
          setWallet(walletData)
        }
      } catch {
        if (!cancelled) setError('Không thể tải chi tiết hóa đơn.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleWalletPayment() {
    setPaymentError('')
    setPayingMethod('Wallet')
    try {
      await payBusinessInvoice(id, { paymentMethod: 'Wallet' })
      const [invoiceData, walletData] = await Promise.all([
        fetchInvoiceDetail(id),
        fetchMyWallet().catch(() => null),
      ])
      setInvoice(invoiceData)
      setWallet(walletData)
    } catch (err) {
      setPaymentError(
        getVietnameseApiErrorMessage(err, 'Không thể thanh toán hóa đơn bằng ví.'),
      )
    } finally {
      setPayingMethod('')
    }
  }

  async function handlePayOsPayment() {
    setPaymentError('')
    setPayingMethod('PayOS')
    try {
      const returnUrl = `${window.location.origin}/business/invoices/${id}`
      const result = await payBusinessInvoice(id, {
        paymentMethod: 'PayOS',
        returnUrl,
        cancelUrl: returnUrl,
      })
      const paymentUrl = result?.paymentUrl || result?.checkoutUrl || result?.url
      if (!paymentUrl) throw new Error('Không nhận được đường dẫn thanh toán PayOS.')
      window.location.href = String(paymentUrl)
    } catch (err) {
      setPaymentError(getVietnameseApiErrorMessage(err, 'Không thể tạo giao dịch PayOS.'))
      setPayingMethod('')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-700">{error || 'Không tìm thấy hóa đơn.'}</p>
        <button onClick={() => navigate('/business/invoices')} className="text-sm text-primary hover:underline">
          ← Quay lại danh sách
        </button>
      </div>
    )
  }

  const items = Array.isArray(invoice.items) ? invoice.items : invoice.invoiceItems || []

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => navigate('/business/invoices')} className="text-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Quay lại danh sách hóa đơn
      </button>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-sora text-lg font-semibold text-on-surface">
                {invoice.invoiceCode || `Hóa đơn #${id}`}
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Phát hành: {formatDateTime(invoice.issuedAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setDownloadError('')
                  try {
                    await downloadInvoicePdf(id)
                  } catch (err) {
                    setDownloadError(err?.message || 'Không thể tải PDF hóa đơn.')
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-xl hover:bg-primary/5 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Tải PDF
              </button>
              <button
                onClick={() => navigate(`/business/invoices/${id}/red-invoice`)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">receipt</span>
                Hóa đơn đỏ
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {downloadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {downloadError}
            </div>
          )}
          {paymentError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {paymentError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {invoice.businessName && (
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Tên doanh nghiệp</p>
                <p className="text-sm font-medium text-on-surface">{invoice.businessName}</p>
              </div>
            )}
            {invoice.taxCode && (
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Mã số thuế</p>
                <p className="text-sm text-on-surface">{invoice.taxCode}</p>
              </div>
            )}
            {invoice.branchName && (
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Chi nhánh</p>
                <p className="text-sm text-on-surface">{invoice.branchName}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Trạng thái</p>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                invoice.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {invoice.status === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
              </span>
            </div>
          </div>

          {items.length > 0 && (
            <div>
              <h3 className="font-medium text-on-surface mb-3 text-sm">Chi tiết dịch vụ</h3>
              <div className="border border-outline-variant rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface-container">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Mô tả</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-on-surface-variant">Số lượng</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-on-surface-variant">Đơn giá</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-on-surface-variant">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-on-surface">{item.description || item.serviceName || 'Dịch vụ'}</td>
                        <td className="px-4 py-2 text-sm text-center text-on-surface">{item.quantity || 1}</td>
                        <td className="px-4 py-2 text-sm text-right text-on-surface">{formatVnd(item.unitPrice)}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-primary">{formatVnd(item.amount || item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-surface-container rounded-xl p-4 space-y-2 max-w-sm ml-auto">
            {Number(invoice.subtotal) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Tạm tính</span>
                <span className="text-on-surface">{formatVnd(invoice.subtotal)}</span>
              </div>
            )}
            {Number(invoice.taxAmount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Thuế (8%)</span>
                <span className="text-on-surface">{formatVnd(invoice.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold pt-2 border-t border-outline-variant">
              <span className="text-on-surface">Tổng cộng</span>
              <span className="text-primary">{formatVnd(invoice.totalAmount)}</span>
            </div>
          </div>

          {invoice.status === 'Paid' ? (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
              <span className="material-symbols-outlined">check_circle</span>
              <div>
                <p className="font-medium">Hóa đơn đã được thanh toán</p>
                <p className="text-xs">Doanh nghiệp không cần thực hiện thêm thao tác thanh toán.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-outline-variant p-4">
              <h3 className="font-medium text-on-surface">Thanh toán hóa đơn</h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Chọn trừ trực tiếp từ ví doanh nghiệp hoặc thanh toán qua PayOS/QR.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleWalletPayment}
                  disabled={Boolean(payingMethod)}
                  className="rounded-xl border border-primary px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
                >
                  {payingMethod === 'Wallet'
                    ? 'Đang thanh toán...'
                    : `Thanh toán bằng ví (${formatVnd(wallet?.balance || 0)})`}
                </button>
                <button
                  type="button"
                  onClick={handlePayOsPayment}
                  disabled={Boolean(payingMethod)}
                  className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                >
                  {payingMethod === 'PayOS' ? 'Đang chuyển đến PayOS...' : 'Thanh toán PayOS / QR'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
