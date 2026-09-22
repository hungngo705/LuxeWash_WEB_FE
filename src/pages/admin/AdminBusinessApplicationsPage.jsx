import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPendingApplications } from '../../api/business.api'
import DataTable from '../../components/ui/DataTable'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Đối tác DN"
        title="Đơn đăng ký doanh nghiệp"
        description="Duyệt đơn đăng ký doanh nghiệp mới"
      />

      {!loading && (
        <p className="text-sm text-on-surface-variant">
          {applications.length} đơn đang chờ duyệt
        </p>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3 text-sm text-error">
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            error
          </span>
          {error}
        </div>
      )}

      <DataTable
        data={applications}
        loading={loading}
        emptyIcon="inbox"
        emptyTitle="Không có đơn nào đang chờ duyệt"
        columns={[
          {
            key: 'companyName',
            label: 'Tên công ty',
            render: (app) => <span className="font-medium">{app.companyName}</span>,
          },
          {
            key: 'taxCode',
            label: 'Mã số thuế',
            render: (app) => app.taxCode,
            tdClassName: 'text-on-surface-variant',
          },
          {
            key: 'representativeName',
            label: 'Người đại diện',
            render: (app) => app.representativeName || '—',
          },
          {
            key: 'createdAt',
            label: 'Ngày đăng ký',
            render: (app) => formatDateTime(app.createdAt),
          },
          {
            key: 'approvalStatus',
            label: 'Trạng thái',
            width: '140px',
            align: 'center',
            render: (app) => <StatusBadge status={app.approvalStatus || 'PendingApproval'} />,
          },
          {
            key: 'actions',
            label: 'Thao tác',
            width: '140px',
            align: 'right',
            renderActions: (app) => (
              <Link
                to={`/admin/business-applications/${app.businessProfileId || app.id}`}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary-container/30"
              >
                <span
                  className="material-symbols-outlined text-[14px]"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  arrow_forward
                </span>
                Xem chi tiết
              </Link>
            ),
          },
        ]}
      />
    </div>
  )
}