import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { fetchStaffLaneAssignment, formatStaffStationLabel } from '../../api'
import { useAuth } from '../../context/AuthContext'
import StaffSidebar from './StaffSidebar'
import StaffTopBar from './StaffTopBar'

const PAGE_TITLES = {
  '/dashboard': 'LPR System Control',
  '/bookings': 'Booking trong ngày',
  '/queue': 'Queue Management',
  '/history': 'Service History',
  '/customers': 'Customer Lookup',
  '/shifts': 'Ca làm của tôi',
  '/settings': 'Settings',
}

export default function StaffLayout() {
  const { staff, patchUser } = useAuth()
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'LuxeWash Pro'
  const [stationLabel, setStationLabel] = useState(staff?.station ?? 'Đang tải…')

  useEffect(() => {
    if (staff?.role !== 'Staff') return
    let cancelled = false
    fetchStaffLaneAssignment()
      .then((assignment) => {
        if (cancelled) return
        const label = formatStaffStationLabel(assignment)
        setStationLabel(label)
        patchUser({ station: label })
      })
      .catch(() => {
        if (!cancelled) setStationLabel('Chưa phân công làn')
      })
    return () => {
      cancelled = true
    }
  }, [staff?.role, patchUser])

  return (
    <div className="min-h-screen bg-background">
      <StaffSidebar station={stationLabel} />
      <StaffTopBar title={title} />
      <main className="ml-64 mt-16 min-h-[calc(100vh-4rem)] p-6">
        <Outlet />
      </main>
    </div>
  )
}
