import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/manager/dashboard', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/manager/bookings', label: 'Lịch đặt', icon: 'calendar_month' },
  { to: '/manager/queue', label: 'Điều phối xe', icon: 'local_shipping' },
  { to: '/manager/lanes', label: 'Làn rửa', icon: 'garage' },
  { to: '/manager/time-slots', label: 'Khung giờ', icon: 'schedule' },
  { to: '/manager/staff', label: 'Phân công làn', icon: 'badge' },
  { to: '/manager/employees', label: 'Nhân viên', icon: 'group_add' },
  { to: '/manager/walk-in', label: 'Khách vãng lai', icon: 'directions_car' },
]

export default function ManagerSidebar({ station }) {
  return (
    <nav className="bg-surface-container-lowest fixed top-0 left-0 z-50 h-screen w-64 border-r border-outline-variant shadow-sm">
      <div className="flex h-full flex-col py-6">
        <div className="mb-8 px-4">
          <h1 className="font-sora text-[32px] leading-10 font-semibold tracking-tight text-primary">
            LuxeWash Pro
          </h1>
          <p className="mt-1 text-xs font-semibold tracking-wider text-secondary">
            Manager Console
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
                    ? 'bg-secondary text-on-secondary'
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
            to="/manager/settings"
            className={({ isActive }) =>
              `mx-3 mt-auto flex items-center gap-4 rounded-lg px-4 py-3 transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'bg-secondary text-on-secondary'
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
