import { Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import StaffSidebar from './StaffSidebar'
import StaffTopBar from './StaffTopBar'

export default function StaffLayout({ title }) {
  const { staff } = useAuth()

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
