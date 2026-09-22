import { useEffect, useMemo, useState } from 'react'
import {
  fetchBillingBusinesses,
  generateAndSendMonthlyInvoice,
  resendBusinessInvoice,
} from '../../api/business.api'
import { getVietnameseApiErrorMessage } from '../../api/errors'
import PageHeader from '../../components/admin/shared/PageHeader'
import Input from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
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
  const [result, setResult] = useState(null)
  const toast = useToast()

  useEffect(() => {
    fetchBillingBusinesses()
      .then((items) => {
        const list = Array.isArray(items) ? items : []
        setBusinesses(list)
        if (list.length) setBusinessProfileId(String(list[0].businessProfileId))
      })
      .catch((err) =>
        toast.error(err?.message || 'Không thể tải danh sách doanh nghiệp.'),
      )
      .finally(() => setLoading(false))
  }, [toast])

  const selectedBusiness = useMemo(
    () => businesses.find((item) => String(item.businessProfileId) === businessProfileId),
    [businesses, businessProfileId],
  )

  async function handleSubmit(event) {
    event.preventDefault()
    setResult(null)
    setSubmitting(true)
    try {
      const data = await generateAndSendMonthlyInvoice({
        businessProfileId: Number(businessProfileId),
        month: Number(month),
        year: Number(year),
      })
      setResult(data)
      toast.success(
        data.emailSent
          ? 'Đã tạo và gửi hóa đơn thành công'
          : 'Đã tạo hóa đơn nhưng chưa gửi được email',
      )
    } catch (err) {
      toast.error(getVietnameseApiErrorMessage(err, 'Không thể phát hành hóa đơn.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    if (!result?.invoiceId) return
    setResending(true)
    try {
      const data = await resendBusinessInvoice(result.invoiceId)
      setResult(data)
      toast.success('Đã gửi lại email hóa đơn')
    } catch (err) {
      toast.error(getVietnameseApiErrorMessage(err, 'Không thể gửi lại email hóa đơn.'))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Đối tác DN"
        title="Phát hành hóa đơn doanh nghiệp"
        description="Chọn doanh nghiệp và kỳ sử dụng. Mỗi lần xác nhận sẽ tạo một hóa đơn mới, kể cả khi cùng doanh nghiệp và cùng tháng."
      />

      <form onSubmit={handleSubmit} className="lw-card space-y-5 rounded-xl p-6">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="biz"
            className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase"
          >
            Doanh nghiệp
          </label>
          <select
            id="biz"
            value={businessProfileId}
            onChange={(event) => setBusinessProfileId(event.target.value)}
            disabled={loading || submitting}
            className="rounded-lg border border-outline-variant bg-white px-3.5 py-2 text-sm text-on-surface focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          >
            {!businesses.length && <option value="">Không có doanh nghiệp khả dụng</option>}
            {businesses.map((item) => (
              <option key={item.businessProfileId} value={item.businessProfileId}>
                {item.companyName} — {item.taxCode || item.billingEmail}
              </option>
            ))}
          </select>
          {selectedBusiness && (
            <p className="text-xs text-on-surface-variant">
              Hóa đơn sẽ được gửi đến:{' '}
              <span className="font-medium text-on-surface">
                {selectedBusiness.billingEmail || 'Chưa có email nhận hóa đơn'}
              </span>
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="month"
              className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase"
            >
              Tháng
            </label>
            <select
              id="month"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="rounded-lg border border-outline-variant bg-white px-3.5 py-2 text-sm text-on-surface focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  Tháng {value}
                </option>
              ))}
            </select>
          </div>
          <Input
            id="year"
            label="Năm"
            type="number"
            min={2020}
            max={2100}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          />
        </div>

        <button
          type="submit"
          disabled={!businessProfileId || submitting || loading}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <span
              className="material-symbols-outlined lw-spin text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              progress_activity
            </span>
          ) : (
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 0" }}
            >
              send
            </span>
          )}
          {submitting ? 'Đang tạo và gửi…' : 'Tạo và gửi hóa đơn'}
        </button>
      </form>

      {result && (
        <div
          className={`rounded-xl border p-5 shadow-lw-sm ${
            result.emailSent
              ? 'border-green-200 bg-green-50'
              : 'border-amber-300 bg-amber-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`material-symbols-outlined mt-0.5 ${result.emailSent ? 'text-green-700' : 'text-amber-700'}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {result.emailSent ? 'check_circle' : 'warning'}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-on-surface">
                {result.emailSent
                  ? 'Đã tạo và gửi hóa đơn thành công'
                  : 'Đã tạo hóa đơn nhưng chưa gửi được email'}
              </h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-on-surface-variant">Mã hóa đơn</dt>
                  <dd className="font-medium text-on-surface">{result.invoiceCode}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Email nhận</dt>
                  <dd className="font-medium text-on-surface">{result.recipient || '—'}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Tổng tiền</dt>
                  <dd className="font-medium text-on-surface">
                    {formatVnd(result.totalAmount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">ID</dt>
                  <dd className="font-medium text-on-surface">#{result.invoiceId}</dd>
                </div>
              </dl>
              {!result.emailSent && (
                <>
                  {result.emailError && (
                    <p className="mt-3 text-sm text-amber-900">{result.emailError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-amber-700 px-4 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50"
                  >
                    {resending && (
                      <span
                        className="material-symbols-outlined lw-spin text-[16px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        progress_activity
                      </span>
                    )}
                    {resending ? 'Đang gửi lại…' : 'Gửi lại email hóa đơn này'}
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