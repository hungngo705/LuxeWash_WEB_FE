import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ADMIN_ACCOUNTS } from '../data/adminAccounts'
import { BUSINESS_ACCOUNTS } from '../data/businessAccounts'
import { STAFF_ACCOUNTS } from '../data/staffAccounts'
import { getHomePathForRole } from '../utils/format'

const PROMO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAUXHN3a61U5ro1xkhR4qWLGGNTPTXebsOADVwhgBY2yZ4N_WyfMgRMIPwkgTzPIw-2cQSe2iulTO9E5a34WD2D3GnGL7ew-DGq4Bm-qM2eSCGL3ZgejOjV7ihL0GMiDDUbHAZmBW5RxGT-cs3FTOZQIaelCGaSauRE6_850p-k1dkfsfxsU3efJnOpjRaphe3qt0fjn1Ae8n0DWk_bcjOfx7WtO3s88jDNBIvoQJvCkgrzidp9-IViIkbptIk7PggOV4LrvzCMrHQ'

const PORTALS = [
  {
    role: 'Admin',
    label: 'Quản trị',
    path: '/admin/dashboard',
    icon: 'admin_panel_settings',
    accent: 'border-primary/30 bg-primary/5 text-primary',
  },
  {
    role: 'Manager',
    label: 'Quản lý trạm',
    path: '/manager/dashboard',
    icon: 'storefront',
    accent: 'border-secondary/30 bg-secondary/5 text-secondary',
  },
  {
    role: 'Staff',
    label: 'Vận hành',
    path: '/dashboard',
    icon: 'engineering',
    accent: 'border-primary-container/30 bg-primary-container/10 text-primary-container',
  },
  {
    role: 'Business',
    label: 'Doanh nghiệp',
    path: '/business/dashboard',
    icon: 'corporate_fare',
    accent: 'border-tertiary-container/30 bg-tertiary-container/10 text-tertiary-container',
  },
]

const DEMO_GROUPS = [
  {
    id: 'admin',
    title: 'Admin',
    icon: 'shield_person',
    accounts: ADMIN_ACCOUNTS,
    passwordHint: 'Admin@123',
  },
  {
    id: 'ops',
    title: 'Staff & Manager',
    icon: 'groups',
    accounts: STAFF_ACCOUNTS,
    passwordHint: 'Staff@123 / Manager@123',
  },
  {
    id: 'business',
    title: 'Business',
    icon: 'business',
    accounts: BUSINESS_ACCOUNTS,
    passwordHint: 'Business@123',
  },
]

function DemoAccountRow({ account, onSelect }) {
  const subtitle =
    account.companyName ??
    (account.role === 'Staff' ? 'Nhân viên làn rửa' : account.role === 'Manager' ? 'Quản lý chi nhánh' : account.role)

  return (
    <button
      type="button"
      onClick={() => onSelect(account.phoneNumber, account.password)}
      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-on-surface">{account.fullName}</p>
        <p className="truncate text-xs text-on-surface-variant">
          {account.phoneNumber} · {subtitle}
        </p>
      </div>
      <span className="shrink-0 rounded-lg bg-surface-variant px-2 py-1 text-[10px] font-semibold tracking-wide text-on-surface-variant uppercase opacity-0 transition-opacity group-hover:opacity-100">
        Điền
      </span>
    </button>
  )
}

