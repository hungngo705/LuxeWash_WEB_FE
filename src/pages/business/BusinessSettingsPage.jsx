import { useEffect, useState } from 'react'
import { fetchBusinessProfile, updateBusinessProfile } from '../../api/business.api'

const READONLY_FIELDS = ['companyName', 'taxCode', 'contractStartDate', 'contractEndDate', 'discountPercent']

export default function BusinessSettingsPage() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchBusinessProfile()
      .then((data) => {
        setProfile(data)
        setForm({
          companyName: data.companyName || '',
          taxCode: data.taxCode || '',
          businessAddress: data.businessAddress || '',
          billingEmail: data.billingEmail || '',
          representativeName: data.representativeName || '',
          paymentTermDays: data.paymentTermDays || 30,
        })
      })
      .catch(() => setError('Không thể tải thông tin doanh nghiệp.'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateBusinessProfile(form)
      setSuccess('Lưu thông tin thành công!')
    } catch (err) {
      setError(err.message || 'Lưu thất bại.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-sora text-lg font-semibold text-on-surface">Cài đặt doanh nghiệp</h2>
        <p className="text-sm text-on-surface-variant">Cập nhật thông tin tài khoản doanh nghiệp</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-green-600 filled">check_circle</span>
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-600">error</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6">
          <h3 className="font-medium text-on-surface mb-4 text-sm">Thông tin hợp đồng (chỉ đọc)</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-on-surface-variant mb-1">Tên công ty</label>
              <input
                type="text"
                value={profile?.companyName || ''}
                disabled
                className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-sm text-on-surface disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1">Mã số thuế</label>
              <input
                type="text"
                value={profile?.taxCode || ''}
                disabled
                className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-sm text-on-surface disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1">Ngày bắt đầu hợp đồng</label>
              <input
                type="text"
                value={profile?.contractStartDate || '—'}
                disabled
                className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-sm text-on-surface disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1">Ngày kết thúc hợp đồng</label>
              <input
                type="text"
                value={profile?.contractEndDate || '—'}
                disabled
                className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-sm text-on-surface disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1">% Giảm giá</label>
              <input
                type="text"
                value={`${profile?.discountPercent || 0}%`}
                disabled
                className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-sm text-on-surface disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1">Trạng thái</label>
              <input
                type="text"
                value={profile?.approvalStatus || '—'}
                disabled
                className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-sm text-on-surface disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6">
          <h3 className="font-medium text-on-surface mb-4 text-sm">Thông tin có thể chỉnh sửa</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-on-surface-variant mb-1">Địa chỉ giao hóa đơn</label>
              <input
                type="text"
                name="businessAddress"
                value={form.businessAddress}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary"
                placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM"
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1">Email nhận hóa đơn</label>
              <input
                type="email"
                name="billingEmail"
                value={form.billingEmail}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary"
                placeholder="finance@company.com"
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1">Người đại diện</label>
              <input
                type="text"
                name="representativeName"
                value={form.representativeName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary"
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1">Chu kỳ thanh toán (ngày)</label>
              <select
                name="paymentTermDays"
                value={form.paymentTermDays}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary"
              >
                <option value={30}>Hàng tháng (30 ngày)</option>
                <option value={60}>60 ngày</option>
                <option value={90}>Hàng quý (90 ngày)</option>
                <option value={365}>Hàng năm (365 ngày)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">save</span>
                Lưu thay đổi
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
