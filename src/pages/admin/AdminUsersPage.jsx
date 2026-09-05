import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  fetchUserById,
  fetchUserPointsHistory,
  fetchUserRoleStats,
  fetchUserServiceHistory,
  fetchUsers,
  normalizeListUser,
  syncUserPoints,
  updateUserStatus,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'

/**
 * Map reason từ BE (thường là tiếng Anh / chuỗi kỹ thuật)
 * sang tiếng Việt để hiển thị cho admin.
 * Nếu không khớp pattern nào, trả về nguyên reason gốc.
 */
function translatePointsReason(rawReason) {
  if (!rawReason || typeof rawReason !== 'string') return ''
  const r = rawReason.trim()

  // Redeem voucher (BE trả 'Redeem voucher' hoặc có kèm tên voucher)
  if (/^redeem\s+voucher(\s|$|:)/i.test(r)) {
    // Cố gắng giữ phần phía sau dấu ':' nếu có tên voucher
    const colonIdx = r.indexOf(':')
    if (colonIdx > 0 && r.length > colonIdx + 1) {
      return `Đổi điểm lấy voucher: ${r.slice(colonIdx + 1).trim()}`
    }
    return 'Đổi điểm lấy voucher'
  }

  // Service completion #123 -> Hoàn thành dịch vụ #123
  // Chấp nhận cả 'Service completion #366', 'service-completion #366', 'ServiceCompletion #366'
  const svcMatch = r.match(/^service[\s_-]*completion\s*#?(\d+)$/i)
  if (svcMatch) {
    return `Hoàn thành dịch vụ #${svcMatch[1]}`
  }

  // Một vài reason phổ biến khác (mở rộng khi cần):
  if (/^earn$/i.test(r)) return 'Tích điểm'
  if (/^redeem$/i.test(r)) return 'Đổi điểm'
  if (/^refund$/i.test(r)) return 'Hoàn điểm'
  if (/^adjust$/i.test(r)) return 'Điều chỉnh điểm'
  if (/^birthday$/i.test(r)) return 'Thưởng sinh nhật'
  if (/^manual$/i.test(r)) return 'Điều chỉnh thủ công'

  return r // fallback: trả về reason gốc
}

const ROLE_TABS = ['All', 'Customer', 'Staff', 'Manager', 'Business']
const PAGE_SIZE = 10

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
  })
  const [stats, setStats] = useState({ total: 0, customers: 0, staff: 0, managers: 0, businesses: 0, blocked: 0 })
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
  const [toast, setToast] = useState('')

  const [detailTab, setDetailTab] = useState('info') // 'info' | 'points' | 'services'
  const [pointsHistory, setPointsHistory] = useState([])
  const [loadingPointsHistory, setLoadingPointsHistory] = useState(false)
  const [pointsHistoryLoaded, setPointsHistoryLoaded] = useState(false)
  const [serviceHistory, setServiceHistory] = useState([])
  const [loadingServiceHistory, setLoadingServiceHistory] = useState(false)
  const [serviceHistoryLoaded, setServiceHistoryLoaded] = useState(false)

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
      const data = await fetchUserRoleStats()
      setStats({
        total: data?.total ?? 0,
        customers: data?.customer ?? 0,
        staff: data?.staff ?? 0,
        managers: data?.manager ?? 0,
        businesses: data?.business ?? 0,
        blocked: data?.blocked ?? 0,
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
        role: roleFilter !== 'All' ? roleFilter : undefined,
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
  }, [page, debouncedSearch, roleFilter])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const selectUser = async (user) => {
    setSelectedUser({ ...user })
    setDetailTab('info')
    setPointsHistory([])
    setPointsHistoryLoaded(false)
    setServiceHistory([])
    setServiceHistoryLoaded(false)
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
      showToast(err instanceof ApiError ? err.message : 'Không tải được chi tiết')
      setSelectedUser(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleOpenPointsHistory = async (userId) => {
    setDetailTab('points')
    if (pointsHistoryLoaded) return
    setLoadingPointsHistory(true)
    try {
      const data = await fetchUserPointsHistory(userId)
      setPointsHistory(Array.isArray(data) ? data : [])
      setPointsHistoryLoaded(true)
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không tải được lịch sử điểm')
    } finally {
      setLoadingPointsHistory(false)
    }
  }

  const handleOpenServiceHistory = async (userId) => {
    setDetailTab('services')
    if (serviceHistoryLoaded) return
    setLoadingServiceHistory(true)
    try {
      const data = await fetchUserServiceHistory(userId)
      setServiceHistory(Array.isArray(data) ? data : [])
      setServiceHistoryLoaded(true)
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không tải được lịch sử dịch vụ')
    } finally {
      setLoadingServiceHistory(false)
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

  const handleSyncPoints = async () => {
    if (syncingPoints) return
    setSyncingPoints(true)
    try {
      await syncUserPoints()
      showToast('Đã đồng bộ điểm thành viên')
      await loadUsers()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không đồng bộ được điểm')
    } finally {
      setSyncingPoints(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Người dùng hệ thống"
        description="Quản lý khách hàng — tìm kiếm, xem chi tiết, khóa/mở khóa tài khoản"
        actionLabel={syncingPoints ? 'Đang đồng bộ…' : 'Đồng bộ điểm'}
        actionIcon="sync"
        onAction={handleSyncPoints}
      />

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Tổng', value: stats.total, icon: 'group' },
          { label: 'Khách hàng', value: stats.customers, icon: 'person' },
          { label: 'Staff', value: stats.staff, icon: 'badge' },
          { label: 'Quản lý', value: stats.managers, icon: 'supervisor_account' },
          { label: 'Doanh nghiệp', value: stats.businesses, icon: 'apartment' },
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
          ) : users.length === 0 && !loadError ? (
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
                    {users.map((user) => (
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
            <div className="glass-panel soft-shadow sticky top-20 flex max-h-[calc(100vh-6rem)] flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
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

              <div className="mb-4 flex flex-wrap gap-2 border-b border-outline-variant pb-3">
                {[
                  { key: 'info', label: 'Thông tin' },
                  { key: 'points', label: 'Lịch sử điểm' },
                  { key: 'services', label: 'Lịch sử dịch vụ' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      detailTab === tab.key
                        ? 'bg-primary text-on-primary'
                        : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
                    }`}
                    onClick={() => {
                      if (tab.key === 'points') handleOpenPointsHistory(selectedUser.userId)
                      else if (tab.key === 'services') handleOpenServiceHistory(selectedUser.userId)
                      else setDetailTab(tab.key)
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-auto">
                {detailTab === 'info' &&
                  (detailLoading ? (
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
                  ))}

                {detailTab === 'points' && (
                  <div className="space-y-2">
                    <h4 className="font-sora text-base font-semibold text-on-surface">
                      Biến động điểm thưởng
                    </h4>
                    {loadingPointsHistory ? (
                      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
                        Đang tải lịch sử điểm…
                      </div>
                    ) : pointsHistory.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-outline-variant py-8 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-3xl opacity-50">stars</span>
                        <p className="text-sm">Chưa có giao dịch điểm nào.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pointsHistory.map((pt) => {
                          const added = Number(pt.pointsAdded ?? 0)
                          const deducted = Number(pt.pointsDeducted ?? 0)
                          const net = added - deducted
                          const netClass =
                            net > 0
                              ? 'text-primary'
                              : net < 0
                                ? 'text-error'
                                : 'text-on-surface-variant'
                          return (
                            <div
                              key={pt.ledgerId}
                              className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-colors hover:bg-surface-container-low/40"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-sm font-medium whitespace-nowrap text-on-surface-variant">
                                  {pt.transactionDate
                                    ? new Date(pt.transactionDate).toLocaleString('vi-VN')
                                    : '—'}
                                </span>
                                <span
                                  className={`text-lg font-bold tabular-nums whitespace-nowrap ${netClass}`}
                                >
                                  {net > 0 ? '+' : ''}
                                  {net.toLocaleString('vi-VN')}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-on-surface">
                                {translatePointsReason(pt.reason) || '—'}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {detailTab === 'services' && (
                  <div className="space-y-2">
                    <h4 className="font-sora text-base font-semibold text-on-surface">
                      Lịch sử sử dụng dịch vụ
                    </h4>
                    {loadingServiceHistory ? (
                      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
                        Đang tải lịch sử dịch vụ…
                      </div>
                    ) : serviceHistory.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-outline-variant py-8 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-3xl opacity-50">
                          local_car_wash
                        </span>
                        <p className="text-sm">Khách hàng chưa sử dụng dịch vụ nào.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {serviceHistory.map((bk) => {
                          const dateRaw = bk.scheduledTime || bk.scheduledDate
                          const amount = Number(bk.finalAmount ?? 0)
                          const isPaid = bk.paymentStatus === 'Paid'
                          const subServices = Array.isArray(bk.details)
                            ? bk.details
                                .map((d) => d?.serviceName)
                                .filter((n) => n && n !== bk.serviceName)
                            : []
                          return (
                            <div
                              key={bk.bookingId}
                              className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-colors hover:bg-surface-container-low/40"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-sm font-medium whitespace-nowrap text-on-surface-variant">
                                  {dateRaw ? new Date(dateRaw).toLocaleString('vi-VN') : '—'}
                                </span>
                                <span
                                  className={`text-lg font-bold tabular-nums whitespace-nowrap ${
                                    isPaid ? 'text-primary' : 'text-on-surface-variant'
                                  }`}
                                >
                                  {amount.toLocaleString('vi-VN')} ₫
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <span className="font-medium text-on-surface">
                                  {bk.licensePlate || '—'}
                                </span>
                                <span className="text-on-surface-variant">·</span>
                                <span className="text-on-surface-variant">
                                  {bk.serviceName || '—'}
                                </span>
                              </div>
                              {subServices.length > 0 && (
                                <p className="mt-1 text-xs text-on-surface-variant">
                                  + {subServices.join(', ')}
                                </p>
                              )}
                              <div className="mt-3 flex flex-wrap gap-2">
                                <StatusBadge status={bk.status} />
                                <StatusBadge status={bk.paymentStatus} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedUser.role === 'Customer' && !detailLoading && detailTab === 'info' && (
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
