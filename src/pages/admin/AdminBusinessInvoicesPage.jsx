import { useEffect, useMemo, useState } from 'react'
import {
  fetchBillingBusinesses,
  generateAndSendMonthlyInvoice,
  resendBusinessInvoice,
} from '../../api/business.api'
import { getVietnameseApiErrorMessage } from '../../api/errors'
import { formatVnd } from '../../utils/format'

const now = new Date()

export default function AdminBusinessInvoicesPage() {
  const [businesses, setBusinesses] = useState([])
  const [businessProfileId, setBusinessProfileId] = useState('')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    fetchBillingBusinesses()
      .then((items) => {
        const list = Array.isArray(items) ? items : []
        setBusinesses(list)
        if (list.length) setBusinessProfileId(String(list[0].businessProfileId))
      })
      .catch((err) => setError(err?.message || 'Không thể tải danh sách doanh nghiệp.'))
      .finally(() => setLoading(false))
  }, [])

  const selectedBusiness = useMemo(
    () => businesses.find((item) => String(item.businessProfileId) === businessProfileId),
    [businesses, businessProfileId],
  )

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setResult(null)
    setSubmitting(true)
    try {
      const data = await generateAndSendMonthlyInvoice({
        businessProfileId: Number(businessProfileId),
        month: Number(month),
        year: Number(year),
      })
      setResult(data)
    } catch (err) {
      setError(getVietnameseApiErrorMessage(err, 'Không thể phát hành hóa đơn.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    if (!result?.invoiceId) return
    setError('')
    setResending(true)
    try {
      const data = await resendBusinessInvoice(result.invoiceId)
      setResult(data)
    } catch (err) {
      setError(getVietnameseApiErrorMessage(err, 'Không thể gửi lại email hóa đơn.'))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-sora text-2xl font-semibold text-on-surface">
          Phát hành hóa đơn doanh nghiệp
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Chọn doanh nghiệp và kỳ sử dụng. Mỗi lần xác nhận sẽ tạo một hóa đơn mới,
          kể cả khi cùng doanh nghiệp và cùng tháng.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-on-surface">Doanh nghiệp</label>
          <select
            value={businessProfileId}
            onChange={(event) => setBusinessProfileId(event.target.value)}
            disabled={loading || submitting}
            className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm outline-none focus:border-primary"
          >
            {!businesses.length && <option value="">Không có doanh nghiệp khả dụng</option>}
            {businesses.map((item) => (
              <option key={item.businessProfileId} value={item.businessProfileId}>
                {item.companyName} — {item.taxCode || item.billingEmail}
              </option>
            ))}
          </select>
          {selectedBusiness && (
            <p className="mt-2 text-xs text-on-surface-variant">
              Hóa đơn sẽ được gửi đến: {selectedBusiness.billingEmail || 'Chưa có email nhận hóa đơn'}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-on-surface">Tháng</label>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm outline-none focus:border-primary"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>Tháng {value}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-on-surface">Năm</label>
            <input
              type="number"
              min="2020"
              max="2100"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!businessProfileId || submitting || loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-xl">send</span>
          {submitting ? 'Đang tạo và gửi...' : 'Tạo và gửi hóa đơn'}
        </button>
      </form>

      {result && (
        <div
          className={`rounded-2xl border p-5 ${
            result.emailSent
              ? 'border-green-200 bg-green-50'
              : 'border-amber-300 bg-amber-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5">
              {result.emailSent ? 'check_circle' : 'warning'}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-on-surface">
                {result.emailSent
                  ? 'Đã tạo và gửi hóa đơn thành công'
                  : 'Đã tạo hóa đơn nhưng chưa gửi được email'}
              </h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-on-surface-variant">Mã hóa đơn</dt><dd className="font-medium">{result.invoiceCode}</dd></div>
                <div><dt className="text-on-surface-variant">Email nhận</dt><dd className="font-medium">{result.recipient || '—'}</dd></div>
                <div><dt className="text-on-surface-variant">Tổng tiền</dt><dd className="font-medium">{formatVnd(result.totalAmount)}</dd></div>
                <div><dt className="text-on-surface-variant">ID</dt><dd className="font-medium">#{result.invoiceId}</dd></div>
              </dl>
              {!result.emailSent && (
                <>
                  {result.emailError && <p className="mt-3 text-sm text-amber-900">{result.emailError}</p>}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="mt-4 rounded-xl border border-amber-700 px-4 py-2 text-sm font-medium text-amber-900 disabled:opacity-50"
                  >
                    {resending ? 'Đang gửi lại...' : 'Gửi lại email hóa đơn này'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