export default function LoginPage() {
  const { isAuthenticated, user, login, error, setError } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedDemo, setExpandedDemo] = useState('business')

  if (isAuthenticated) {
    return <Navigate to={getHomePathForRole(user?.role)} replace />
  }

  const fillCredentials = (nextPhone, nextPassword) => {
    setPhone(nextPhone)
    setPassword(nextPassword)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const role = await login(phone, password)
      if (role) {
        navigate(getHomePathForRole(role), { replace: true })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page relative min-h-screen overflow-hidden bg-[#eef4f8] text-on-surface">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute right-0 -bottom-32 h-[24rem] w-[24rem] rounded-full bg-secondary/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,102,137,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,102,137,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="login-split relative z-10">
        {/* Left — branding */}
        <section className="login-panel-left relative hidden lg:flex lg:flex-col lg:justify-between lg:border-r lg:border-outline-variant/40 lg:bg-surface/80 lg:backdrop-blur-sm">
          <div className="flex flex-1 flex-col justify-center px-12 py-16 xl:px-16">
            <div className="login-brand-block mx-auto w-full max-w-lg space-y-8">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-3xl text-on-primary">local_car_wash</span>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">LuxeWash Pro</p>
                  <h1 className="font-sora text-3xl font-bold tracking-tight text-on-surface">Hệ thống vận hành</h1>
                </div>
              </div>

              <p className="text-base leading-relaxed text-on-surface-variant">
                Một cổng đăng nhập cho Admin, Manager, Staff và khách hàng doanh nghiệp (Fleet). API theo{' '}
                <span className="font-medium text-on-surface">POST /auth/login</span> trên Swagger.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {PORTALS.map((portal) => (
                  <div
                    key={portal.role}
                    className={`rounded-2xl border p-4 ${portal.accent}`}
                  >
                    <span className="material-symbols-outlined mb-2 text-2xl">{portal.icon}</span>
                    <p className="text-sm font-semibold">{portal.label}</p>
                    <p className="mt-0.5 font-mono text-[11px] opacity-80">{portal.path}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-2xl border border-outline-variant/50 shadow-lg">
                <img
                  alt="Trạm rửa xe thông minh"
                  className="aspect-[16/10] w-full object-cover"
                  src={PROMO_IMAGE}
                />
                <div className="border-t border-outline-variant/40 bg-surface-container-lowest/90 px-4 py-3">
                  <p className="text-sm font-medium text-on-surface">Rửa xe thông minh 4.0</p>
                  <p className="text-xs text-on-surface-variant">LPR · Đặt lịch · Fleet B2B</p>
                </div>
              </div>
            </div>
          </div>

          <p className="px-12 pb-8 text-xs text-on-surface-variant/70 xl:px-16">
            © {new Date().getFullYear()} LuxeWash Pro · SmartWash Platform
          </p>
        </section>

        {/* Right — form */}
        <section className="login-panel-right flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:px-12 xl:px-16">
          <div className="login-form-wrap w-full max-w-md space-y-6">
            <div className="flex items-center justify-between gap-4 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
                  <span className="material-symbols-outlined text-2xl text-on-primary">local_car_wash</span>
                </div>
                <div>
                  <p className="font-sora text-xl font-bold text-on-surface">LuxeWash Pro</p>
                  <p className="text-xs text-on-surface-variant">Đăng nhập portal</p>
                </div>
              </div>
              <Link
                to="/"
                className="text-sm font-medium text-primary hover:underline"
              >
                Trang chủ
              </Link>
            </div>

            <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest/95 p-8 shadow-xl shadow-primary/5 backdrop-blur-sm">
              <div className="mb-8 space-y-2">
                <h2 className="font-sora text-2xl font-semibold text-on-surface">Đăng nhập</h2>
                <p className="text-sm text-on-surface-variant">
                  Số điện thoại hoặc email đã đăng ký trên hệ thống
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label
                    htmlFor="phone"
                    className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase"
                  >
                    Số điện thoại / Email
                  </label>
                  <div className="input-focus-glow group relative">
                    <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary">
                      <span className="material-symbols-outlined text-[20px]">person</span>
                    </span>
                    <input
                      id="phone"
                      className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-low pr-4 pl-12 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20"
                      placeholder="VD: 0933333335"
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
                    htmlFor="password"
                    className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase"
                  >
                    Mật khẩu
                  </label>
                  <div className="input-focus-glow group relative">
                    <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary">
                      <span className="material-symbols-outlined text-[20px]">lock</span>
                    </span>
                    <input
                      id="password"
                      className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-low pr-12 pl-12 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20"
                      placeholder="Nhập mật khẩu"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-primary"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-error-container/50 bg-error-container/15 px-4 py-3">
                    <span className="material-symbols-outlined mt-0.5 text-lg text-error">error</span>
                    <p className="text-sm text-error">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold tracking-wide text-on-primary shadow-md shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
                      Đang đăng nhập…
                    </>
                  ) : (
                    <>
                      Đăng nhập
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/50 pt-6 text-sm">
                <Link to="/" className="hidden font-medium text-primary hover:underline lg:inline">
                  ← Về trang chủ
                </Link>
                <Link
                  to="/business/register"
                  className="inline-flex items-center gap-1 font-medium text-on-surface-variant hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">add_business</span>
                  Đăng ký doanh nghiệp
                </Link>
              </div>
            </div>

            {/* Demo accounts */}
            <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest/80 p-5 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                    Tài khoản demo
                  </p>
                  <p className="mt-0.5 text-xs text-on-surface-variant/80">Bấm để điền nhanh — đăng nhập qua API thật</p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant/50">science</span>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {DEMO_GROUPS.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setExpandedDemo(group.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      expandedDemo === group.id
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'border border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-primary/30'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{group.icon}</span>
                    {group.title}
                  </button>
                ))}
              </div>

              {DEMO_GROUPS.filter((g) => g.id === expandedDemo).map((group) => (
                <div key={group.id} className="space-y-2">
                  <p className="text-[11px] text-on-surface-variant">
                    Mật khẩu: <span className="font-mono text-on-surface">{group.passwordHint}</span>
                  </p>
                  {group.accounts.map((acc) => (
                    <DemoAccountRow
                      key={`${group.id}-${acc.userId}`}
                      account={acc}
                      onSelect={fillCredentials}
                    />
                  ))}
                </div>
              ))}
            </div>

            <p className="text-center text-xs leading-relaxed text-on-surface-variant lg:text-left">
              Sau đăng nhập, hệ thống tự chuyển theo role: Admin · Manager · Staff · Business
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
