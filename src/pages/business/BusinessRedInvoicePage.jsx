import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function BusinessRedInvoicePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    companyName: '',
    taxCode: '',
    address: '',
    email: '',
    billingName: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.companyName.trim()) return setError('Tên công ty là bắt buộc.')
    if (!form.taxCode.trim()) return setError('Mã số thuế là bắt buộc.')
    if (!form.address.trim()) return setError('Địa chỉ là bắt buộc.')

    setLoading(true)
    setError('')
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSuccess(true)
    } catch {
      setError('Gửi yêu cầu thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-6 max-w-md">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-4xl text-green-600 filled">check_circle</span>
          </div>
          <h3 className="font-sora text-xl font-bold text-green-800 mb-2">Yêu cầu đã được gửi!</h3>
          <p className="text-sm text-green-700 mb-6">
            Yêu cầu xuất hóa đơn đỏ cho hóa đơn #{id} đã được gửi. Bạn sẽ nhận được hóa đơn qua email trong 1-2 ngày làm việc.
          </p>
          <button
            onClick={() => navigate('/business/invoices')}
            className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            Quay lại danh sách hóa đơn
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <button
        onClick={() => navigate(`/business/invoices/${id}`)}
        className="text-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Quay lại chi tiết hóa đơn
      </button>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant bg-red-50">
          <h2 className="font-sora text-lg font-semibold text-red-700">Yêu cầu xuất hóa đơn đỏ (VAT)</h2>
          <p className="text-xs text-red-600 mt-1">Hóa đơn #{id}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-yellow-600 flex-shrink-0">info</span>
            <p className="text-xs text-yellow-800">
              Hóa đơn đỏ (VAT) sẽ được gửi qua email sau khi được xử lý. Vui lòng điền thông tin chính xác vì hóa đơn đỏ không thể chỉnh sửa sau khi phát hành.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-on-surface-variant mb-1">
                Tên công ty <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary"
                placeholder="Công ty TNHH XYZ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">
                Mã số thuế <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="taxCode"
                value={form.taxCode}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary"
                placeholder="0123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Tên người mua hàng</label>
              <input
                type="text"
                name="billingName"
                value={form.billingName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary"
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-on-surface-variant mb-1">
                Địa chỉ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary"
                placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Email nhận hóa đơn</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary"
                placeholder="finance@company.com"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">send</span>
                  Gửi yêu cầu
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/business/invoices/${id}`)}
              className="px-4 py-2.5 text-sm font-medium text-on-surface-variant border border-outline-variant rounded-xl hover:bg-surface-container transition-colors"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
