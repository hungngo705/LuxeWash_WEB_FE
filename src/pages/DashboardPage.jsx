import { useMemo, useState } from 'react'
import AutoApproveToggle from '../components/dashboard/AutoApproveToggle'
import CustomerProfilePanel from '../components/dashboard/CustomerProfilePanel'
import LiveLprFeed from '../components/dashboard/LiveLprFeed'
import PriorityQueuePanel from '../components/dashboard/PriorityQueuePanel'
import { DEFAULT_BOOKING_ID, getLprDetection } from '../data/mockDashboard'

export default function DashboardPage() {
  const [autoApprove, setAutoApprove] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState(DEFAULT_BOOKING_ID)

  const activeDetection = useMemo(
    () => getLprDetection(selectedBookingId),
    [selectedBookingId],
  )

  return (
    <div className="dashboard-workspace grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
      <LiveLprFeed detection={activeDetection} />

      <div className="dashboard-sidebar-col flex h-full min-h-0 flex-col gap-6 lg:col-span-5">
        <AutoApproveToggle enabled={autoApprove} onChange={setAutoApprove} />

        <CustomerProfilePanel
          detection={activeDetection}
          autoApprove={autoApprove}
          onConfirm={() => window.alert(`Đã xác nhận xe ${activeDetection.licensePlate} (mock)`)}
          onSkip={() => window.alert(`Đã bỏ qua xe ${activeDetection.licensePlate} (mock)`)}
        />

        <PriorityQueuePanel
          selectedBookingId={selectedBookingId}
          onSelectVehicle={setSelectedBookingId}
        />
      </div>
    </div>
  )
}
