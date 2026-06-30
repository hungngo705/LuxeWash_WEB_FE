import { useAuth } from '../../context/AuthContext'

export default function BusinessTopBar({ title = 'Business Portal' }) {
  const { user } = useAuth()
  const business = user

  return (
    <header className="fixed top-0 right-0 left-64 z-40 h-16 border-b border-outline-variant bg-surface-container-lowest">
      <div className="flex h-full items-center justify-between px-6">
        <h2 className="font-sora text-2xl font-semibold text-on-surface">{title}</h2>
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-tertiary-container px-3 py-1 text-xs font-semibold tracking-wider text-on-tertiary-container uppercase">
            Business
          </span>
          <div className="mx-1 h-6 w-px bg-outline-variant" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-on-surface">
                {business?.companyName ?? business?.fullName}
              </p>
              <p className="text-xs text-on-surface-variant">
                {business?.email ?? business?.phoneNumber}
              </p>
            </div>
            {business?.avatar && (
              <img
                alt={business.companyName ?? business.fullName}
                className="h-8 w-8 rounded-full border border-outline-variant object-cover"
                src={business.avatar}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
