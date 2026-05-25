import { useMemo, useState } from 'react'
import HistoryStats from '../components/history/HistoryStats'
import HistoryTable from '../components/history/HistoryTable'
import HistoryToolbar from '../components/history/HistoryToolbar'
import { getHistoryStats, washHistoryRecords } from '../data/mockHistory'

export default function HistoryPage() {
  const [bookingFilter, setBookingFilter] = useState('all')
  const [txFilter, setTxFilter] = useState('all')
  const [search, setSearch] = useState('')

  const stats = useMemo(() => getHistoryStats(washHistoryRecords), [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return washHistoryRecords.filter((r) => {
      const matchBooking = bookingFilter === 'all' || r.bookingStatus === bookingFilter
      const matchTx = txFilter === 'all' || r.transactionStatus === txFilter
      const matchSearch =
        !q ||
        r.licensePlate.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.serviceName.toLowerCase().includes(q)
      return matchBooking && matchTx && matchSearch
    })
  }, [bookingFilter, txFilter, search])

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="font-sora text-2xl font-semibold text-on-surface">Lịch sử dịch vụ</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Xe đã rửa — Bookings Completed / Cancelled kèm Transactions
        </p>
      </div>

      <HistoryStats stats={stats} />

      <HistoryToolbar
        bookingFilter={bookingFilter}
        onBookingFilterChange={setBookingFilter}
        txFilter={txFilter}
        onTxFilterChange={setTxFilter}
        search={search}
        onSearchChange={setSearch}
        resultCount={filtered.length}
      />

      <HistoryTable records={filtered} />
    </div>
  )
}
