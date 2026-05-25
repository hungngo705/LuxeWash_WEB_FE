import { useAuth } from '../../context/AuthContext'

export default function StaffTopBar({ title = 'LPR System Control' }) {
  const { staff } = useAuth()

  return (
    <header className="fixed top-0 right-0 left-64 z-40 h-16 border-b border-outline-variant bg-surface-container-lowest">
      <div className="flex h-full items-center justify-between px-6">
        <h2 className="font-sora text-2xl font-semibold text-on-surface">{title}</h2>
        <div className="flex items-center gap-4">
          <div className="flex gap-3">
            <span className="material-symbols-outlined cursor-pointer text-on-surface-variant transition-colors hover:text-primary">
              notifications
            </span>
            <span className="material-symbols-outlined cursor-pointer text-primary transition-colors">
              wifi
            </span>
            <span className="material-symbols-outlined cursor-pointer text-on-surface-variant transition-colors hover:text-primary">
              sensors
            </span>
          </div>
          <div className="mx-3 h-6 w-px bg-outline-variant" />
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium tracking-wide text-primary">System Online</span>
            {staff?.avatar && (
              <img
                alt={staff.fullName}
                className="h-8 w-8 rounded-full border border-outline-variant object-cover"
                src={staff.avatar}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
