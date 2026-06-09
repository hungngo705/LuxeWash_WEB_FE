import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchApplicationDetail, reviewApplication } from '../../api/business.api'
import { formatDateTime } from '../../utils/format'

export default function AdminBusinessApplicationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchApplicationDetail(id)
      .then(setApp)
      .catch(() => setError('Không thể tải chi tiết.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleReview = async (isApproved, reason = '') => {
    if (!isApproved && !reason.trim()) {
      setError('Vui lòng nhập lý do từ chối.')
      return
    }
    setActionLoading(true)
    setError('')
    try {
      await reviewApplication({
        businessProfileId: parseInt(id),
        isApproved,
        ...(isApproved ? {} : { rejectionReason: reason }),
      })
      navigate('/admin/business-applications')
    } catch (err) {
      setError(err.message || 'Thao tác thất bại.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !app) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-700">{error}</p>
        <button onClick={() => navigate('/admin/business-applications')} className="text-sm text-primary hover:underline">
          ← Quay lại
        </button>
      </div>
    )
  }

  if (!app) return null

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => navigate('/admin/business-applications')} className="text-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Quay lại danh sách
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant">
          <h2 className="font-sora text-lg font-semibold text-on-surface">{app.companyName}</h2>
          <p className="text-sm text-on-surface-variant mt-1">Mã số thuế: {app.taxCode}</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Người đại diện</p>
              <p className="font-medium text-on-surface">{app.representativeName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Địa chỉ</p>
              <p className="text-on-surface">{app.businessAddress || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Email hóa đơn</p>
              <p className="text-on-surface">{app.billingEmail || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Ngày đăng ký</p>
              <p className="text-on-surface">{formatDateTime(app.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Hạn mức tín dụng</p>
              <p className="text-on-surface">{app.monthlyCreditLimit?.toLocaleString() || 0} VNĐ/tháng</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Chu kỳ thanh toán</p>
              <p className="text-on-surface">{app.paymentTermDays || 30} ngày</p>
            </div>
          </div>

          {app.businessLicenseUrl && (
            <div>
              <p className="text-xs text-on-surface-variant mb-2">Giấy phép kinh doanh</p>
              <a
                href={app.businessLicenseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-xl text-sm text-primary hover:bg-primary/10 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                Xem giấy phép kinh doanh
              </a>
            </div>
          )}

          {app.authorizationLetterUrl && (
            <div>
              <p className="text-xs text-on-surface-variant mb-2">Thư ủy quyền</p>
              <a
                href={app.authorizationLetterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-xl text-sm text-primary hover:bg-primary/10 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">description</span>
                Xem thư ủy quyền
              </a>
            </div>
          )}

          <div className="border-t border-outline-variant pt-6 flex flex-wrap gap-3">
            <button
              onClick={() => handleReview(true)}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Duyệt đơn
            </button>
            <button
              onClick={() => {
                const reason = window.prompt('Nhập lý do từ chối:')
                if (reason !== null) handleReview(false, reason)
              }}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">cancel</span>
              Từ chối
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
