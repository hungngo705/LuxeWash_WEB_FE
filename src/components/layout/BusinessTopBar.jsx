import { useAuth } from '../../context/AuthContext'

export default function BusinessTopBar({ title = 'Business Portal' }) {
  const { business, logout } = useAuth()

  return (
    <header className="fixed top-0 right-0 left-64 z-40 h-16 border-b border-outline-variant bg-surface-container-lowest">
      <div className="flex h-full items-center justify-between px-6">
        <h2 className="font-sora text-2xl font-semibold text-on-surface">{title}</h2>
        <div className="flex items-center gap-4">
          <div className="mx-3 h-6 w-px bg-outline-variant" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-on-surface">{business?.fullName}</p>
              <p className="text-xs text-on-surface-variant">Business</p>
            </div>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary/90"
              onClick={logout}
              title="Đăng xuất"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
