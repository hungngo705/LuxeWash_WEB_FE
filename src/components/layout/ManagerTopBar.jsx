import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchCurrentUser } from '../../api/auth.api'
import { fetchBranches } from '../../api/admin.branches.api'

export default function ManagerTopBar({ title = 'Manager Console' }) {
  const { user } = useAuth()
  const manager = user
  const navigate = useNavigate()
  const [branch, setBranch] = useState(null)
  const managerId = manager?.userId
  const sessionBranchId = manager?.branchId

  useEffect(() => {
    const controller = new AbortController()
    async function loadBranch() {
      let branchId = sessionBranchId
      try {
        const profile = await fetchCurrentUser({ signal: controller.signal })
        branchId = profile.branchId ?? profile.BranchId
        const branchName = String(profile.branchName ?? '').trim()
        if (!Number.isFinite(Number(branchId)) || Number(branchId) <= 0) {
          if (!controller.signal.aborted) setBranch({ managerId, label: 'Chưa được phân công chi nhánh' })
          return
        }
        if (branchName) {
          if (!controller.signal.aborted) setBranch({ managerId, label: branchName })
          return
        }
      } catch {
        if (controller.signal.aborted) return
      }
      if (!Number.isFinite(Number(branchId)) || Number(branchId) <= 0) {
        if (!controller.signal.aborted) setBranch({ managerId, label: 'Không tải được thông tin chi nhánh' })
        return
      }
      try {
        const branches = await fetchBranches({ signal: controller.signal })
        const assigned = branches.find((item) => item.id === Number(branchId))
        if (!controller.signal.aborted) setBranch({ managerId, label: assigned?.name || `Chi nhánh #${branchId}` })
      } catch {
        if (!controller.signal.aborted) setBranch({ managerId, label: `Chi nhánh #${branchId}` })
      }
    }
    if (managerId != null) loadBranch()
    return () => controller.abort()
  }, [managerId, sessionBranchId])

  const branchLabel = branch?.managerId === managerId ? branch.label : 'Đang tải chi nhánh…'

  return (
    <header className="fixed top-0 right-0 left-64 z-40 h-16 border-b border-outline-variant bg-surface-container-lowest">
      <div className="flex h-full items-center justify-between px-6">
        <div className="min-w-0 pr-4">
          <h2 className="truncate font-sora text-xl font-semibold text-on-surface">{title}</h2>
          <p className="flex items-center gap-1 text-xs font-medium text-primary" title={branchLabel}>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">store</span>
            <span className="truncate">{branchLabel}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className="rounded-full bg-tertiary-container px-3 py-1 text-xs font-semibold tracking-wider text-on-tertiary-container uppercase">
            Manager
          </span>
          <div className="mx-1 h-6 w-px bg-outline-variant" />
          <button
            type="button"
            onClick={() => navigate('/manager/settings')}
            className="flex items-center gap-3 rounded-full pr-2 cursor-pointer transition-opacity hover:opacity-80"
            aria-label="Mở trang Cài đặt"
          >
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-on-surface">{manager?.fullName}</p>
              <p className="text-xs text-on-surface-variant">{manager?.email ?? manager?.phoneNumber}</p>
            </div>
            {manager?.avatar && (
              <img
                alt={manager.fullName}
                className="h-8 w-8 rounded-full border border-outline-variant object-cover"
                src={manager.avatar}
              />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
