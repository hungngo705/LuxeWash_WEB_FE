import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { fetchPublicBranches, fetchPublicServices, getPublicPriceRows } from '../src/api/public.catalog.api.js'
import PricingSection from '../src/components/landing/PricingSection.jsx'
import ServicesSection from '../src/components/landing/ServicesSection.jsx'
import BranchesSection from '../src/components/landing/BranchesSection.jsx'
import HeroSection from '../src/components/landing/HeroSection.jsx'
import Navbar from '../src/components/landing/Navbar.jsx'
import Footer from '../src/components/landing/Footer.jsx'
import FAQSection from '../src/components/landing/FAQSection.jsx'
import ProcessSection from '../src/components/landing/ProcessSection.jsx'

const requests = []
let responseData
let responseStatus = 200
const originalFetch = globalThis.fetch
globalThis.fetch = async (url, options) => {
  requests.push({ url, options })
  return new Response(JSON.stringify({ statusCode: responseStatus, data: responseData }), { status: responseStatus, headers: { 'content-type': 'application/json' } })
}
try {
  responseData = [{ branchId: 1, name: 'Chi nhánh thật', address: 'Địa chỉ thật', isActive: true }, { branchId: 2, name: 'Chi nhánh đóng', isActive: false }, { branchId: 3, name: 'Chi nhánh chưa có giá', isActive: true }]
  const branches = await fetchPublicBranches()
  assert.deepEqual(branches.map(b => b.id), [1, 3])
  assert.equal(new URL(requests.at(-1).url).pathname, '/api/v1/branches')
  assert.equal(requests.at(-1).options.headers.has('Authorization'), false)
  responseData = [{ serviceId: 1, serviceName: 'Dịch vụ thật', description: 'Mô tả thật', isActive: true, prices: [
    { branchId: 1, vehicleTypeId: 1, vehicleTypeName: 'Sedan', price: 0, estimatedDurationMinutes: 10 },
    { branchId: 2, vehicleTypeId: 1, vehicleTypeName: 'Sedan', price: 100000, estimatedDurationMinutes: 20 },
    { branchId: 1, vehicleTypeId: 2, price: -1 },
  ] }, { serviceId: 2, serviceName: 'Dịch vụ đóng', isActive: false, prices: [] }]
  const services = await fetchPublicServices()
  assert.equal(services.length, 1)
  assert.equal(requests.at(-1).options.headers.has('Authorization'), false)
  const rows = getPublicPriceRows(services, branches, 1)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].price, 0)
  assert.equal(getPublicPriceRows(services, branches, 3).length, 0)
  assert.equal(getPublicPriceRows(services, []).length, 0)
  const priceHtml = renderToStaticMarkup(createElement(PricingSection, { branches, branchId: '1', rows }))
  assert.match(priceHtml, /Dịch vụ thật/)
  assert.match(priceHtml, /10 phút/)
  assert.match(priceHtml, /0/)
  assert.doesNotMatch(priceHtml, /100\.000|VAT|giảm 10%/)
  const errorHtml = renderToStaticMarkup(createElement(PricingSection, { branches, branchId: '1', rows, error: 'Không tải được' }))
  assert.match(errorHtml, /role="alert"/)
  assert.doesNotMatch(errorHtml, /<table/)
  const emptyHtml = renderToStaticMarkup(createElement(PricingSection, { branches, branchId: '3', rows: [] }))
  assert.match(emptyHtml, /chưa có giá dịch vụ được cấu hình/)
  const loadingHtml = renderToStaticMarkup(createElement(ServicesSection, { services, loading: true }))
  assert.match(loadingHtml, /role="status"/)
  assert.doesNotMatch(loadingHtml, /Dịch vụ thật/)
  const branchHtml = renderToStaticMarkup(createElement(BranchesSection, { branches }))
  assert.match(branchHtml, /Địa chỉ thật/)
  assert.doesNotMatch(branchHtml, /Chi nhánh đóng|1900|6:00/)
  const contentHtml = renderToStaticMarkup(createElement(MemoryRouter, null, [Navbar, HeroSection, ProcessSection, FAQSection, Footer].map((Component, index) => createElement(Component, { key: index }))))
  assert.doesNotMatch(contentHtml, /href="#"|50K|50,000|App Store|Google Play|MoMo|ZaloPay|VNPay|support@|1900|24 giờ/)
  for (const target of contentHtml.matchAll(/href="#([^\"]+)"/g)) {
    const allowed = ['home', 'services', 'pricing', 'branches', 'about', 'faq']
    assert.ok(allowed.includes(target[1]), `unknown anchor ${target[1]}`)
  }
  responseData = null
  await assert.rejects(fetchPublicBranches(), /định dạng/)
  responseData = [{ serviceId: 1, serviceName: 'Broken', prices: null }]
  await assert.rejects(fetchPublicServices(), /định dạng/)
  responseData = []
  assert.deepEqual(await fetchPublicServices(), [])
  responseStatus = 500
  await assert.rejects(fetchPublicBranches())
  console.log('PASS: public endpoints without auth, real catalog rendering, branch pricing, inactive/missing/zero data, loading/error states, and placeholder removal.')
} finally {
  globalThis.fetch = originalFetch
}
