import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerBusinessProfile } from '../../api/business.api'

export default function BusinessRegisterPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    taxCode: '',
    businessAddress: '',
    billingEmail: '',
    representativeName: '',
    monthlyCreditLimit: 0,
    paymentTermDays: 30,
  })

  const [files, setFiles] = useState({
    businessLicense: null,
    authorizationLetter: null,
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target
    if (selectedFiles && selectedFiles[0]) {
      setFiles((prev) => ({ ...prev, [name]: selectedFiles[0] }))
    }
  }

  const validate = () => {
    if (!form.phoneNumber.trim()) return 'Số điện thoại là bắt buộc.'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return 'Email không hợp lệ.'
    if (!form.password || form.password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.'
    if (form.password !== form.confirmPassword) return 'Mật khẩu xác nhận không khớp.'
    if (!form.companyName.trim()) return 'Tên công ty là bắt buộc.'
    if (!form.taxCode.trim()) return 'Mã số thuế là bắt buộc.'
    if (!files.businessLicense) return 'Giấy phép kinh doanh là bắt buộc.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('phoneNumber', form.phoneNumber)
      formData.append('email', form.email)
      formData.append('password', form.password)
      formData.append('companyName', form.companyName)
      formData.append('taxCode', form.taxCode)
      formData.append('businessAddress', form.businessAddress)
      formData.append('billingEmail', form.billingEmail)
      formData.append('representativeName', form.representativeName)
      formData.append('monthlyCreditLimit', form.monthlyCreditLimit)
      formData.append('paymentTermDays', form.paymentTermDays)
      if (files.businessLicense) formData.append('businessLicense', files.businessLicense)
      if (files.authorizationLetter) formData.append('authorizationLetter', files.authorizationLetter)

      await registerBusinessProfile(formData)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="bg-surface-container-lowest rounded-2xl shadow-lg p-8 max-w-md w-full text-center border border-outline-variant">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-4xl text-green-600 filled">check_circle</span>
          </div>
          <h2 className="font-sora text-2xl font-bold text-on-surface mb-2">Đăng ký thành công!</h2>
          <p className="text-on-surface-variant mb-6">
            Tài khoản doanh nghiệp của bạn đang chờ được duyệt. Chúng tôi sẽ liên hệ trong 24 giờ làm việc.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Quay về trang chủ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 py-8">
      <div className="bg-surface-container-lowest rounded-2xl shadow-lg max-w-3xl w-full border border-outline-variant overflow-hidden">
        <div className="bg-primary px-8 py-6">
          <h1 className="font-sora text-2xl font-bold text-on-primary">Đăng ký doanh nghiệp</h1>
          <p className="text-on-primary/80 text-sm mt-1">
            Điền đầy đủ thông tin để đăng ký tài khoản doanh nghiệp
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-red-600">error</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <h3 className="font-sora text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">account_circle</span>
              Thông tin tài khoản
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 input-focus-glow"
                  placeholder="0901234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 input-focus-glow"
                  placeholder="contact@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 input-focus-glow"
                  placeholder="Tối thiểu 8 ký tự"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Xác nhận mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 input-focus-glow"
                  placeholder="Nhập lại mật khẩu"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-outline-variant pt-6">
            <h3 className="font-sora text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">business</span>
              Thông tin doanh nghiệp
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Tên công ty <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 input-focus-glow"
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
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 input-focus-glow"
                  placeholder="0123456789"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Địa chỉ giao hóa đơn</label>
                <input
                  type="text"
                  name="businessAddress"
                  value={form.businessAddress}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 input-focus-glow"
                  placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Email nhận hóa đơn</label>
                <input
                  type="email"
                  name="billingEmail"
                  value={form.billingEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 input-focus-glow"
                  placeholder="finance@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Người đại diện</label>
                <input
                  type="text"
                  name="representativeName"
                  value={form.representativeName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 input-focus-glow"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Hạn mức tín dụng/tháng</label>
                <input
                  type="number"
                  name="monthlyCreditLimit"
                  value={form.monthlyCreditLimit}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 input-focus-glow"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Chu kỳ thanh toán</label>
                <select
                  name="paymentTermDays"
                  value={form.paymentTermDays}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 input-focus-glow"
                >
                  <option value={30}>Hàng tháng (30 ngày)</option>
                  <option value={90}>Hàng quý (90 ngày)</option>
                  <option value={365}>Hàng năm (365 ngày)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-outline-variant pt-6">
            <h3 className="font-sora text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">upload_file</span>
              Tài liệu đính kèm
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Giấy phép kinh doanh <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    name="businessLicense"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                    id="businessLicense"
                  />
                  <label
                    htmlFor="businessLicense"
                    className="flex items-center gap-3 px-4 py-3 bg-surface border border-dashed border-outline rounded-xl cursor-pointer hover:border-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-primary">attach_file</span>
                    <span className="text-sm text-on-surface-variant truncate">
                      {files.businessLicense ? files.businessLicense.name : 'Chọn file PDF/JPG/PNG'}
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Thư ủy quyền (tùy chọn)</label>
                <div className="relative">
                  <input
                    type="file"
                    name="authorizationLetter"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                    id="authorizationLetter"
                  />
                  <label
                    htmlFor="authorizationLetter"
                    className="flex items-center gap-3 px-4 py-3 bg-surface border border-dashed border-outline rounded-xl cursor-pointer hover:border-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-primary">attach_file</span>
                    <span className="text-sm text-on-surface-variant truncate">
                      {files.authorizationLetter ? files.authorizationLetter.name : 'Chọn file PDF/JPG/PNG'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-outline-variant">
            <p className="text-sm text-on-surface-variant">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Đăng nhập
              </Link>
            </p>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">how_to_reg</span>
                  Đăng ký doanh nghiệp
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
