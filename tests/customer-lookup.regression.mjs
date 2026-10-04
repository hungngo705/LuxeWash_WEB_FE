import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { mapListUserToCustomerView, mapUserDetailToCustomerView, normalizePlateKey, findUserByLicensePlate } from '../src/api/staff.customers.api.js'
import { fetchBookingsByUserId } from '../src/api/admin.bookings.api.js'
import { fetchUserPointsHistory } from '../src/api/admin.users.api.js'
import CustomerList from '../src/components/customers/CustomerList.jsx'
import CustomerDetailPanel from '../src/components/customers/CustomerDetailPanel.jsx'

const raw = { userId: 35, fullName: 'Khách thử', totalPoint: 8000, promotionPoint: 500, walletBalance: 5000000, vehicleCount: 1, totalWashes: 13 }
const summary = mapListUserToCustomerView(raw)
assert.equal(summary.walletBalance, 5000000)
assert.equal(summary.userScore, 8000)
assert.equal(summary.vehicleCount, 1)
const detail = mapUserDetailToCustomerView({ ...raw, vehicles: [{ licensePlate: '30F33333' }, { licensePlate: 'DELETED', isDeleted: true }] })
assert.equal(detail.vehicles.length, 1)
assert.equal(detail.totalWashes, 13)
assert.equal(detail.walletBalance, summary.walletBalance)
assert.equal(mapUserDetailToCustomerView({ userId: 1, totalPoint: 0, promotionPoint: 500 }).userScore, 0)
assert.equal(mapListUserToCustomerView({ userId: 1 }).walletBalance, null)
assert.equal(mapListUserToCustomerView({ userId: 1 }).vehicleCount, null)
assert.equal(normalizePlateKey('30F-333.33'), '30F33333')

const listHtml = renderToStaticMarkup(createElement(CustomerList, { customers: [summary] }))
assert.match(listHtml, /1 xe/)
assert.match(listHtml, /5\.000\.000/)
const detailHtml = renderToStaticMarkup(createElement(CustomerDetailPanel, { customer: { ...detail, recentBookings: [] } }))
assert.match(detailHtml, /8\.000/)
assert.match(detailHtml, /5\.000\.000/)
assert.doesNotMatch(detailHtml, /DELETED/)
const errorHtml = renderToStaticMarkup(createElement(CustomerDetailPanel, { customer: { ...detail, recentBookings: [], historyError: 'Không tải được lịch sử' } }))
assert.match(errorHtml, /role="alert"/)
assert.doesNotMatch(errorHtml, /Chưa có lịch đặt nào/)

const originalFetch = globalThis.fetch
const urls = []
let responseData = []
globalThis.fetch = async (url) => {
  urls.push(new URL(url))
  return new Response(JSON.stringify({ statusCode: 200, data: responseData }), { headers: { 'content-type': 'application/json' } })
}
try {
  await fetchBookingsByUserId(35, { page: 2, pageSize: 20 })
  assert.equal(urls.at(-1).searchParams.get('page'), '2')
  assert.equal(urls.at(-1).searchParams.get('pageSize'), '20')
  await fetchUserPointsHistory(35, { page: 3, pageSize: 50 })
  assert.equal(urls.at(-1).searchParams.get('page'), '3')
  responseData = null
  await assert.rejects(fetchBookingsByUserId(35), /Invalid customer booking history/)
  responseData = { items: [], totalPages: 1 }
  await findUserByLicensePlate('30F-333.33')
  const before = urls.length
  await findUserByLicensePlate('30F-333.33')
  assert.ok(urls.length > before, 'a missing plate must not be cached forever')
  assert.equal(urls.at(-1).searchParams.get('keyword'), '30F33333')
  assert.equal(urls.at(-1).searchParams.get('role'), 'Customer')
} finally {
  globalThis.fetch = originalFetch
}
console.log('PASS: customer mapping, UI rendering, missing vs zero, deleted vehicles, history errors, pagination and plate lookup.')
