import { useMemo, useState } from 'react'
import EmptyState from '../../components/admin/shared/EmptyState'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import { getUserStats, initialAdminUsers } from '../../data/mockAdminUsers'
import { formatVnd } from '../../utils/format'

const ROLE_TABS = ['All', 'Customer', 'Staff', 'Admin']

export default function AdminUsersPage() {
  const [users, setUsers] = useState(initialAdminUsers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [selectedKey, setSelectedKey] = useState(null)

  const stats = useMemo(() => getUserStats(users), [users])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      const matchRole = roleFilter === 'All' || u.role === roleFilter
      const matchSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.phoneNumber.includes(q) ||
        u.email?.toLowerCase().includes(q)
      return matchRole && matchSearch
    })
  }, [users, search, roleFilter])

  const selectedUser = useMemo(
    () => users.find((u) => `${u.role}-${u.userId}` === selectedKey) ?? null,
    [users, selectedKey],
  )

  const toggleBan = (user) => {
    const newStatus = user.userStatus === 'Blocked' ? 'Active' : 'Blocked'
    setUsers((prev) =>
      prev.map((u) =>
        u.userId === user.userId && u.role === user.role
          ? { ...u, userStatus: newStatus }
          : u,
      ),
    )
    window.alert(`${newStatus === 'Blocked' ? 'Đã khóa' : 'Đã mở khóa'} tài khoản (mock)`)
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Người dùng hệ thống"
        description="Quản lý Customer, Staff và Admin"
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          {filtered.length === 0 ? (
            <EmptyState icon="person_search" title="Không tìm thấy người dùng" />
          ) : (
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
                      key={`${user.role}-${user.userId}`}
                      className={`cursor-pointer hover:bg-surface-container-low/50 ${
                        selectedKey === `${user.role}-${user.userId}` ? 'bg-primary-container/10' : ''
                      }`}
                      onClick={() => setSelectedKey(`${user.role}-${user.userId}`)}
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
          )}
        </div>

        <div className="xl:col-span-5">
          {selectedUser ? (
            <div className="glass-panel soft-shadow sticky top-20 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
              <div className="mb-4 flex items-start gap-4">
                {selectedUser.avatar && (
                  <img
                    alt={selectedUser.fullName}
                    className="h-16 w-16 rounded-full border-2 border-primary-container object-cover"
                    src={selectedUser.avatar}
                  />
                )}
                <div>
                  <h3 className="font-sora text-xl font-semibold text-on-surface">
                    {selectedUser.fullName}
                  </h3>
                  <p className="text-sm text-on-surface-variant">{selectedUser.role}</p>
                  <StatusBadge status={selectedUser.userStatus} />
                </div>
              </div>

              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-on-surface-variant uppercase">SĐT</dt>
                  <dd className="text-on-surface">{selectedUser.phoneNumber}</dd>
                </div>
                {selectedUser.email && (
                  <div>
                    <dt className="text-xs font-semibold text-on-surface-variant uppercase">Email</dt>
                    <dd className="text-on-surface">{selectedUser.email}</dd>
                  </div>
                )}
                {selectedUser.tierName && (
                  <div>
                    <dt className="text-xs font-semibold text-on-surface-variant uppercase">Hạng</dt>
                    <dd className="text-on-surface">{selectedUser.tierName}</dd>
                  </div>
                )}
                {selectedUser.userScore != null && (
                  <div>
                    <dt className="text-xs font-semibold text-on-surface-variant uppercase">Điểm</dt>
                    <dd className="text-on-surface">{selectedUser.userScore.toLocaleString('vi-VN')}</dd>
                  </div>
                )}
                {selectedUser.walletBalance != null && (
                  <div>
                    <dt className="text-xs font-semibold text-on-surface-variant uppercase">Ví</dt>
                    <dd className="text-on-surface">{formatVnd(selectedUser.walletBalance)}</dd>
                  </div>
                )}
                {selectedUser.station && (
                  <div>
                    <dt className="text-xs font-semibold text-on-surface-variant uppercase">Trạm</dt>
                    <dd className="text-on-surface">{selectedUser.station}</dd>
                  </div>
                )}
                {selectedUser.vehicles?.length > 0 && (
                  <div>
                    <dt className="mb-2 text-xs font-semibold text-on-surface-variant uppercase">
                      Xe ({selectedUser.vehicles.length})
                    </dt>
                    <dd className="space-y-1">
                      {selectedUser.vehicles.map((v) => (
                        <p key={v.licensePlate} className="rounded-lg bg-surface-container-low px-3 py-2 text-on-surface">
                          {v.licensePlate} · {v.vehicleTypeName}
                        </p>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>

              {selectedUser.role === 'Customer' && (
                <button
                  type="button"
                  className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${
                    selectedUser.userStatus === 'Blocked'
                      ? 'bg-primary text-on-primary'
                      : 'border border-error/30 text-error hover:bg-error-container/20'
                  }`}
                  onClick={() => toggleBan(selectedUser)}
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
    </div>
  )
}
