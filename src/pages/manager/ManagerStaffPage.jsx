import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  fetchManagerStaffs,
  fetchManagerLanes,
} from '../../api'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'

function todayDateValue() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default function ManagerStaffPage() {
  const [staff, setStaff] = useState([])
  const [lanes, setLanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState('')

  const [assignTarget, setAssignTarget] = useState(null)
  const [selectedLaneId, setSelectedLaneId] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayDateValue)
  const [assigning, setAssigning] = useState(false)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [staffData, lanesData] = await Promise.allSettled([
        fetchManagerStaffs(),
        fetchManagerLanes(),
      ])
      if (staffData.status === 'fulfilled') {
        setStaff(Array.isArray(staffData.value) ? staffData.value : [])
      }
      if (lanesData.status === 'fulfilled') {
        setLanes(Array.isArray(lanesData.value) ? lanesData.value : [])
      }
      if (staffData.status === 'rejected') {
        const err = staffData.reason
        setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách nhân viên.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAssign = async () => {
    if (!assignTarget || !selectedLaneId || !selectedDate) return
    setAssigning(true)
    try {
      const { assignStaffToLane } = await import('../../api')
      await assignStaffToLane({
        staffId: Number(assignTarget.userId),
        laneId: Number(selectedLaneId),
        assignedDate: selectedDate,
      })
      showToast(`Đã gán ${assignTarget.fullName} vào làn.`)
      setAssignTarget(null)
      setSelectedLaneId('')
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Lỗi khi phân công.')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Phân công nhân viên & Làn"
        description="Gán nhân viên vào các làn rửa đầu ca làm việc"
      />

      {toast && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </div>
      )}

      {loadError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-error-container/40 bg-error-container/10 p-6 text-center">
          <p className="text-sm text-error">{loadError}</p>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary" onClick={loadData}>
            Thử lại
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
        </div>
      ) : staff.length === 0 && lanes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline">badge</span>
          <p className="text-sm text-on-surface-variant">Không có dữ liệu nhân viên hoặc làn rửa.</p>
          {loadError && <p className="text-xs text-error">{loadError}</p>}
        </div>
      ) : (
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Số điện thoại</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
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
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-on-secondary hover:bg-secondary/90 disabled:opacity-50"
                      onClick={() => {
                        setAssignTarget(s)
                        setSelectedLaneId('')
                      }}
                      disabled={lanes.length === 0}
                    >
                      Phân công
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormModal
        open={Boolean(assignTarget)}
        title={`Phân công ${assignTarget?.fullName ?? ''}`}
        submitLabel={assigning ? 'Đang phân công...' : 'Xác nhận'}
        onClose={() => !assigning && setAssignTarget(null)}
        onSubmit={handleAssign}
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            Gán <strong className="text-on-surface">{assignTarget?.fullName}</strong> đứng làn cho ngày:
          </p>
          <input
            type="date"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={selectedDate}
            disabled={assigning}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          {lanes.length === 0 ? (
            <p className="text-sm text-error">
              Không có làn nào khả dụng. Vui lòng liên hệ Admin để tạo làn rửa.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {lanes.map((lane) => (
                <button
                  key={lane.laneId}
                  type="button"
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                    selectedLaneId === String(lane.laneId)
                      ? 'border-secondary bg-secondary-container/30 text-on-surface'
                      : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-secondary'
                  }`}
                  onClick={() => setSelectedLaneId(String(lane.laneId))}
                  disabled={assigning}
                >
                  <span className="material-symbols-outlined text-lg">garage</span>
                  <p className="mt-1 font-semibold">{lane.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </FormModal>
    </div>
  )
}
