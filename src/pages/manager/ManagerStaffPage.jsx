import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchManagerStaffs } from '../../api'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'

export default function ManagerStaffPage() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const staffData = await fetchManagerStaffs()
      setStaff(Array.isArray(staffData) ? staffData : [])
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách nhân viên.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async manager staff load
    loadData()
  }, [loadData])

  return (
    <div className="w-full">
      <PageHeader
        title="Danh sách nhân viên"
        description="Xem danh sách nhân viên trong chi nhánh của bạn"
      />

      {loadError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-error-container/40 bg-error-container/10 p-6 text-center">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
            onClick={loadData}
          >
            Thử lại
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
        </div>
      ) : (
        <section>
          <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Họ tên</th>
                  <th className="px-4 py-3">Số điện thoại</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {staff.map((s) => (
                  <tr key={s.userId} className="hover:bg-surface-container-low/50">
                    <td className="px-4 py-3 text-on-surface-variant">#{s.userId}</td>
                    <td className="px-4 py-3 font-medium text-on-surface">{s.fullName}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{s.phoneNumber}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status === 'Active' ? 'Active' : 'Inactive'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
