import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/services', label: 'Dịch vụ', icon: 'local_car_wash' },
  { to: '/admin/vehicle-types', label: 'Loại xe', icon: 'directions_car' },
  { to: '/admin/vehicle-approvals', label: 'Duyệt loại xe', icon: 'pending_actions' },
  { to: '/admin/time-slots', label: 'Khung giờ', icon: 'schedule' },
  { to: '/admin/tiers', label: 'Hạng thành viên', icon: 'workspace_premium' },
  { to: '/admin/vouchers', label: 'Voucher', icon: 'confirmation_number' },
  { to: '/admin/users', label: 'Người dùng', icon: 'group' },
  { to: '/admin/bookings', label: 'Lịch đặt', icon: 'calendar_month' },
  { to: '/admin/transactions', label: 'Giao dịch', icon: 'payments' },
]

export default function AdminSidebar() {
  return (
    <nav className="bg-surface-container-lowest fixed top-0 left-0 z-50 h-screen w-64 border-r border-outline-variant shadow-sm">
      <div className="flex h-full flex-col py-6">
        <div className="mb-8 px-4">
          <h1 className="font-sora text-[32px] leading-10 font-semibold tracking-tight text-primary">
            LuxeWash Pro
          </h1>
          <p className="mt-1 text-xs font-semibold tracking-wider text-tertiary">
            Admin Console
          </p>
        </div>

        <div className="flex flex-grow flex-col gap-1 overflow-y-auto">
          {navItems.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `mx-3 flex items-center gap-4 rounded-lg px-4 py-3 transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>
                    {icon}
                  </span>
                  <span className="text-sm font-medium tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              `mx-3 mt-auto flex items-center gap-4 rounded-lg px-4 py-3 transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>
                  settings
                </span>
                <span className="text-sm font-medium tracking-wide">Cài đặt</span>
              </>
            )}
          </NavLink>
        </div>
      </div>
    </nav>
  )
}
