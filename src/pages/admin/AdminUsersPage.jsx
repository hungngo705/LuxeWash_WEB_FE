import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  fetchUserById,
  fetchUserPointsHistory,
  fetchUsers,
  normalizeListUser,
  syncUserPoints,
  updateUserStatus,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import Input from '../../components/ui/Input'
import { Skeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'

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
  const [syncingPoints, setSyncingPoints] = useState(false)
  const toast = useToast()

  const [pointsHistoryOpen, setPointsHistoryOpen] = useState(false)
  const [pointsHistory, setPointsHistory] = useState([])
  const [loadingPointsHistory, setLoadingPointsHistory] = useState(false)

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
      toast.error(err instanceof ApiError ? err.message : 'Không tải được chi tiết')
      setSelectedUser(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleOpenPointsHistory = async (userId) => {
    setPointsHistoryOpen(true)
    setLoadingPointsHistory(true)
    try {
      const data = await fetchUserPointsHistory(userId)
      setPointsHistory(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không tải được lịch sử điểm')
    } finally {
      setLoadingPointsHistory(false)
    }
  }

  const handleStatusChange = async () => {
    if (!statusTarget || updatingStatus) return

    const nextStatus = statusTarget.userStatus === 'Blocked' ? 'Active' : 'Blocked'

    setUpdatingStatus(true)
    try {
      await updateUserStatus(statusTarget.userId, nextStatus)
      setStatusTarget(null)
      toast.success(nextStatus === 'Blocked' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản')
      await Promise.all([loadUsers(), loadStats()])
      if (selectedUser?.userId === statusTarget.userId) {
        setSelectedUser((prev) => (prev ? { ...prev, userStatus: nextStatus } : prev))
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không cập nhật được trạng thái')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleSyncPoints = async () => {
    if (syncingPoints) return
    setSyncingPoints(true)
    try {
      await syncUserPoints()
      toast.success('Đã đồng bộ điểm thành viên')
      await loadUsers()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không đồng bộ được điểm')
    } finally {
      setSyncingPoints(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Khách hàng"
        title="Người dùng hệ thống"
        description="Quản lý khách hàng — tìm kiếm, xem chi tiết, khóa/mở khóa tài khoản"
        actionLabel={syncingPoints ? 'Đang đồng bộ…' : 'Đồng bộ điểm'}
        actionIcon="sync"
        onAction={handleSyncPoints}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Tổng', value: stats.total, icon: 'group' },
          { label: 'Khách hàng', value: stats.customers, icon: 'person' },
          { label: 'Staff', value: stats.staff, icon: 'badge' },
          { label: 'Bị khóa', value: stats.blocked, icon: 'block' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="lw-card-hover flex items-center gap-3 rounded-xl border border-outline-variant/60 bg-white p-4 shadow-lw-sm"
          >
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {stat.icon}
            </span>
            <div>
              <p className="text-xs text-on-surface-variant">{stat.label}</p>
              <p className="font-sora text-xl font-semibold text-on-surface">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Input
            iconLeft="search"
            placeholder="Tìm theo tên, SĐT, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
                roleFilter === tab
                  ? 'bg-primary text-on-primary shadow-sm'
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
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="rounded-lg border border-error/40 px-3 py-1.5 text-sm font-medium text-error transition-colors hover:bg-error-container/40"
            onClick={loadUsers}
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          {loading ? (
            <div className="lw-card space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height="48px" />
              ))}
            </div>
          ) : (
            <>
              <DataTable
                data={filtered}
                loading={loading}
                minWidth="640px"
                emptyIcon="person_search"
                emptyTitle="Không tìm thấy người dùng"
                emptyMessage="Thử thay đổi từ khóa hoặc bộ lọc vai trò."
                columns={[
                  {
                    key: 'fullName',
                    label: 'Họ tên',
                    render: (row) => (
                      <button
                        type="button"
                        className={`text-left font-medium transition-colors ${
                          selectedUser?.userId === row.userId
                            ? 'text-primary'
                            : 'text-on-surface hover:text-primary'
                        }`}
                        onClick={() => selectUser(row)}
                      >
                        {row.fullName}
                      </button>
                    ),
                  },
                  {
                    key: 'phoneNumber',
                    label: 'SĐT',
                    render: (row) => row.phoneNumber,
                    tdClassName: 'text-on-surface-variant',
                  },
                  {
                    key: 'role',
                    label: 'Vai trò',
                    render: (row) => row.role,
                  },
                  {
                    key: 'tierName',
                    label: 'Hạng',
                    render: (row) => row.tierName ?? '—',
                    tdClassName: 'text-on-surface-variant',
                  },
                  {
                    key: 'userStatus',
                    label: 'Trạng thái',
                    width: '140px',
                    render: (row) => <StatusBadge status={row.userStatus} />,
                  },
                ]}
              />

              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <p className="text-on-surface-variant">
                    Trang {pagination.currentPage} / {pagination.totalPages} · {pagination.totalItems}{' '}
                    người dùng
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-outline-variant bg-white px-3 py-1.5 transition-colors hover:bg-surface-variant disabled:opacity-50"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Trước
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-outline-variant bg-white px-3 py-1.5 transition-colors hover:bg-surface-variant disabled:opacity-50"
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
            <div className="lw-card sticky top-20 rounded-xl p-6">
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary-container bg-primary-container/30">
                  <span
                    className="material-symbols-outlined text-3xl text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    person
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-sora text-xl font-semibold text-on-surface">
                    {selectedUser.fullName}
                  </h3>
                  <p className="text-sm text-on-surface-variant">{selectedUser.role}</p>
                  <div className="mt-1.5">
                    <StatusBadge status={selectedUser.userStatus} />
                  </div>
                </div>
              </div>

              {detailLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} height="20px" />
                  ))}
                </div>
              ) : (
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
                      SĐT
                    </dt>
                    <dd className="text-on-surface">{selectedUser.phoneNumber}</dd>
                  </div>
                  {selectedUser.tierName && (
                    <div>
                      <dt className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
                        Hạng
                      </dt>
                      <dd className="text-on-surface">{selectedUser.tierName}</dd>
                    </div>
                  )}
                  {selectedUser.totalPoint != null && (
                    <div>
                      <dt className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
                        Tổng điểm
                      </dt>
                      <dd className="text-on-surface">
                        {selectedUser.totalPoint.toLocaleString('vi-VN')}
                      </dd>
                    </div>
                  )}
                  {selectedUser.promotionPoint != null && (
                    <div>
                      <dt className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
                        Điểm khuyến mãi
                      </dt>
                      <dd className="text-on-surface">
                        {selectedUser.promotionPoint.toLocaleString('vi-VN')}
                      </dd>
                    </div>
                  )}
                  {selectedUser.totalPoint != null && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPointsHistory(selectedUser.userId)}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                      >
                        <span
                          className="material-symbols-outlined text-[16px]"
                          style={{ fontVariationSettings: "'FILL' 0" }}
                        >
                          history
                        </span>
                        Xem lịch sử giao dịch điểm
                      </button>
                    </div>
                  )}
                  {selectedUser.churnScore != null && (
                    <div>
                      <dt className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
                        Churn score
                      </dt>
                      <dd className="text-on-surface">{selectedUser.churnScore}</dd>
                    </div>
                  )}
                  {selectedUser.lastVisitDate && (
                    <div>
                      <dt className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
                        Lần ghé gần nhất
                      </dt>
                      <dd className="text-on-surface">{selectedUser.lastVisitDate}</dd>
                    </div>
                  )}
                  {selectedUser.vehicles?.length > 0 && (
                    <div>
                      <dt className="mb-2 text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
                        Xe ({selectedUser.vehicles.length})
                      </dt>
                      <dd className="space-y-1">
                        {selectedUser.vehicles.map((v) => (
                          <div
                            key={v.licensePlate || `${v.vehicleType}-${v.displayName}`}
                            className="rounded-lg bg-surface-container-low px-3 py-2"
                          >
                            <p className="font-medium text-on-surface">{v.licensePlate || '—'}</p>
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
                  className={`mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                    selectedUser.userStatus === 'Blocked'
                      ? 'bg-primary text-on-primary hover:bg-primary/90'
                      : 'border border-error/40 text-error hover:bg-error-container/40'
                  }`}
                  onClick={() => setStatusTarget(selectedUser)}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    {selectedUser.userStatus === 'Blocked' ? 'lock_open' : 'lock'}
                  </span>
                  {selectedUser.userStatus === 'Blocked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                </button>
              )}
            </div>
          ) : (
            <div className="lw-card rounded-xl p-8 text-center text-on-surface-variant">
              <span
                className="material-symbols-outlined mb-2 text-4xl opacity-50"
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                person
              </span>
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
        loading={updatingStatus}
        variant={statusTarget?.userStatus === 'Blocked' ? 'default' : 'danger'}
        onConfirm={handleStatusChange}
        onCancel={() => !updatingStatus && setStatusTarget(null)}
      />

      {pointsHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Đóng"
            onClick={() => setPointsHistoryOpen(false)}
          />
          <div className="lw-panel-enter relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-lw-xl">
            <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
              <h3 className="font-sora text-lg font-semibold text-on-surface">Lịch sử điểm</h3>
              <button
                type="button"
                onClick={() => setPointsHistoryOpen(false)}
                className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {loadingPointsHistory ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} height="48px" />
                  ))}
                </div>
              ) : pointsHistory.length === 0 ? (
                <p className="py-8 text-center text-on-surface-variant">
                  Không có giao dịch nào.
                </p>
              ) : (
                <div className="lw-table-container overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="lw-table-header">
                        <th>Thời gian</th>
                        <th>Biến động</th>
                        <th>Lý do</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pointsHistory.map((pt) => {
                        const net = (pt.pointsAdded || 0) - (pt.pointsDeducted || 0)
                        return (
                          <tr key={pt.ledgerId} className="lw-table-row border-t border-outline-variant/40">
                            <td className="text-on-surface">
                              {pt.transactionDate
                                ? new Date(pt.transactionDate).toLocaleString('vi-VN')
                                : '—'}
                            </td>
                            <td>
                              <span
                                className={`font-semibold ${
                                  net > 0
                                    ? 'text-primary'
                                    : net < 0
                                      ? 'text-error'
                                      : 'text-on-surface-variant'
                                }`}
                              >
                                {net > 0 ? '+' : ''}
                                {net}
                              </span>
                            </td>
                            <td className="text-on-surface-variant">{pt.reason || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}