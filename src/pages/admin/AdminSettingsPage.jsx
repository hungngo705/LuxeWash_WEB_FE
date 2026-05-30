import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminSettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6">
        <h1 className="font-sora text-2xl font-semibold text-on-surface">Cài đặt Admin</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Tài khoản quản trị và thông tin hệ thống
        </p>
      </div>

      <section className="glass-panel soft-shadow mb-6 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant bg-surface-container-low px-6 py-4">
          <h2 className="flex items-center gap-2 font-sora text-lg font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
            Tài khoản Admin
          </h2>
        </div>
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          {user.avatar && (
            <img
              alt={user.fullName}
              className="h-20 w-20 shrink-0 rounded-full border-2 border-tertiary-container object-cover"
              src={user.avatar}
            />
          )}
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Họ tên
              </p>
              <p className="font-sora text-xl font-semibold text-on-surface">{user.fullName}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                  Số điện thoại
                </p>
                <p className="text-on-surface">{user.phoneNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                  Email
                </p>
                <p className="text-on-surface">{user.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                  Vai trò
                </p>
                <p className="text-on-surface">{user.role}</p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                  Mã quản trị
                </p>
                <p className="text-on-surface">#{user.userId}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel soft-shadow mb-6 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant bg-surface-container-low px-6 py-4">
          <h2 className="flex items-center gap-2 font-sora text-lg font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary">info</span>
            Thông tin hệ thống
          </h2>
        </div>
        <dl className="divide-y divide-outline-variant/60">
          <div className="flex justify-between px-6 py-4">
            <dt className="text-sm text-on-surface-variant">Phiên bản FE</dt>
            <dd className="text-sm font-medium text-on-surface">0.0.0 (mock)</dd>
          </div>
          <div className="flex justify-between px-6 py-4">
            <dt className="text-sm text-on-surface-variant">Môi trường</dt>
            <dd className="rounded-full bg-tertiary-container/40 px-3 py-0.5 text-xs font-semibold text-on-tertiary-container">
              Demo
            </dd>
          </div>
          <div className="flex justify-between px-6 py-4">
            <dt className="text-sm text-on-surface-variant">Portal</dt>
            <dd className="text-sm font-medium text-on-surface">Admin Console</dd>
          </div>
        </dl>
      </section>

      <section className="glass-panel soft-shadow overflow-hidden rounded-xl border border-error-container/40 bg-surface-container-lowest">
        <div className="border-b border-outline-variant bg-surface-container-low px-6 py-4">
          <h2 className="flex items-center gap-2 font-sora text-lg font-semibold text-on-surface">
            <span className="material-symbols-outlined text-error">logout</span>
            Phiên làm việc
          </h2>
        </div>
        <div className="p-6">
          <p className="mb-4 text-sm text-on-surface-variant">
            Đăng xuất để kết thúc phiên Admin trên thiết bị này.
          </p>

          {!showConfirmDialog ? (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-error/30 bg-error-container/20 px-4 py-3 text-sm font-semibold tracking-wide text-error uppercase transition-colors hover:bg-error-container/40 sm:w-auto"
              onClick={() => setShowConfirmDialog(true)}
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Đăng xuất
            </button>
          ) : (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <p className="mb-4 text-sm font-medium text-on-surface">
                Bạn chắc chắn muốn đăng xuất?
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-lg bg-error px-4 py-2.5 text-sm font-semibold text-on-error transition-colors hover:bg-error/90"
                  onClick={handleLogout}
                >
                  Xác nhận đăng xuất
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-variant"
                  onClick={() => setShowConfirmDialog(false)}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
