import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/queue', label: 'Queue', icon: 'format_list_numbered' },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/customers', label: 'Customers', icon: 'group' },
]

export default function StaffSidebar({ station }) {
  return (
    <nav className="bg-surface-container-lowest fixed top-0 left-0 z-50 h-screen w-64 border-r border-outline-variant shadow-sm">
      <div className="flex h-full flex-col py-6">
        <div className="mb-8 px-4">
          <h1 className="font-headline-lg text-[32px] leading-10 font-semibold tracking-tight text-primary">
            LuxeWash Pro
          </h1>
          <p className="mt-1 text-[12px] leading-4 font-semibold tracking-wider text-on-surface-variant uppercase">
            {station} - Active
          </p>
        </div>

        <div className="flex flex-grow flex-col gap-1">
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
                  <span
                    className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}
                  >
                    {icon}
                  </span>
                  <span className="font-label-bold text-[14px] leading-5 font-medium tracking-wide">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          <a
            href="#settings"
            className="mx-3 mt-auto flex items-center gap-4 rounded-lg px-4 py-3 text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-bold text-[14px] leading-5 font-medium tracking-wide">
              Settings
            </span>
          </a>
        </div>
      </div>
    </nav>
  )
}
