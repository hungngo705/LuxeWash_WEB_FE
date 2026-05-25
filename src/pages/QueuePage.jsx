import { useMemo, useState } from 'react'
import QueueStats from '../components/queue/QueueStats'
import QueueTable from '../components/queue/QueueTable'
import QueueToolbar from '../components/queue/QueueToolbar'
import { getQueueStats, initialQueueBookings } from '../data/mockQueue'

export default function QueuePage() {
  const [bookings, setBookings] = useState(initialQueueBookings)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const stats = useMemo(() => getQueueStats(bookings), [bookings])

  const avgWaitMinutes = useMemo(() => {
    if (bookings.length === 0) return 0
    const sum = bookings.reduce((acc, b) => acc + b.waitMinutes, 0)
    return Math.round(sum / bookings.length)
  }, [bookings])

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bookings.filter((b) => {
      const matchStatus = filter === 'all' || b.status === filter
      const matchSearch =
        !q ||
        b.licensePlate.toLowerCase().includes(q) ||
        b.customerName?.toLowerCase().includes(q) ||
        b.serviceName.toLowerCase().includes(q) ||
        b.phoneMasked?.includes(q)
      return matchStatus && matchSearch
    })
  }, [bookings, filter, search])

  const handleCheckIn = (bookingId) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.bookingId === bookingId ? { ...b, status: 'Checked-in', waitMinutes: b.waitMinutes + 2 } : b,
      ),
    )
  }

  const handleComplete = (bookingId) => {
    const row = bookings.find((b) => b.bookingId === bookingId)
    setBookings((prev) => prev.filter((b) => b.bookingId !== bookingId))
    window.alert(
      `Xe ${row?.licensePlate ?? bookingId} đã hoàn thành (mock) — sẽ chuyển sang History khi nối API.`,
    )
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="font-sora text-2xl font-semibold text-on-surface">Quản lý hàng đợi</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Danh sách xe đang chờ tại trạm — Bookings trạng thái Pending và Checked-in
        </p>
      </div>

      <QueueStats stats={stats} avgWaitMinutes={avgWaitMinutes} />

      <QueueToolbar
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        resultCount={filteredBookings.length}
      />

      <QueueTable
        bookings={filteredBookings}
        onCheckIn={handleCheckIn}
        onComplete={handleComplete}
      />
    </div>
  )
}
