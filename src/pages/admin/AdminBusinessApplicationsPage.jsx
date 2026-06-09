import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPendingApplications } from '../../api/business.api'
import { formatDateTime } from '../../utils/format'

export default function AdminBusinessApplicationsPage() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPendingApplications()
      .then((data) => setApplications(Array.isArray(data) ? data : []))
      .catch(() => setError('Không thể tải danh sách.'))
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
    <div className="space-y-6">
      <div>
        <h2 className="font-sora text-lg font-semibold text-on-surface">Đơn đăng ký doanh nghiệp</h2>
        <p className="text-sm text-on-surface-variant">{applications.length} đơn đang chờ duyệt</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Tên công ty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Mã số thuế</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Người đại diện</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Ngày đăng ký</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-on-surface-variant uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-on-surface-variant">
                    Không có đơn nào đang chờ duyệt.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.businessProfileId || app.id} className="hover:bg-surface-container transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-on-surface">{app.companyName}</td>
                    <td className="px-4 py-3 text-sm text-on-surface-variant">{app.taxCode}</td>
                    <td className="px-4 py-3 text-sm text-on-surface">{app.representativeName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-on-surface">{formatDateTime(app.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {app.approvalStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/business-applications/${app.businessProfileId || app.id}`}
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
