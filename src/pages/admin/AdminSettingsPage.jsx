import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, API_BASE_URL, changePassword, fetchCurrentUser, updateCurrentUserProfile } from '../../api'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/admin/shared/PageHeader'
import Input from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'

const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d).{8,}$/

function normalizeProfile(profile, user) {
  return {
    fullName: profile?.fullName ?? user?.fullName ?? '',
    phoneNumber: profile?.phoneNumber ?? user?.phoneNumber ?? '',
    email: profile?.email ?? user?.email ?? '',
    userId: profile?.userId ?? user?.userId,
    role: user?.role ?? 'Admin',
  }
}

export default function AdminSettingsPage() {
  const { user, logout, patchUser } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(() => normalizeProfile(null, user))
  const [profileForm, setProfileForm] = useState(() => normalizeProfile(null, user))
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const toast = useToast()

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true)
    setProfileError('')
    try {
      const data = await fetchCurrentUser()
      const normalized = normalizeProfile(data, user)
      setProfile(normalized)
      setProfileForm(normalized)
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Không tải được hồ sơ')
      const fallback = normalizeProfile(null, user)
      setProfile(fallback)
      setProfileForm(fallback)
    } finally {
      setLoadingProfile(false)
    }
  }, [user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (savingProfile) return

    if (!profileForm.fullName.trim()) {
      toast.error('Họ tên không được để trống')
      return
    }

    setSavingProfile(true)
    try {
      const payload = {
        fullName: profileForm.fullName.trim(),
        phoneNumber: profileForm.phoneNumber.trim(),
        email: profileForm.email.trim() || null,
      }
      const updated = await updateCurrentUserProfile(payload)
      const normalized = normalizeProfile(updated, user)
      setProfile(normalized)
      setProfileForm(normalized)
      patchUser({
        fullName: normalized.fullName,
        phoneNumber: normalized.phoneNumber,
        email: normalized.email,
      })
      toast.success('Đã cập nhật hồ sơ')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không cập nhật được hồ sơ')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (changingPassword) return

    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      toast.error('Vui lòng nhập đủ mật khẩu')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Mật khẩu mới không khớp')
      return
    }

    if (!PASSWORD_PATTERN.test(passwordForm.newPassword)) {
      toast.error('Mật khẩu mới cần ≥8 ký tự, có chữ hoa và số')
      return
    }

    setChangingPassword(true)
    try {
      await changePassword(passwordForm.oldPassword, passwordForm.newPassword)
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Đã đổi mật khẩu thành công')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không đổi được mật khẩu')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  const profileDirty =
    profileForm.fullName !== profile.fullName ||
    profileForm.phoneNumber !== profile.phoneNumber ||
    profileForm.email !== profile.email

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="Tài khoản"
        title="Cài đặt Admin"
        description="Tài khoản quản trị và bảo mật"
      />

      <section className="lw-card mb-6 overflow-hidden rounded-xl">
        <div className="border-b border-outline-variant bg-surface-container-low px-6 py-4">
          <h2 className="flex items-center gap-2 font-sora text-lg font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
            Tài khoản Admin
          </h2>
        </div>

        {loadingProfile ? (
          <p className="p-6 text-sm text-on-surface-variant">Đang tải hồ sơ…</p>
        ) : (
          <form className="p-6" onSubmit={handleSaveProfile}>
            {profileError && (
              <p className="mb-4 rounded-lg border border-error-container bg-error-container/30 px-3 py-2 text-sm text-error">
                {profileError}
              </p>
            )}

            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-tertiary-container bg-surface-container-low">
                <span className="material-symbols-outlined text-4xl text-primary">admin_panel_settings</span>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Họ tên"
                  required
                  value={profileForm.fullName}
                  disabled={savingProfile}
                  onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="sm:col-span-2"
                  iconLeft="person"
                />
                <Input
                  label="Số điện thoại"
                  value={profileForm.phoneNumber}
                  disabled={savingProfile}
                  onChange={(e) => setProfileForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  iconLeft="call"
                />
                <Input
                  label="Email"
                  type="email"
                  value={profileForm.email}
                  disabled={savingProfile}
                  onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="admin@example.com"
                  iconLeft="mail"
                />
                <div>
                  <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                    Vai trò
                  </p>
                  <p className="mt-2 text-on-surface">{profile.role}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                    Mã quản trị
                  </p>
                  <p className="mt-2 text-on-surface">#{profile.userId}</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
              disabled={savingProfile || !profileDirty}
            >
              {savingProfile ? 'Đang lưu…' : 'Lưu hồ sơ'}
            </button>
          </form>
        )}
      </section>

      <section className="lw-card mb-6 overflow-hidden rounded-xl">
        <div className="border-b border-outline-variant bg-surface-container-low px-6 py-4">
          <h2 className="flex items-center gap-2 font-sora text-lg font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary">lock</span>
            Đổi mật khẩu
          </h2>
        </div>
        <form className="space-y-4 p-6" onSubmit={handleChangePassword}>
          <Input
            label="Mật khẩu hiện tại"
            type="password"
            autoComplete="current-password"
            required
            value={passwordForm.oldPassword}
            disabled={changingPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, oldPassword: e.target.value }))}
            iconLeft="lock"
          />
          <Input
            label="Mật khẩu mới"
            type="password"
            autoComplete="new-password"
            required
            value={passwordForm.newPassword}
            disabled={changingPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
            iconLeft="key"
            helper="Ít nhất 8 ký tự, có chữ hoa và số"
          />
          <Input
            label="Xác nhận mật khẩu mới"
            type="password"
            autoComplete="new-password"
            required
            value={passwordForm.confirmPassword}
            disabled={changingPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            iconLeft="key"
          />
          <button
            type="submit"
            className="rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-variant disabled:opacity-50"
            disabled={changingPassword}
          >
            {changingPassword ? 'Đang xử lý…' : 'Đổi mật khẩu'}
          </button>
        </form>
      </section>

      <section className="lw-card mb-6 overflow-hidden rounded-xl">
        <div className="border-b border-outline-variant bg-surface-container-low px-6 py-4">
          <h2 className="flex items-center gap-2 font-sora text-lg font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary">info</span>
            Thông tin hệ thống
          </h2>
        </div>
        <dl className="divide-y divide-outline-variant/60">
          <div className="flex justify-between gap-4 px-6 py-4">
            <dt className="text-sm text-on-surface-variant">API</dt>
            <dd className="max-w-[60%] truncate text-right text-sm font-medium text-on-surface">
              {API_BASE_URL}
            </dd>
          </div>
          <div className="flex justify-between px-6 py-4">
            <dt className="text-sm text-on-surface-variant">Môi trường</dt>
            <dd className="rounded-full bg-tertiary-container/40 px-3 py-0.5 text-xs font-semibold text-on-tertiary-container">
              {import.meta.env.MODE}
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