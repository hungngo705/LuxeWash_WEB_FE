import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import StaffSidebar from './StaffSidebar'
import StaffTopBar from './StaffTopBar'

const PAGE_TITLES = {
  '/dashboard': 'LPR System Control',
  '/queue': 'Queue Management',
  '/history': 'Service History',
  '/customers': 'Customer Lookup',
}

export default function StaffLayout() {
  const { staff } = useAuth()
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'LuxeWash Pro'

  return (
    <div className="min-h-screen bg-background">
      <StaffSidebar station={staff?.station ?? 'Station 04'} />
      <StaffTopBar title={title} />
      <main className="ml-64 mt-16 min-h-[calc(100vh-4rem)] p-6">
        <Outlet />
      </main>
    </div>
  )
}
