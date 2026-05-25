import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { STAFF_ACCOUNTS } from '../data/staffAccounts'

const PROMO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAUXHN3a61U5ro1xkhR4qWLGGNTPTXebsOADVwhgBY2yZ4N_WyfMgRMIPwkgTzPIw-2cQSe2iulTO9E5a34WD2D3GnGL7ew-DGq4Bm-qM2eSCGL3ZgejOjV7ihL0GMiDDUbHAZmBW5RxGT-cs3FTOZQIaelCGaSauRE6_850p-k1dkfsfxsU3efJnOpjRaphe3qt0fjn1Ae8n0DWk_bcjOfx7WtO3s88jDNBIvoQJvCkgrzidp9-IViIkbptIk7PggOV4LrvzCMrHQ'

function LoginBrandHeader({ centered = false }) {
  return (
    <header
      className={`login-brand-block space-y-4 ${centered ? 'mx-auto text-center' : 'text-left'}`}
    >
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-xl bg-primary-container neon-glow ${centered ? 'mx-auto' : ''}`}
      >
        <span className="material-symbols-outlined text-4xl text-on-primary-container">
          bubble_chart
        </span>
      </div>
      <div className="space-y-1">
        <h1 className="font-sora text-[2.5rem] leading-tight font-bold tracking-tight text-primary lg:text-5xl">
          LuxeWash
        </h1>
        <p className="text-2xl text-on-surface-variant">Chào mừng trở lại</p>
        <p className="text-sm text-on-surface-variant/80">Staff Portal · LuxeWash Pro</p>
      </div>
    </header>
  )
}

function PromoBanner({ className = '' }) {
  return (
    <div className={`overflow-hidden rounded-2xl glass-card relative aspect-video w-full ${className}`}>
      <img alt="Trạm rửa xe tự động" className="h-full w-full object-cover opacity-80" src={PROMO_IMAGE} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute right-4 bottom-4 left-4 text-left">
        <span className="mb-2 inline-block rounded bg-primary/80 px-2 py-1 text-[10px] font-semibold tracking-wider text-white uppercase">
          Công nghệ mới
        </span>
        <p className="text-sm text-white">Trải nghiệm dịch vụ rửa xe thông minh 4.0</p>
      </div>
    </div>
  )
}

function LoginForm({ phone, setPhone, password, setPassword, showPassword, setShowPassword, error, onSubmit }) {
  return (
    <div className="glass-card w-full space-y-6 rounded-xl p-8">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label
            className="block px-1 text-xs font-semibold tracking-wider text-on-surface-variant uppercase"
            htmlFor="phone"
          >
            Số điện thoại
          </label>
          <div className="input-focus-glow group relative w-full rounded-xl transition-all">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-on-surface-variant transition-colors group-focus-within:text-primary">
              <span className="material-symbols-outlined">person</span>
            </div>
            <input
              id="phone"
              className="block h-14 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pr-4 pl-12 text-base text-on-surface transition-all placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Nhập số điện thoại"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            className="block px-1 text-xs font-semibold tracking-wider text-on-surface-variant uppercase"
            htmlFor="password"
          >
            Mật khẩu
          </label>
          <div className="input-focus-glow group relative w-full rounded-xl transition-all">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-on-surface-variant transition-colors group-focus-within:text-primary">
              <span className="material-symbols-outlined">lock</span>
            </div>
            <input
              id="password"
              className="block h-14 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pr-12 pl-12 text-base text-on-surface transition-all placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-on-surface-variant transition-colors hover:text-primary"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              <span className="material-symbols-outlined">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-error-container bg-error-container/30 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="neon-glow flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary-container text-xl font-semibold text-on-primary-container transition-transform duration-200 active:scale-95"
        >
          Đăng nhập
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </form>

      <div className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-4">
        <p className="mb-2 text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
          Tài khoản Staff (demo)
        </p>
        <ul className="space-y-2 text-sm text-on-surface-variant">
          {STAFF_ACCOUNTS.map((acc) => (
            <li key={acc.userId}>
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => {
                  setPhone(acc.phoneNumber)
                  setPassword(acc.password)
                }}
              >
                {acc.phoneNumber}
              </button>
              <span> · {acc.fullName}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { isAuthenticated, login, error, setError } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (login(phone, password)) {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="login-page relative overflow-hidden bg-surface text-on-surface">
      {/* Nền gradient — giống mockup */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary-container/20 blur-[100px]" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-secondary-container/20 blur-[100px]" />
      </div>

      <div className="login-split relative z-10">
        {/* === Cột trái (desktop): branding + banner như mockup === */}
        <section className="login-panel-left relative min-h-screen bg-surface">
          <div className="flex min-h-screen flex-col justify-center px-12 py-16 xl:px-20">
            <div className="login-brand-block mx-auto w-full space-y-10">
              <LoginBrandHeader />
              <p className="text-base leading-relaxed text-on-surface-variant">
                Đăng nhập bằng tài khoản nhân viên để vận hành LPR, hàng chờ và quản lý khách hàng
                tại trạm.
              </p>
              <PromoBanner />
            </div>
          </div>
        </section>

        {/* === Cột phải: form đăng nhập === */}
        <section className="login-panel-right relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:px-14 xl:px-20">
          <div className="login-form-wrap w-full space-y-8">
            {/* Mobile / tablet: header giống mockup */}
            <div className="lg:hidden">
              <LoginBrandHeader centered />
            </div>

            <div className="space-y-2 lg:pt-4">
              <h2 className="hidden font-sora text-2xl font-semibold text-primary lg:block">
                Đăng nhập nhân viên
              </h2>
              <LoginForm
                phone={phone}
                setPhone={setPhone}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                error={error}
                onSubmit={handleSubmit}
              />
            </div>

            <p className="text-center text-sm text-on-surface-variant lg:text-left">
              Chỉ nhân viên trạm (<strong className="text-on-surface">Role: Staff</strong>) được phép
              truy cập.
            </p>

            {/* Mobile: banner dưới form như mockup */}
            <div className="lg:hidden">
              <PromoBanner />
            </div>
          </div>
        </section>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 z-20 h-1 w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30" />
    </div>
  )
}
