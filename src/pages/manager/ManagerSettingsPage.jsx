import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ApiError, changePassword, fetchCurrentUser } from '../../api'
import { useToast } from '../../components/ui/Toast'

export default function ManagerSettingsPage() {
  const { user, logout, patchUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [profileForm, setProfileForm] = useState({ fullName: '', phoneNumber: '', email: '' })
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const toast = useToast()

  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchCurrentUser()
      setProfile(data)
      setProfileForm({
        fullName: data.fullName ?? '',
        phoneNumber: data.phoneNumber ?? '',
        email: data.email ?? '',
      })
    } catch {}
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const normalized = {
        fullName: profileForm.fullName.trim(),
        phoneNumber: profileForm.phoneNumber.trim(),
        email: profileForm.email.trim() || null,
      }
      await fetchCurrentUser()
      patchUser(normalized)
      toast.success('Đã lưu hồ sơ.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Lỗi khi lưu hồ sơ.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.warning('Mật khẩu mới không khớp.')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      toast.warning('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword(passwordForm.oldPassword, passwordForm.newPassword)
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Đã đổi mật khẩu thành công.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Lỗi khi đổi mật khẩu.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <h1 className="font-sora text-2xl font-semibold text-on-surface">Cài đặt Manager</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Quản lý thông tin tài khoản và mật khẩu
        </p>
      </div>

      {/* Profile */}
      <form onSubmit={handleSaveProfile} className="glass-panel mb-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <h2 className="mb-4 font-sora text-lg font-semibold text-on-surface">Thông tin tài khoản</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Họ tên</label>
            <input
              type="text"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5"
              value={profileForm.fullName}
              onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Số điện thoại</label>
            <input
              type="text"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5"
              value={profileForm.phoneNumber}
              onChange={(e) => setProfileForm((f) => ({ ...f, phoneNumber: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5"
              value={profileForm.email}
              onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container">Manager</span>
          </div>
          <button type="submit" disabled={savingProfile} className="rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-on-secondary disabled:opacity-60">
            {savingProfile ? 'Đang lưu…' : 'Lưu hồ sơ'}
          </button>
        </div>
      </form>

      {/* Password */}
      <form onSubmit={handleChangePassword} className="glass-panel mb-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <h2 className="mb-4 font-sora text-lg font-semibold text-on-surface">Đổi mật khẩu</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Mật khẩu hiện tại</label>
            <input type="password" className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5" value={passwordForm.oldPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, oldPassword: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Mật khẩu mới</label>
            <input type="password" className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Xác nhận mật khẩu mới</label>
            <input type="password" className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))} />
          </div>
          <button type="submit" disabled={savingPassword} className="rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-on-secondary disabled:opacity-60">
            {savingPassword ? 'Đang đổi…' : 'Đổi mật khẩu'}
          </button>
        </div>
      </form>

      {/* Logout */}
      <div className="glass-panel rounded-xl border border-error-container/40 bg-surface-container-lowest p-6">
        <h2 className="mb-2 font-sora text-lg font-semibold text-on-surface">Đăng xuất</h2>
        <p className="mb-4 text-sm text-on-surface-variant">Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng hệ thống.</p>
        <button type="button" onClick={() => { logout(); window.location.href = '/login' }} className="rounded-xl border border-error px-5 py-2.5 text-sm font-semibold text-error hover:bg-error-container/20">
          Đăng xuất
        </button>
      </div>
    </div>
  )
}