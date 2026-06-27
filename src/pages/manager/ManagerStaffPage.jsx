import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  assignStaffToLane,
  fetchAllLaneStaffAssignments,
  fetchManagerLanes,
  fetchManagerStaffs,
  unassignStaffFromLane,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'

function todayDateValue() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** @param {Array<{ lane: { laneId: number }; staff: Array<Record<string, unknown>> }>} assignments @param {number} laneId @param {Record<string, unknown>} staffMember */
function upsertLaneAssignment(assignments, laneId, staffMember) {
  const normalized = {
    userId: Number(staffMember.userId),
    fullName: String(staffMember.fullName ?? '—'),
    phoneNumber: String(staffMember.phoneNumber ?? '—'),
    status: String(staffMember.status ?? 'Active'),
  }

  return assignments.map((item) =>
    item.lane.laneId === laneId
      ? {
          lane: item.lane,
          staff: [
            ...item.staff.filter((s) => s.userId !== normalized.userId),
            normalized,
          ],
        }
      : item,
  )
}

export default function ManagerStaffPage() {
  const [staff, setStaff] = useState([])
  const [lanes, setLanes] = useState([])
  const [laneAssignments, setLaneAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState('')

  const [assignTarget, setAssignTarget] = useState(null)
  const [selectedLaneId, setSelectedLaneId] = useState('')
  const [viewDate, setViewDate] = useState(todayDateValue)
  const [selectedDate, setSelectedDate] = useState(todayDateValue)
  const [assigning, setAssigning] = useState(false)

  const [unassignTarget, setUnassignTarget] = useState(null)
  const [unassigning, setUnassigning] = useState(false)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadAssignments = useCallback(async () => {
    setAssignmentsLoading(true)
    try {
      const data = await fetchAllLaneStaffAssignments({ date: viewDate })
      setLaneAssignments(data)
    } catch {
      setLaneAssignments([])
    } finally {
      setAssignmentsLoading(false)
    }
  }, [viewDate])

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [staffData, lanesData] = await Promise.allSettled([
        fetchManagerStaffs(),
        fetchManagerLanes({ date: viewDate }),
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
      await loadAssignments()
    } finally {
      setLoading(false)
    }
  }, [loadAssignments, viewDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAssign = async () => {
    if (!assignTarget || !selectedLaneId || !selectedDate) return
    const laneId = Number(selectedLaneId)
    const isViewingSelectedDate = selectedDate === viewDate

    setAssigning(true)
    try {
      await assignStaffToLane({
        staffId: Number(assignTarget.userId),
        laneId,
        assignedDate: selectedDate,
      })

      if (isViewingSelectedDate) {
        setLaneAssignments((prev) => upsertLaneAssignment(prev, laneId, assignTarget))
      }

      showToast(
        isViewingSelectedDate
          ? `Đã gán ${assignTarget.fullName} vào làn.`
          : `Đã gán ${assignTarget.fullName} cho ngày ${selectedDate}.`,
      )
      setAssignTarget(null)
      setSelectedLaneId('')

      if (isViewingSelectedDate) await loadAssignments()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Lỗi khi phân công.')
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassign = async () => {
    if (!unassignTarget) return
    setUnassigning(true)
    try {
      await unassignStaffFromLane(unassignTarget.laneId, unassignTarget.staff.userId, {
        date: viewDate,
      })
      showToast(`Đã gỡ ${unassignTarget.staff.fullName} khỏi ${unassignTarget.laneName}.`)
      setUnassignTarget(null)
      await loadAssignments()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Lỗi khi gỡ phân công.')
    } finally {
      setUnassigning(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Phân công nhân viên & Làn"
        description="Gán Staff vào làn mỗi ngày và xem lại phân công theo làn"
      />

      {toast && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </div>
      )}

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-sora text-lg font-semibold text-on-surface">
              Phân công theo làn — {viewDate}
            </h2>
            <p className="text-sm text-on-surface-variant">
              Chọn ngày để xem, gán hoặc gỡ phân công làn cho nhân viên.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm"
              value={viewDate}
              onChange={(e) => setViewDate(e.target.value)}
            />
            <button
              type="button"
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-variant"
              onClick={loadAssignments}
              disabled={assignmentsLoading}
            >
              Làm mới
            </button>
          </div>
        </div>

        {assignmentsLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary/30 border-t-secondary" />
          </div>
        ) : laneAssignments.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Chưa có làn rửa.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {laneAssignments.map(({ lane, staff: assigned }) => (
              <div
                key={lane.laneId}
                className="glass-panel rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
              >
                <div className="mb-3 flex items-center gap-2 border-b border-outline-variant pb-3">
                  <span className="material-symbols-outlined text-secondary">garage</span>
                  <div>
                    <p className="font-semibold text-on-surface">{lane.name}</p>
                    <p className="text-xs text-on-surface-variant">Làn #{lane.laneId}</p>
                  </div>
                </div>
                {assigned.length === 0 ? (
                  <p className="py-4 text-center text-sm text-on-surface-variant">Chưa phân công nhân viên</p>
                ) : (
                  <ul className="space-y-2">
                    {assigned.map((s, index) => (
                      <li
                        key={`${lane.laneId}-${viewDate}-${s.userId}-${index}`}
                        className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-on-surface">{s.fullName}</p>
                          <p className="text-xs text-on-surface-variant">{s.phoneNumber}</p>
                        </div>
                        <button
                          type="button"
                          className="rounded-lg border border-outline-variant px-2 py-1 text-xs text-error hover:bg-error-container/10"
                          onClick={() =>
                            setUnassignTarget({
                              laneId: lane.laneId,
                              laneName: lane.name,
                              staff: s,
                            })
                          }
                        >
                          Gỡ
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

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
          <h2 className="mb-4 font-sora text-lg font-semibold text-on-surface">Danh sách nhân viên</h2>
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
                          setSelectedDate(viewDate)
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
        </section>
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
          {selectedDate !== viewDate && (
            <p className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              Bạn đang phân công cho ngày {selectedDate}, trong khi bảng hiển thị ngày {viewDate}. Phân công vẫn
              lưu thành công nhưng có thể không hiện trên bảng.
            </p>
          )}
          {lanes.length === 0 ? (
            <p className="text-sm text-error">Không có làn nào. Tạo làn tại mục Làn rửa trước.</p>
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

      <ConfirmDialog
        open={Boolean(unassignTarget)}
        title="Gỡ phân công"
        message={
          <p className="text-sm text-on-surface-variant">
            Gỡ <strong className="text-on-surface">{unassignTarget?.staff.fullName}</strong> khỏi{' '}
            <strong className="text-on-surface">{unassignTarget?.laneName}</strong>?
          </p>
        }
        confirmLabel={unassigning ? 'Đang xử lý...' : 'Gỡ phân công'}
        variant="danger"
        onConfirm={handleUnassign}
        onCancel={() => !unassigning && setUnassignTarget(null)}
      />
    </div>
  )
}
