import { useAuth } from '../../context/AuthContext'

export default function ManagerTopBar({ title = 'Manager Console' }) {
  const { user } = useAuth()
  const manager = user

  return (
    <header className="fixed top-0 right-0 left-64 z-40 h-16 border-b border-outline-variant bg-surface-container-lowest">
      <div className="flex h-full items-center justify-between px-6">
        <h2 className="font-sora text-2xl font-semibold text-on-surface">{title}</h2>
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold tracking-wider text-on-secondary-container uppercase">
            Manager
          </span>
          <div className="mx-1 h-6 w-px bg-outline-variant" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-on-surface">{manager?.fullName}</p>
              <p className="text-xs text-on-surface-variant">{manager?.email ?? manager?.phoneNumber}</p>
            </div>
            {manager?.avatar && (
              <img
                alt={manager.fullName}
                className="h-8 w-8 rounded-full border border-outline-variant object-cover"
                src={manager.avatar}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
