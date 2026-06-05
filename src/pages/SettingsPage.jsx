import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ApiError,
  changePassword,
  consumeStaffVoucher,
  fetchStaffLaneAssignment,
  formatStaffStationLabel,
} from '../api'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const { staff, logout, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [notifySound, setNotifySound] = useState(true)
  const [autoRefreshLpr, setAutoRefreshLpr] = useState(true)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [laneLabel, setLaneLabel] = useState('Đang tải…')
  const [profileLoading, setProfileLoading] = useState(true)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')

  const [voucherUserId, setVoucherUserId] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherSaving, setVoucherSaving] = useState(false)
  const [voucherMessage, setVoucherMessage] = useState('')

  const loadMeta = useCallback(async () => {
    setProfileLoading(true)
    try {
      await refreshProfile()
      const assignment = await fetchStaffLaneAssignment()
      setLaneLabel(formatStaffStationLabel(assignment))
    } catch {
      setLaneLabel('Chưa phân công làn')
    } finally {
      setProfileLoading(false)
    }
  }, [refreshProfile])

  useEffect(() => {
    loadMeta()
  }, [loadMeta])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwordSaving) return
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Mật khẩu xác nhận không khớp')
      return
    }
    setPasswordSaving(true)
    setPasswordMessage('')
    try {
      await changePassword(oldPassword, newPassword)
      setPasswordMessage('Đã đổi mật khẩu thành công')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordMessage(err instanceof ApiError ? err.message : 'Không đổi được mật khẩu')
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleConsumeVoucher = async (e) => {
    e.preventDefault()
    if (voucherSaving) return
    const userId = Number(voucherUserId)
    const code = voucherCode.trim()
    if (!userId || !code) {
      setVoucherMessage('Nhập mã khách và mã voucher')
      return
    }
    setVoucherSaving(true)
    setVoucherMessage('')
    try {
      await consumeStaffVoucher({ userId, voucherCode: code.toUpperCase() })
      setVoucherMessage('Đã xác nhận đổi voucher thành công')
      setVoucherCode('')
    } catch (err) {
      setVoucherMessage(err instanceof ApiError ? err.message : 'Không đổi được voucher')
    } finally {
      setVoucherSaving(false)
    }
  }

  if (!staff) return null

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6">
        <h1 className="font-sora text-2xl font-semibold text-on-surface">Cài đặt</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Tài khoản nhân viên và tùy chọn vận hành trạm
        </p>
      </div>

      <section className="glass-panel soft-shadow mb-6 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant bg-surface-container-low px-6 py-4">
          <h2 className="flex items-center gap-2 font-sora text-lg font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary">badge</span>
            Tài khoản đăng nhập
          </h2>
        </div>
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <img
            alt={staff.fullName}
            className="h-20 w-20 shrink-0 rounded-full border-2 border-primary-container object-cover"
            src={staff.avatar}
          />
          <div className="min-w-0 flex-1 space-y-3">
            {profileLoading ? (
              <p className="text-sm text-on-surface-variant">Đang tải hồ sơ…</p>
            ) : (
              <>
                <div>
                  <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                    Họ tên
                  </p>
                  <p className="font-sora text-xl font-semibold text-on-surface">{staff.fullName}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                      Số điện thoại
                    </p>
                    <p className="text-on-surface">{staff.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                      Vai trò
                    </p>
                    <p className="text-on-surface">{staff.role}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                      Làn phụ trách hôm nay
                    </p>
                    <p className="text-on-surface">{laneLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                      Mã nhân viên
                    </p>
                    <p className="text-on-surface">#{staff.userId}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="glass-panel soft-shadow mb-6 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant bg-surface-container-low px-6 py-4">
          <h2 className="flex items-center gap-2 font-sora text-lg font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary">lock</span>
            Đổi mật khẩu
          </h2>
        </div>
        <form className="space-y-4 p-6" onSubmit={handleChangePassword}>
          <label className="block space-y-1 text-sm">
            <span className="text-on-surface-variant">Mật khẩu hiện tại</span>
            <input
              type="password"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={oldPassword}
              disabled={passwordSaving}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-on-surface-variant">Mật khẩu mới</span>
            <input
              type="password"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={newPassword}
              disabled={passwordSaving}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-on-surface-variant">Xác nhận mật khẩu mới</span>
            <input
              type="password"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={confirmPassword}
              disabled={passwordSaving}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>
          {passwordMessage && (
            <p
              className={`text-sm ${passwordMessage.includes('thành công') ? 'text-primary' : 'text-error'}`}
            >
              {passwordMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={passwordSaving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-60"
          >
            {passwordSaving ? 'Đang lưu…' : 'Cập nhật mật khẩu'}
          </button>
        </form>
      </section>

      <section className="glass-panel soft-shadow mb-6 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant bg-surface-container-low px-6 py-4">
          <h2 className="flex items-center gap-2 font-sora text-lg font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary">confirmation_number</span>
            Đổi voucher quà tặng
          </h2>
        </div>
        <form className="space-y-4 p-6" onSubmit={handleConsumeVoucher}>
          <p className="text-sm text-on-surface-variant">
            Xác nhận khách đổi quà tại quầy — `POST /staff/vouchers/consume`
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-on-surface-variant">Mã khách (userId)</span>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={voucherUserId}
                disabled={voucherSaving}
                onChange={(e) => setVoucherUserId(e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-on-surface-variant">Mã voucher</span>
              <input
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono uppercase"
                value={voucherCode}
                disabled={voucherSaving}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              />
            </label>
          </div>
          {voucherMessage && (
            <p
              className={`text-sm ${voucherMessage.includes('thành công') ? 'text-primary' : 'text-error'}`}
            >
              {voucherMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={voucherSaving}
            className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-60"
          >
            {voucherSaving ? 'Đang xử lý…' : 'Xác nhận đổi quà'}
          </button>
        </form>
      </section>

      <section className="glass-panel soft-shadow mb-6 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant bg-surface-container-low px-6 py-4">
          <h2 className="flex items-center gap-2 font-sora text-lg font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary">tune</span>
            Tùy chọn trạm
          </h2>
        </div>
        <ul className="divide-y divide-outline-variant/60">
          <SettingToggle
            icon="notifications_active"
            label="Âm thanh thông báo hàng chờ"
            description="Phát âm thanh khi có xe mới vào làn"
            checked={notifySound}
            onChange={setNotifySound}
          />
          <SettingToggle
            icon="videocam"
            label="Tự làm mới danh sách xe"
            description="Dashboard/Queue tự reload task mỗi 30 giây"
            checked={autoRefreshLpr}
            onChange={setAutoRefreshLpr}
          />
        </ul>
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
            Đăng xuất để kết thúc phiên Staff trên thiết bị này.
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
              <p className="mb-4 text-sm font-medium text-on-surface">Bạn chắc chắn muốn đăng xuất?</p>
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

function SettingToggle({ icon, label, description, checked, onChange }) {
  return (
    <li className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="material-symbols-outlined mt-0.5 shrink-0 text-primary">{icon}</span>
        <div>
          <p className="font-medium text-on-surface">{label}</p>
          <p className="text-sm text-on-surface-variant">{description}</p>
        </div>
      </div>
      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
        <input
          checked={checked}
          className="peer sr-only"
          type="checkbox"
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="peer h-6 w-11 rounded-full bg-surface-variant shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] peer-checked:bg-primary peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-surface-container-lowest after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white" />
      </label>
    </li>
  )
}
