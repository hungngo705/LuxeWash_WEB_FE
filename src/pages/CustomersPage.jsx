import { useEffect, useMemo, useState } from 'react'
import CustomerDetailPanel from '../components/customers/CustomerDetailPanel'
import CustomerList from '../components/customers/CustomerList'
import CustomerSearchBar from '../components/customers/CustomerSearchBar'
import { customerRecords, getCustomerById, searchCustomers } from '../data/mockCustomers'

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(customerRecords[0]?.userId ?? null)

  const filtered = useMemo(() => searchCustomers(search), [search])

  const selectedCustomer = useMemo(
    () => (selectedUserId ? getCustomerById(selectedUserId) : null),
    [selectedUserId],
  )

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedUserId(null)
      return
    }
    if (!filtered.some((c) => c.userId === selectedUserId)) {
      setSelectedUserId(filtered[0].userId)
    }
  }, [filtered, selectedUserId])

  const handleSelect = (userId) => {
    setSelectedUserId(userId)
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="font-sora text-2xl font-semibold text-on-surface">Tra cứu khách hàng</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Customer_Profiles · Users · Vehicles · Rank · Wallet
        </p>
      </div>

      <CustomerSearchBar
        search={search}
        onSearchChange={setSearch}
        resultCount={filtered.length}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <CustomerList
            customers={filtered}
            selectedUserId={selectedUserId}
            onSelect={handleSelect}
          />
        </div>
        <div className="xl:col-span-7">
          <CustomerDetailPanel customer={selectedCustomer} />
        </div>
      </div>
    </div>
  )
}
