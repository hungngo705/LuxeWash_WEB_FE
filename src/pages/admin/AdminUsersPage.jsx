import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  fetchUserById,
  fetchUsers,
  normalizeListUser,
  updateUserStatus,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'

const ROLE_TABS = ['All', 'Customer', 'Staff', 'Admin']
const PAGE_SIZE = 10

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
  })
  const [stats, setStats] = useState({ total: 0, customers: 0, staff: 0, blocked: 0 })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [statusTarget, setStatusTarget] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, roleFilter])

  const loadStats = useCallback(async () => {
    try {
      const [allResult, blockedResult] = await Promise.all([
        fetchUsers({ page: 1, pageSize: 1 }),
        fetchUsers({ page: 1, pageSize: 1, status: 'Blocked' }),
      ])
      const total = allResult?.totalItems ?? 0
      const blocked = blockedResult?.totalItems ?? 0
      setStats({
        total,
        customers: total,
        staff: 0,
        blocked,
      })
    } catch {
      // Stats are non-critical — list error is shown separately
    }
  }, [])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchUsers({
        page,
        pageSize: PAGE_SIZE,
        keyword: debouncedSearch || undefined,
      })
      const items = Array.isArray(data?.items) ? data.items.map(normalizeListUser) : []
      setUsers(items)
      setPagination({
        totalItems: data?.totalItems ?? items.length,
        totalPages: data?.totalPages ?? 1,
        currentPage: data?.currentPage ?? page,
      })
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách người dùng')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const filtered = useMemo(() => {
    if (roleFilter === 'All') return users
    return users.filter((u) => u.role === roleFilter)
  }, [users, roleFilter])

  const selectUser = async (user) => {
    setSelectedUser({ ...user })
    setDetailLoading(true)
    try {
      const detail = await fetchUserById(user.userId)
      setSelectedUser((prev) => ({
        ...prev,
        ...detail,
        role: user.role,
        userStatus: user.userStatus,
        tierName: detail.tierName ?? user.tierName,
      }))
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không tải được chi tiết người dùng')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleStatusChange = async () => {
    if (!statusTarget || updatingStatus) return

    const nextStatus = statusTarget.userStatus === 'Blocked' ? 'Active' : 'Blocked'

    setUpdatingStatus(true)
    try {
      await updateUserStatus(statusTarget.userId, nextStatus)
      setStatusTarget(null)
      showToast(nextStatus === 'Blocked' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản')
      await Promise.all([loadUsers(), loadStats()])
      if (selectedUser?.userId === statusTarget.userId) {
        setSelectedUser((prev) => (prev ? { ...prev, userStatus: nextStatus } : prev))
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không cập nhật được trạng thái')
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Người dùng hệ thống"
        description="Quản lý khách hàng — tìm kiếm, xem chi tiết, khóa/mở khóa tài khoản"
      />

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Tổng', value: stats.total, icon: 'group' },
          { label: 'Khách hàng', value: stats.customers, icon: 'person' },
          { label: 'Staff', value: stats.staff, icon: 'badge' },
          { label: 'Bị khóa', value: stats.blocked, icon: 'block' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">{stat.icon}</span>
              <div>
                <p className="text-xs text-on-surface-variant">{stat.label}</p>
                <p className="font-sora text-xl font-semibold text-on-surface">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-2.5 pr-4 pl-10 text-sm"
            placeholder="Tìm theo tên, SĐT, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                roleFilter === tab
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
              }`}
              onClick={() => setRoleFilter(tab)}
            >
              {tab === 'All' ? 'Tất cả' : tab}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="rounded-lg border border-error/30 px-3 py-1.5 text-sm font-medium text-error hover:bg-error-container/20"
            onClick={loadUsers}
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          {loading ? (
            <p className="text-sm text-on-surface-variant">Đang tải người dùng…</p>
          ) : filtered.length === 0 && !loadError ? (
            <EmptyState icon="person_search" title="Không tìm thấy người dùng" />
          ) : (
            <>
              <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                      <th className="px-4 py-3">Họ tên</th>
                      <th className="px-4 py-3">SĐT</th>
                      <th className="px-4 py-3">Vai trò</th>
                      <th className="px-4 py-3">Hạng</th>
                      <th className="px-4 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {filtered.map((user) => (
                      <tr
                        key={user.userId}
                        className={`cursor-pointer hover:bg-surface-container-low/50 ${
                          selectedUser?.userId === user.userId ? 'bg-primary-container/10' : ''
                        }`}
                        onClick={() => selectUser(user)}
                      >
                        <td className="px-4 py-3 font-medium text-on-surface">{user.fullName}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{user.phoneNumber}</td>
                        <td className="px-4 py-3 text-on-surface">{user.role}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{user.tierName ?? '—'}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={user.userStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <p className="text-on-surface-variant">
                    Trang {pagination.currentPage} / {pagination.totalPages} · {pagination.totalItems}{' '}
                    người dùng
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-outline-variant px-3 py-1.5 disabled:opacity-50"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Trước
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-outline-variant px-3 py-1.5 disabled:opacity-50"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="xl:col-span-5">
          {selectedUser ? (
            <div className="glass-panel soft-shadow sticky top-20 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary-container bg-surface-container-low">
                  <span className="material-symbols-outlined text-3xl text-primary">person</span>
                </div>
                <div>
                  <h3 className="font-sora text-xl font-semibold text-on-surface">
                    {selectedUser.fullName}
                  </h3>
                  <p className="text-sm text-on-surface-variant">{selectedUser.role}</p>
                  <StatusBadge status={selectedUser.userStatus} />
                </div>
              </div>

              {detailLoading ? (
                <p className="text-sm text-on-surface-variant">Đang tải chi tiết…</p>
              ) : (
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-semibold text-on-surface-variant uppercase">SĐT</dt>
                    <dd className="text-on-surface">{selectedUser.phoneNumber}</dd>
                  </div>
                  {selectedUser.tierName && (
                    <div>
                      <dt className="text-xs font-semibold text-on-surface-variant uppercase">Hạng</dt>
                      <dd className="text-on-surface">{selectedUser.tierName}</dd>
                    </div>
                  )}
                  {selectedUser.totalPoint != null && (
                    <div>
                      <dt className="text-xs font-semibold text-on-surface-variant uppercase">
                        Tổng điểm
                      </dt>
                      <dd className="text-on-surface">
                        {selectedUser.totalPoint.toLocaleString('vi-VN')}
                      </dd>
                    </div>
                  )}
                  {selectedUser.promotionPoint != null && (
                    <div>
                      <dt className="text-xs font-semibold text-on-surface-variant uppercase">
                        Điểm khuyến mãi
                      </dt>
                      <dd className="text-on-surface">
                        {selectedUser.promotionPoint.toLocaleString('vi-VN')}
                      </dd>
                    </div>
                  )}
                  {selectedUser.churnScore != null && (
                    <div>
                      <dt className="text-xs font-semibold text-on-surface-variant uppercase">
                        Churn score
                      </dt>
                      <dd className="text-on-surface">{selectedUser.churnScore}</dd>
                    </div>
                  )}
                  {selectedUser.lastVisitDate && (
                    <div>
                      <dt className="text-xs font-semibold text-on-surface-variant uppercase">
                        Lần ghé gần nhất
                      </dt>
                      <dd className="text-on-surface">{selectedUser.lastVisitDate}</dd>
                    </div>
                  )}
                  {selectedUser.vehicles?.length > 0 && (
                    <div>
                      <dt className="mb-2 text-xs font-semibold text-on-surface-variant uppercase">
                        Xe ({selectedUser.vehicles.length})
                      </dt>
                      <dd className="space-y-1">
                        {selectedUser.vehicles.map((v) => (
                          <div
                            key={v.licensePlate || `${v.vehicleType}-${v.displayName}`}
                            className="rounded-lg bg-surface-container-low px-3 py-2"
                          >
                            <p className="font-medium text-on-surface">
                              {v.licensePlate || '—'}
                            </p>
                            {(v.displayName || v.vehicleType || v.vehicleTypeName) && (
                              <p className="text-sm text-on-surface-variant">
                                {[v.displayName, v.vehicleType || v.vehicleTypeName]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              {selectedUser.role === 'Customer' && !detailLoading && (
                <button
                  type="button"
                  className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${
                    selectedUser.userStatus === 'Blocked'
                      ? 'bg-primary text-on-primary'
                      : 'border border-error/30 text-error hover:bg-error-container/20'
                  }`}
                  onClick={() => setStatusTarget(selectedUser)}
                >
                  {selectedUser.userStatus === 'Blocked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                </button>
              )}
            </div>
          ) : (
            <div className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-on-surface-variant">
              <span className="material-symbols-outlined mb-2 text-4xl opacity-50">person</span>
              <p className="text-sm">Chọn người dùng để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.userStatus === 'Blocked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
        message={
          statusTarget?.userStatus === 'Blocked'
            ? `Mở khóa tài khoản của ${statusTarget?.fullName}?`
            : `Khóa tài khoản của ${statusTarget?.fullName}? Khách hàng sẽ không thể sử dụng dịch vụ.`
        }
        confirmLabel={updatingStatus ? 'Đang xử lý…' : 'Xác nhận'}
        variant={statusTarget?.userStatus === 'Blocked' ? 'default' : 'danger'}
        onConfirm={handleStatusChange}
        onCancel={() => !updatingStatus && setStatusTarget(null)}
      />
    </div>
  )
}
