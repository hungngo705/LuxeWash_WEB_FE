import { useEffect, useState } from 'react'
import { fetchBusinessProfile } from '../../api/business.api'

export default function BusinessSettingsPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBusinessProfile()
      .then(setProfile)
      .catch(() => setError('Không thể tải thông tin doanh nghiệp.'))
      .finally(() => setLoading(false))
  }, [])

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
        <p className="text-sm text-on-surface-variant">Thông tin hồ sơ doanh nghiệp trên hệ thống</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-600">error</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        Cập nhật hồ sơ qua API chưa khả dụng trên backend. Liên hệ quản trị viên nếu cần thay đổi thông tin hợp đồng.
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6">
        <h3 className="font-medium text-on-surface mb-4 text-sm">Thông tin doanh nghiệp</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">Tên công ty</label>
            <input
              type="text"
              value={profile?.companyName || '—'}
              disabled
              className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-sm text-on-surface disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">Mã số thuế</label>
            <input
              type="text"
              value={profile?.taxCode || '—'}
              disabled
              className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-sm text-on-surface disabled:opacity-60"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-on-surface-variant mb-1">Địa chỉ</label>
            <input
              type="text"
              value={profile?.businessAddress || '—'}
              disabled
              className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-sm text-on-surface disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">Trạng thái duyệt</label>
            <input
              type="text"
              value={profile?.approvalStatus || '—'}
              disabled
              className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-sm text-on-surface disabled:opacity-60"
            />
          </div>
          {profile?.rejectionReason && (
            <div>
              <label className="block text-xs text-on-surface-variant mb-1">Lý do từ chối</label>
              <input
                type="text"
                value={profile.rejectionReason}
                disabled
                className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-sm text-on-surface disabled:opacity-60"
              />
            </div>
          )}
          {profile?.businessLicenseFileUrl && (
            <div className="sm:col-span-2">
              <label className="block text-xs text-on-surface-variant mb-1">Giấy phép kinh doanh</label>
              <a
                href={profile.businessLicenseFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-base">description</span>
                Xem tài liệu đã nộp
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
