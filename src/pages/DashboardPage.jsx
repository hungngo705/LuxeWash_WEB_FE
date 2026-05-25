import { useState } from 'react'
import AutoApproveToggle from '../components/dashboard/AutoApproveToggle'
import CustomerProfilePanel from '../components/dashboard/CustomerProfilePanel'
import DashboardStats from '../components/dashboard/DashboardStats'
import LiveLprFeed from '../components/dashboard/LiveLprFeed'
import PriorityQueuePanel from '../components/dashboard/PriorityQueuePanel'

export default function DashboardPage() {
  const [autoApprove, setAutoApprove] = useState(false)

  return (
    <>
      <DashboardStats />

      <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-12">
        <LiveLprFeed />

        <div className="flex h-[calc(100vh-14rem)] min-h-[420px] flex-col gap-6 lg:col-span-5">
          <AutoApproveToggle enabled={autoApprove} onChange={setAutoApprove} />

          <CustomerProfilePanel
            autoApprove={autoApprove}
            onConfirm={() => window.alert('Đã xác nhận xe (mock) — sẽ nối API sau.')}
            onSkip={() => window.alert('Đã bỏ qua (mock) — sẽ nối API sau.')}
          />

          <PriorityQueuePanel />
        </div>
      </div>
    </>
  )
}
