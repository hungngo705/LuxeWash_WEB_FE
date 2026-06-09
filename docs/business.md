1. Bối cảnh dự án
Dự án SmartWash là hệ thống quản lý trạm rửa xe tự động gồm 3 phần:

LuxeWash_Mobile_FE — App React Native/Expo cho khách hàng (Customer)
LuxeWash_WEB_FE — Web dashboard React 19/Vite/TailwindCSS 4 cho Staff, Admin, Manager
SmartWash-BE — Backend ASP.NET Core (API tại /api/v1/)
Cấu trúc hiện tại của WEB_FE:

src/
├── api/               # apiRequest, auth.api, session, + 20+ api modules
├── components/
│   ├── admin/         # KpiCard, shared components
│   ├── auth/          # AdminRoute, ManagerRoute, StaffRoute, RootRedirect
│   ├── customers/
│   ├── dashboard/
│   ├── history/
│   ├── layout/        # AdminLayout, ManagerLayout, StaffLayout + Sidebar + TopBar
│   └── queue/
├── context/AuthContext.jsx
├── data/              # Mock data
├── pages/
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   ├── CustomersPage.jsx
│   ├── QueuePage.jsx
│   ├── HistoryPage.jsx
│   ├── SettingsPage.jsx
│   ├── StaffQueuePage.jsx
│   ├── admin/         # 15 admin pages
│   └── manager/       # 8 manager pages
├── utils/format.js    # formatVnd, formatDateTime, getHomePathForRole
├── App.jsx            # React Router v7 routes
└── index.css          # Tailwind v4 @theme + utilities
Role hiện tại: Admin, Staff, Manager, Customer (backend) Backend API prefix: /api/v1/ JWT auth, session lưu trong localStorage key SESSION_STORAGE_KEY

2. Yêu cầu tổng quát
Thêm vào LuxeWash_WEB_FE hai phần mới:

A. Landing Page (public, chưa đăng nhập)
Giống mô hình Grab.com — khách hàng bình thường vào web chỉ thấy trang giới thiệu + link tải app. Mục tiêu: convert visitor thành user app hoặc đăng ký doanh nghiệp.

B. Business Portal (/business/*)
Portal cho khách hàng doanh nghiệp đặt lịch rửa xe cho đội xe riêng. Doanh nghiệp chỉ hoạt động trên web, không có mobile app. Backend đã có sẵn API cho Business (role Business + entity BusinessProfile, FleetVehicle, FleetWashLog, BusinessBookingService).

3. Thiết kế chi tiết từng phần
3.1. Cấu trúc Route mới
/                         ← LandingPage (public)
/login                    ← LoginPage (giữ nguyên, mở rộng redirect theo role)
/business/register         ← BusinessRegisterPage (public)
Sau khi đăng nhập:
/dashboard                ← Staff (giữ nguyên)
/admin/*                  ← Admin (giữ nguyên)
/manager/*                ← Manager (giữ nguyên)
/business/*               ← Business portal (MỚI)
3.2. Landing Page (/, public, chưa đăng nhập)
Tạo file src/pages/LandingPage.jsx và các components trong src/components/landing/:

Navbar (Navbar.jsx):

Sticky top, glass morphism background khi scroll
Logo "LuxeWash" bên trái (dùng font Sora, màu primary)
Nav links giữa: Trang chủ, Dịch vụ, Bảng giá, Chi nhánh, Về chúng tôi
Bên phải: nút "Đăng nhập" (outline) + "Đăng ký DN" (filled primary)
Hamburger menu trên mobile
HeroSection (HeroSection.jsx):

Full viewport height, background gradient (primary-container → surface)
Headline lớn: "Rửa xe thông minh. Tiết kiệm thời gian."
Subheadline: mô tả ngắn dịch vụ
2 CTA buttons: "Tải ứng dụng" + "Đăng ký doanh nghiệp"
Hình ảnh trạm rửa xe (dùng ảnh placeholder từ promo image trong LoginPage)
Floating badge: "Công nghệ 4.0"
ServicesSection (ServicesSection.jsx):

Section title: "Dịch vụ của chúng tôi"
4 cards hiển thị các dịch vụ: Rửa nhanh, Rửa tiêu chuẩn, Rửa cao cấp, Hấp sấy
Mỗi card: icon, tên dịch vụ, mô tả ngắn, giá từ
Layout: 2x2 grid trên tablet, 4 cột trên desktop
PricingSection (PricingSection.jsx):

Section title: "Bảng giá dịch vụ"
Table hoặc cards: loại xe (xe con, SUV, xe tải nhẹ) × dịch vụ
Dùng hàm formatVnd() từ utils/format.js để format tiền VND
Note: "Giá có thể thay đổi theo chi nhánh"
ProcessSection (ProcessSection.jsx):

Section title: "Quy trình 4 bước"
4 steps ngang: 1. Đặt lịch (app) → 2. Đến trạm → 3. Rửa xe tự động → 4. Hoàn tất
Mỗi step: số thứ tự, icon, title, mô tả
Layout: vertical trên mobile, horizontal timeline trên desktop
BranchesSection (BranchesSection.jsx):

Section title: "Chi nhánh"
Grid 3 cards chi nhánh (địa chỉ, giờ mở cửa, số điện thoại)
Map embed (dùng iframe Google Maps placeholder)
Dữ liệu mock tĩnh
ReviewsSection (ReviewsSection.jsx):

Section title: "Khách hàng nói gì về chúng tôi"
3 testimonial cards: avatar (placeholder), tên, vai trò (khách hàng thường), nội dung review, star rating
Layout: horizontal scroll trên mobile, 3 cột trên desktop
AppDownloadSection (AppDownloadSection.jsx):

Full-width section, background primary-container
Headline: "Tải ứng dụng LuxeWash"
Subheadline: mô tả lợi ích app
2 buttons: App Store + Google Play (dùng placeholder icons/buttons)
QR code placeholder
FAQSection (FAQSection.jsx):

Section title: "Câu hỏi thường gặp"
Accordion 5-6 câu hỏi: thời gian rửa, có cần đặt trước không, hủy lịch, thanh toán, v.v.
Mỗi item: question (click to expand) + answer (animated expand/collapse)
Dùng React state để quản lý open/close
Footer (Footer.jsx):

4 columns: Logo+description, Liên kết nhanh, Dịch vụ, Liên hệ
Bottom bar: copyright, social icons (placeholder)
Background surface-container-low
Compose trong LandingPage.jsx:

import Navbar from '../components/landing/Navbar'
import HeroSection from '../components/landing/HeroSection'
// ... import all sections
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <PricingSection />
        <ProcessSection />
        <BranchesSection />
        <ReviewsSection />
        <AppDownloadSection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  )
}
3.3. Mở rộng Auth — Role-based Redirect
File: src/context/AuthContext.jsx

Thêm Business vào PORTAL_ROLES:
const PORTAL_ROLES = new Set(['Admin', 'Staff', 'Manager', 'Business'])
Thêm field business vào context value:
const value = useMemo(() => ({
  user,
  staff: user,
  manager: user,
  business: user,  // THÊM
  // ...
}), [...])
Giữ nguyên login validation — login page sẽ redirect theo role sau khi đăng nhập thành công. Không block Business role.
File: src/utils/format.js

Thêm mapping cho Business:

export function getHomePathForRole(role) {
  if (role === 'Admin') return '/admin/dashboard'
  if (role === 'Staff') return '/dashboard'
  if (role === 'Manager') return '/manager/dashboard'
  if (role === 'Business') return '/business/dashboard'  // THÊM
  return '/login'
}
File: src/components/auth/RootRedirect.jsx

Giữ nguyên — đã dùng getHomePathForRole, sẽ tự redirect đúng.

3.4. Business Route Guard
Tạo src/components/auth/BusinessRoute.jsx:

import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
export default function BusinessRoute({ children }) {
  const { business } = useAuth()
  if (!business || business.role !== 'Business') {
    return <Navigate to="/login" replace />
  }
  return children
}
3.5. Business Layout + Sidebar + TopBar
File: src/components/layout/BusinessLayout.jsx

Giống cấu trúc StaffLayout:

Import Outlet từ react-router-dom
Sidebar fixed bên trái (w-64)
TopBar fixed top (mt-16 từ sidebar)
Main content: ml-64 mt-16 p-6
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import BusinessSidebar from './BusinessSidebar'
import BusinessTopBar from './BusinessTopBar'
const PAGE_TITLES = {
  '/business/dashboard': 'Dashboard',
  '/business/vehicles': 'Quản lý xe',
  '/business/vehicles/import': 'Nhập danh sách xe',
  '/business/bookings': 'Đặt lịch',
  '/business/bookings/new': 'Đặt lịch mới',
  '/business/history': 'Lịch sử rửa xe',
  '/business/invoices': 'Hóa đơn',
  '/business/statements': 'Báo cáo tháng',
  '/business/settings': 'Cài đặt',
}
export default function BusinessLayout() {
  const { business } = useAuth()
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'Business Portal'
  return (
    <div className="min-h-screen bg-background">
      <BusinessSidebar />
      <BusinessTopBar title={title} user={business} />
      <main className="ml-64 mt-16 min-h-[calc(100vh-4rem)] p-6">
        <Outlet />
      </main>
    </div>
  )
}
File: src/components/layout/BusinessSidebar.jsx

Logo: "LuxeWash Pro" (giữ nguyên style StaffSidebar)
Subtitle: "Business Portal"
Nav items:
/business/dashboard → Dashboard (dashboard icon)
/business/vehicles → Quản lý xe (local_shipping icon)
/business/bookings → Đặt lịch (calendar_month icon)
/business/history → Lịch sử (history icon)
/business/invoices → Hóa đơn (receipt_long icon)
/business/statements → Báo cáo (assessment icon)
Settings ở dưới cùng (settings icon)
Dùng NavLink từ react-router-dom, active state: bg-primary text-on-primary
Style y hệt StaffSidebar (bg-surface-container-lowest, fixed, h-screen, w-64, border-r)
File: src/components/layout/BusinessTopBar.jsx

Fixed top, right của sidebar (ml-64)
mt-16 height 4rem (h-16)
bg-surface-container-lowest, border-b
Left: title text
Right: user avatar (placeholder), user fullName, role badge "Business", logout button (logout icon)
Dùng useAuth().logout để logout
3.6. Business API Layer
Tạo src/api/business.api.js:

import { apiRequest } from './client'
// === Profile ===
export const fetchBusinessProfile = () => apiRequest('/api/v1/business/my-profile')
export const updateBusinessProfile = (payload) => apiRequest('/api/v1/business/profile', {
  method: 'PUT',
  body: JSON.stringify(payload),
})
// === Dashboard ===
export const fetchBusinessDashboard = () => apiRequest('/api/v1/business/dashboard')
// === Fleet Vehicles ===
export const fetchFleetTemplate = () => apiRequest('/api/v1/fleet/template')
export const importFleet = (formData) => apiRequest('/api/v1/fleet/import', {
  method: 'POST',
  body: formData,
})
export const fetchFleetVehicles = () => apiRequest('/api/v1/business/vehicles')
export const fetchPendingVehicles = () => apiRequest('/api/v1/fleet/pending')
// === Bookings ===
export const fetchBusinessBookings = () => apiRequest('/api/v1/business')
export const fetchBookingDetail = (id) => apiRequest(`/api/v1/business/${id}`)
export const createBusinessBooking = (dto) => apiRequest('/api/v1/business/bookings', {
  method: 'POST',
  body: JSON.stringify(dto),
})
export const cancelBooking = (id) => apiRequest(`/api/v1/business/${id}/cancel`, {
  method: 'POST',
})
// === History ===
export const fetchBusinessHistory = (filter = {}) => {
  const params = new URLSearchParams({
    page: filter.page || 1,
    pageSize: filter.pageSize || 20,
    ...(filter.fleetVehicleId && { fleetVehicleId: filter.fleetVehicleId }),
    ...(filter.fromDate && { fromDate: filter.fromDate }),
    ...(filter.toDate && { toDate: filter.toDate }),
  })
  return apiRequest(`/api/v1/business/history?${params}`)
}
// === Invoices ===
export const fetchBusinessInvoices = () => apiRequest('/api/v1/business/invoices')
export const fetchInvoiceDetail = (id) => apiRequest(`/api/v1/business/invoices/${id}`)
export const exportInvoice = (id) => apiRequest(`/api/v1/business/invoices/${id}/export`)
// === Statements ===
export const fetchMonthlyStatement = (year, month) =>
  apiRequest(`/api/v1/business/statements/monthly?year=${year}&month=${month}`)
// === Public Registration ===
export const registerBusinessProfile = (formData) => apiRequest('/api/v1/business/register', {
  method: 'POST',
  body: formData,
})
Sau đó thêm export trong src/api/index.js:

export { fetchBusinessProfile, fetchBusinessDashboard, fetchFleetVehicles, /* ... */ } from './business.api'
3.7. Cập nhật App.jsx
Thêm import và routes mới:

// Import Business components
import BusinessRoute from './components/auth/BusinessRoute'
import BusinessLayout from './components/layout/BusinessLayout'
import LandingPage from './pages/LandingPage'
import BusinessRegisterPage from './pages/business/BusinessRegisterPage'
import BusinessDashboardPage from './pages/business/BusinessDashboardPage'
import BusinessVehiclesPage from './pages/business/BusinessVehiclesPage'
import BusinessImportPage from './pages/business/BusinessImportPage'
import BusinessBookingsPage from './pages/business/BusinessBookingsPage'
import BusinessNewBookingPage from './pages/business/BusinessNewBookingPage'
import BusinessHistoryPage from './pages/business/BusinessHistoryPage'
import BusinessInvoicesPage from './pages/business/BusinessInvoicesPage'
import BusinessInvoiceDetailPage from './pages/business/BusinessInvoiceDetailPage'
import BusinessStatementsPage from './pages/business/BusinessStatementsPage'
import BusinessSettingsPage from './pages/business/BusinessSettingsPage'
// Routes trong <Routes>
<Route path="/" element={<LandingPage />} />
<Route path="/business/register" element={<BusinessRegisterPage />} />
<Route
  element={
    <BusinessRoute>
      <BusinessLayout />
    </BusinessRoute>
  }
>
  <Route path="/business/dashboard" element={<BusinessDashboardPage />} />
  <Route path="/business/vehicles" element={<BusinessVehiclesPage />} />
  <Route path="/business/vehicles/import" element={<BusinessImportPage />} />
  <Route path="/business/bookings" element={<BusinessBookingsPage />} />
  <Route path="/business/bookings/new" element={<BusinessNewBookingPage />} />
  <Route path="/business/history" element={<BusinessHistoryPage />} />
  <Route path="/business/invoices" element={<BusinessInvoicesPage />} />
  <Route path="/business/invoices/:id" element={<BusinessInvoiceDetailPage />} />
  <Route path="/business/statements" element={<BusinessStatementsPage />} />
  <Route path="/business/settings" element={<BusinessSettingsPage />} />
</Route>
// Các routes hiện tại giữ nguyên
3.8. Business Pages (10 pages)
Tạo thư mục src/pages/business/ và các file sau:

BusinessDashboardPage.jsx

Fetch: fetchBusinessDashboard()
Gọi API khi mount, loading state
6 KPI cards: Tổng xe, Xe đang hoạt động, Xe chờ duyệt, Lần rửa hôm nay, Lần rửa tháng này, Chi tiêu tháng
Dùng formatVnd() cho chi tiêu
Layout: 2x3 grid cards, responsive 1 col mobile
Mỗi card: icon (material symbols), title, value lớn, subtitle mô tả
BusinessVehiclesPage.jsx

Fetch: fetchFleetVehicles() + fetchPendingVehicles()
Tabs: "Xe hoạt động" + "Xe chờ duyệt"
Danh sách xe dạng cards: biển số, hãng xe, dòng xe, loại xe, tài xế, mã nhân viên
Nút "Nhập Excel" → link đến /business/vehicles/import
Empty state khi không có xe
BusinessImportPage.jsx

Nút "Tải template" → gọi fetchFleetTemplate(), mở download URL
Form upload file Excel: kéo thả hoặc click chọn file
Submit → gọi importFleet(formData)
Hiện kết quả: số dòng thành công, số dòng thất bại
Nếu có lỗi, hiển thị danh sách lỗi theo dòng
BusinessBookingsPage.jsx

Fetch: fetchBusinessBookings()
Bảng danh sách booking: ID, biển số, thời gian, trạng thái (badge), số tiền
Filter theo trạng thái: Tất cả, Pending, CheckedIn, Completed, Cancelled
Nút "Đặt lịch mới" → link /business/bookings/new
Nút "Hủy" cho booking Pending
Nút "Xem chi tiết" → expand row hoặc modal
BusinessNewBookingPage.jsx — Booking wizard 4 bước:

Step indicator (ProgressSteps component hoặc tự làm)
Step 1 — Chọn xe: dropdown/radio list từ fetchFleetVehicles(), chỉ hiện xe Active
Step 2 — Chọn chi nhánh: dropdown từ fetchBranches() (đã có trong admin.branches.api.js)
Step 3 — Chọn dịch vụ: checkboxes từ fetchServices() (đã có)
Step 4 — Xác nhận: hiện tổng quan, tính giá, nút "Xác nhận đặt lịch"
Submit → createBusinessBooking(dto)
Success → redirect /business/bookings
BusinessHistoryPage.jsx

Fetch: fetchBusinessHistory(filter)
Filters: date range (từ ngày → đến ngày), dropdown chọn xe
Bảng: biển số, loại xe, chi nhánh, thời gian check-in, thời gian hoàn thành, trạng thái, chi phí
Pagination
Dùng formatDateTime() và formatVnd()
BusinessInvoicesPage.jsx

Fetch: fetchBusinessInvoices()
Bảng: mã hóa đơn, ngày phát hành, biển số, tổng tiền, trạng thái
Link "Xem chi tiết" → /business/invoices/:id
BusinessInvoiceDetailPage.jsx

Fetch: fetchInvoiceDetail(id) từ URL params
Hiện: mã hóa đơn, ngày, chi tiết các dịch vụ (table: mô tả, số lượng, đơn giá, thành tiền)
Tổng cộng, thuế, tổng thanh toán
Nút "Export" → exportInvoice(id)
Back button về /business/invoices
BusinessStatementsPage.jsx

Select: năm + tháng
Fetch: fetchMonthlyStatement(year, month)
Hiện: tổng số lần rửa tháng đó, tổng chi phí
Table: biển số xe, số lần rửa, tổng chi phí (sắp xếp giảm dần theo chi phí)
Dùng formatVnd()
BusinessSettingsPage.jsx

Fetch: fetchBusinessProfile()
Form hiện thông tin: tên công ty, mã số thuế, địa chỉ, email hóa đơn, người đại diện, hạn mức tín dụng, chu kỳ thanh toán, ngày hợp đồng, % giảm giá
Read-only các trường hợp đồng (không cho sửa)
Nút "Lưu" cho các trường có thể sửa
3.9. Business Registration Page (public)
Tạo src/pages/business/BusinessRegisterPage.jsx:

Mục tiêu: Form đăng ký doanh nghiệp — gửi hồ sơ lên backend → chờ Staff/Manager duyệt → tài khoản được kích hoạt.

Layout: 2 columns trên desktop, 1 column trên mobile. Card container với glass-card style.

Form sections:

Thông tin tài khoản:

Số điện thoại (required)
Email (required)
Mật khẩu (required, min 8 chars)
Xác nhận mật khẩu (required, match password)
Thông tin doanh nghiệp:

Tên công ty (required)
Mã số thuế (required)
Địa chỉ giao hóa đơn
Email nhận hóa đơn
Tên người đại diện
Hạn mức tín dụng hàng tháng (number, default 0)
Chu kỳ thanh toán (select: Monthly, Quarterly, Yearly)
Tài liệu đính kèm:

Giấy phép kinh doanh (file upload, required)
Thư ủy quyền (file upload, optional)
Preview filename sau khi chọn
Submission:

Validate all required fields client-side
Tạo FormData (vì backend nhận multipart/form-data)
Gọi registerBusinessProfile(formData) từ business.api.js
Success: hiện alert/message "Đăng ký thành công! Tài khoản của bạn đang chờ được duyệt." → redirect về trang chủ /
Error: hiện error message
Link về trang chủ: "Đã có tài khoản? Đăng nhập" → /login

4. Design System
4.1. Tailwind Theme (dùng lại từ index.css)
Primary:       #006689       (text: on-primary, bg: primary)
Primary-container: #4aa9d7  (on-primary-container: #003b51)
Surface:       #f7f9fb
Background:    #f7f9fb
Error:         #ba1a1a
On-surface:    #191c1e
On-surface-variant: #3f484e
Outline:       #6f787f
Outline-variant: #bec8cf
Surface-container: #eceef0
Surface-container-lowest: #ffffff
Secondary-container: #d5e0f8
4.2. Typography
Font heading: Sora (.font-sora)
Font body: Inter (.font-inter)
Material Symbols icons: .material-symbols-outlined
4.3. Utility classes có sẵn
.glass-card — card với backdrop blur
.glass-panel — panel glass
.neon-glow — box-shadow primary glow
.soft-shadow — soft box-shadow
.input-focus-glow — input glow on focus
4.4. Pattern lặp lại trong pages
Loading: dùng useState + useEffect fetch data
Error: try/catch + state error
Empty state: component EmptyState.jsx từ components/shared/
Status badge: component StatusBadge.jsx từ components/shared/
Confirm dialog: component ConfirmDialog.jsx từ components/shared/
Format tiền: formatVnd(amount) từ utils/format.js
Format ngày: formatDateTime(iso) từ utils/format.js
API calls: wrap trong try/catch, set loading state
5. Backend API Reference (đã có sẵn)
Tất cả endpoints đều có prefix /api/v1/ và yêu cầu JWT Bearer token trừ /auth/login.

POST   /auth/login                              — Login (public)
POST   /auth/refresh-token                     — Refresh token (public)
GET    /business/my-profile                     — Profile doanh nghiệp [Business]
PUT    /business/profile                        — Cập nhật profile [Business]
GET    /business/dashboard                      — KPI dashboard [Business]
POST   /business/bookings                       — Tạo booking [Business]
GET    /business                               — Danh sách booking [Business]
GET    /business/{id}                           — Chi tiết booking [Business]
POST   /business/{id}/cancel                    — Hủy booking [Business]
GET    /business/history                        — Lịch sử rửa xe [Business]
GET    /business/invoices                       — Danh sách hóa đơn [Business]
GET    /business/invoices/{id}                 — Chi tiết hóa đơn [Business]
GET    /business/statements/monthly             — Báo cáo tháng [Business]
GET    /business/invoices/{id}/export           — Export hóa đơn [Business, Staff, Manager]
POST   /business/register                       — Đăng ký doanh nghiệp [Customer] (multipart/form-data)
GET    /business/vehicles                       — Danh sách xe [Business]
GET    /fleet/template                         — Download template Excel [Business]
POST   /fleet/import                           — Import danh sách xe [Business] (multipart/form-data)
GET    /fleet/pending                          — Xe chờ duyệt [Business]
6. Thứ tự triển khai đề xuất
Cập nhật AuthContext.jsx + utils/format.js
Tạo BusinessRoute.jsx
Tạo BusinessLayout.jsx + BusinessSidebar.jsx + BusinessTopBar.jsx
Tạo business.api.js + export trong api/index.js
Cập nhật App.jsx — thêm tất cả routes
Tạo Landing Page (LandingPage.jsx + 9 landing components)
Tạo 10 Business Pages
Tạo BusinessRegisterPage.jsx
7. Lưu ý quan trọng
Không sửa LuxeWash_Mobile_FE, Mobile FE giữ nguyên cho Customer
Không sửa SmartWash-BE, Backend đã hoàn chỉnh
Dùng chung theme từ index.css, không tạo CSS mới
Responsive: tất cả pages phải đẹp trên mobile (≤768px), tablet (768-1024px), desktop (>1024px)
Loading states: mọi page có async data phải có loading spinner/skeleton
Error handling: mọi API call có try/catch, hiện error message khi fail
Consistent spacing: dùng spacing từ Tailwind (p-4, p-6, gap-4, gap-6) và --spacing-* từ CSS theme

Note được gửi từ backend:


Flow work for Business Booking:
1. Setting Up the Contract
Negotiating Volume Rates: The business manager/representative contacts wash providers to secure a discount based on washing cars. Then choose a Payment Structure:
Pay-Per-Wash Billing: Drivers use the services as needed, and the wash company tracks usage and invoices the car company monthly.
The business then will import a file(doc, excel) containing the list of cars that need to be washed. Some required information is the license plate of each car, car model, name,..(adjust if necessary).
The API that receives the file will process its contents with logical code in the BLL layer and return the list of cars with full details then set it to processing booking status to wait for the Manager/Staff to confirm the information is legit.
2. Identifying the Vehicles
To prevent fraud and track which of the listed cars are being washed, providers use various identification method:
License Plate Recognition (LPR): The car wash cameras scan the license plate and log the wash to the business’s account.
3. Day-to-Day Operations
On-Demand Dispatch: Drivers take their cars to the designated car wash locations on their own schedule between fares or at the end of a shift within the time slots available. (A specific lane for Business dedicated for this)
4. Admin & Management
Manager Portal: The manager uses a dashboard to track individual wash frequency, view invoices, and add or remove cars as the fleet size changes.



1. Setting Up the Contract & Fleet Onboarding

Contract & Billing Enhancements:
Tiered Volume Rates: Instead of a flat discount for “n” cars, consider a tiered structure. For example: 1-50 washes/month = 5% off; 51-200 washes/month = 12% off. The system should calculate this dynamically at the end of the billing cycle.
Credit Limits & Post-paid Guardrails: For "Pay-Per-Wash Billing", implement a Monthly Credit Limit for each business account. If they hit their cap mid-month, bookings freeze until a partial payment is made or the admin manually extends the limit.
Data Import & BLL Processing:
File Format Standardization: Restrict imports to .csv or .xlsx. Processing PDFs or Word docs via standard BLL logic introduces massive parsing failure rates.
Data Validation Rules: When parsing the file, your BLL layer should validate fields immediately.
Required: License Plate (Primary Key/Unique Identifier), Vehicle Type (Sedan/SUV - crucial for pricing), Brand/Model.
Optional: Driver Name, Employee ID, Department.
Automated Status Assignment: If data is clean => Status: Pending Approval.
If data has duplicates/formatting errors => Status: Validation Failed (Highlight the exact row/error to the manager).

2. Identifying the Vehicles & Fraud Prevention

LPR (License Plate Recognition) is highly efficient, but in the real world, it fails about 5% to 10% of the time (due to mud, bad lighting, or angles) => Need a fail-safe backup.
Multi-Factor Identification (MFI)
Primary: LPR Camera logs the vehicle at the gate.
Tertiary (Manual): The car wash staff can manually type the license plate into their provider terminal if both automation methods fail.

3. Day-to-Day Operations & Scheduling

The "On-Demand" approach with a dedicated lane is great, but "On-Demand" can lead to massive bottlenecks during peak hours (e.g., Friday afternoons or shift-change times for taxi/ride-sharing fleets).
Capacity Management & "Dedicated Lane" Logic (Optional Nice to have)
Slot Booking vs. Walk-in: Even with a dedicated business lane, you should introduce "Fleet Quotas" per hour. The app can show a simple traffic-light indicator to drivers:
🟢 Green (Low traffic - come anytime)
🟡 Yellow (Moderate wait)
🔴 Red (High traffic - expect delays)
Provider Validation Flow: When a fleet car pulls into the lane, the system must check three things instantly before opening the gate:
Is the contract active?
Is the vehicle status Active?
Has the monthly credit limit been exceeded?

4. Admin & Management:

Portal / Role
Key Features Required
Business Client Manager
• Real-time active car tracker.
• "Freeze Vehicle" button (if a car is sold or the driver leaves).
• Monthly usage analytics & spending charts.
• Invoice download & Payment gateway.
Car Wash Provider Admin
• Live queue management dashboard for the dedicated lane.
• LPR override/manual logging tool.
• Reconciliation report generator (to prove to the client that “x” cars were washed).
Driver Mobile App View
• "Find Nearest Partner Wash" map. (GPS optional)
• Digital ID/QR Code for backup check-in. (Optional)
• Wash history (transparency for the driver).




5. Technical Architecture Suggestions (BBA/System View)

Audit Trail Logs: Because financial invoicing is tied to these washes, any time a car is added, removed, or a license plate is modified, log who did it and when to prevent internal fraud.
Webhook notifications: When a car is washed, trigger a push notification/email to the Fleet Manager ("Vehicle ABC-1234 has just completed a Premium Wash at Location X"). This builds high trust in your B2B platform.


1. The "Visual Proof" Feature:
How it works: Every time the LPR camera scans a license plate and triggers a wash, the system should automatically capture two photos:
A close-up of the license plate (for AI verification).
A wide-angle shot of the car entering the wash bay (proving the physical car was actually there).
System Implementation: Store these photos in a cloud storage bucket (Cloudinary) and link the photo URLs to that specific transaction ID in the database.
The BA Value: In the Manager Portal, next to every line item on the invoice, add a small "View Proof" icon. If a manager disputes a wash, they click it, see their own car in the wash lane, and the dispute is instantly settled without customer service intervention.
2. Driver-Side Micro-Confirmations
Use the driver to create a "double-shake" confirmation system.
How it works: The moment the LPR gates open and the car enters the wash, the SmartAutoWash system triggers an automated Push Notification or SMS to that specific driver's phone.
"Your fleet vehicle [ABC-1234] is currently receiving a wash at Location Downtown. Not you? Tap here to report."
The BA Value: If a driver gets this notification while sitting at home, they can immediately flag it as fraudulent. If they don't flag it within 24 hours, the system marks the transaction as "Driver-Verified," which protects you from end-of-the-month disputes.
3. Automated "Anomaly Detection" (BLL Logic)
Instead of waiting for the business manager to find a mistake at the end of the month, let the Business Logic Layer (BLL) flag suspicious behavior in real-time. Set up flag for:
The "Double Wash" Flag: A car cannot physically be in two different car wash locations at the same time, or logically need two washes within 2-3 hours. If Car A gets washed at 1:00 PM and again at 2:00 PM, the system automatically flags the second wash as Pending Review and alerts the provider.

Phase 1 — Business Registration (Already Done)
1. Register Business
POST /api/v1/auth/register => only successfully registered Customer can register for Business
POST /api/v1/business/register 		Authorize: Customer

Upload:
Company Name: Vinfast
Tax Code: 0107894416
Business License PDF: PDF files is Ok
Authorization Letter PDF (optional)
Result:
{
  "approvalStatus": "Pending"
}


2. Manager Reviews Business
View pending businesses:
GET /api/v1/business/pending 	Authorize: Manager

Approve:
POST /api/v1/business/staff/review-application	Authorize: Manager

Reject:
POST /api/v1/business/staff/review-application	Authorize: Manager

After approval:
{
  "approvalStatus": "Approved"
}

Only after this can fleet import work.

Phase 2 — Fleet Import
3. Business Downloads Template
Create:
GET /api/v1/fleet/template	Authorize: Business

Returns:
FleetTemplate.xlsx (naming doesn’t matter, just need the correct file format)

Columns:
STT
LicensePlate
VehicleType
Brand
Model
DriverName
EmployeeCode
1
51A12345
Sedan
Toyota
Vios
Nguyen Van A
EMP001


4. Business Imports Fleet
POST /api/v1/fleet/import	Authorize: Business
Template: https://res.cloudinary.com/dshcb4yb9/raw/upload/v1780972127/fleet-imports/tdsmnitkjs5uveu2a4tr.xlsx 
Form-data:
file = fleet.xlsx

Business JWT required.

Happy Case
Vehicle Type should be in DB before this step
Excel:
LicensePlate
VehicleType
51A12345
Sedan
51B67890
SUV

Response:
{
  "fleetImportBatchId": 1,
  "totalRows": 2,
  "successRows": 2,
  "failedRows": 0,
  "status": "Completed"
}

Database:
FleetImportBatch
Status = Completed

FleetVehicle
Status = PendingApproval


Validation Failed Case
Excel:
LicensePlate
VehicleType


Sedan
51A12345
InvalidType

Response:
{
  "fleetImportBatchId": 2,
  "totalRows": 2,
  "successRows": 0,
  "failedRows": 2,
  "status": "Failed"
}

Errors saved into:
FleetImportErrors


Phase 3 — Business Checks Import Result
5. View Import History
GET /api/v1/fleet/imports	Authorize: Business


6. View Import Detail
GET /api/v1/fleet/import-batches/{id}	Authorize: Business

Returns:
{
  "fleetImportBatchId": 2,
  "status": "Failed",
  "errors": [
    {
      "rowNumber": 2,
      "errorMessage": "License plate is required."
    },
    {
      "rowNumber": 3,
      "errorMessage": "Vehicle type not found."
    }
  ]
}


Phase 4 — Staff Review Fleet Vehicles
7. Business Views Pending Vehicles
GET /api/v1/fleet/pending	Authorize: Staff/Manager/Business

Role:
Business

Response:
[
  {
    "fleetVehicleId": 1,
    "licensePlate": "51A12345",
    "status": "PendingApproval"
  }
]


8. Staff Approves Vehicle
POST /api/v1/fleet/1/approve	Authorize: Staff/Manager

Role:
Staff
Manager

Result:
{
  "message": "Fleet vehicle approved."
}

Database:
FleetVehicle
Status = Active

Now the vehicle can use business booking.

9. Staff Rejects Vehicle
POST /api/v1/fleet/1/reject	Authorize: Staff/Manager

Body:
{
  "rejectionReason": "License plate not valid."
}

Result:
{
  "message": "Fleet vehicle rejected."
}

Database:
Status = Rejected
RejectionReason = License plate not valid.


Phase 5 — Business Service Flow
Validation:
Check 1
Contract active?
BusinessProfile.ApprovalStatus == Approved

Check 2
Vehicle active?
FleetVehicle.Status == Active

Check 3
Credit limit exceeded?
CurrentMonthSpent <= CreditLimit

Check 4
Dedicated business lane available?
LaneType == Business

If all pass:
Service will be Available





  
Phase 6 – Fleet Vehicle Detail
GET /api/v1/business/fleet/vehicles/{id}	Authorize: Business

Expected:
{
  "fleetVehicleId": 1,
  "licensePlate": "51A12345",
  "vehicleType": "Sedan",
  "status": "Active"
}


Phase 7 – Fleet Booking
Business
Get active vehicles:
GET /api/v1/business/fleet/vehicles	Authorize: Business

Choose:
FleetVehicleId = 1


Create booking
POST /api/v1/business/bookings

Example:
{
  "fleetVehicleId": 1,
  "branchId": 1,
  "slotId": 1,
  "scheduledTime": "2026-06-10",
  "serviceIds": [1,2]
}

Expected:
{
  "bookingId": 1001,
  "status": "Pending"
}


Phase 8 – Booking Management
View List
GET /api/v1/business/bookings	Authorize: Business

Expected:
Booking appears


View Detail
GET /api/v1/business/bookings/{id}	Authorize: Business

Expected:
Services
Vehicle
Price
Status


Cancel Booking
POST /api/v1/business/bookings/{id}/cancel	Authorize: Business

Expected:
Status = Cancelled


Create another booking for next phases.

Phase 9 – Check In (Manual while LPR Not Ready)
The vehicle arrives.
Staff:
POST /api/v1/business/fleet/checkin	Authorize: Staff

Example:
{
  "bookingId": 1002
}

Expected:
{
  "fleetWashLogId": 1,
  "status": "CheckedIn"
}


Database:
FleetWashLogs

Expected:
Status = CheckedIn


Phase 10 – Walk-In Vehicle
No booking exists.
Staff:
POST /api/v1/business/fleet/walkin		Authorize: Staff

Example:
{
  "fleetVehicleId": 1,
  "branchId": 1
}

Expected:
{
  "fleetWashLogId": 2,
  "status": "CheckedIn"
}


Phase 11 – Lane Assignment
Manager:
POST /api/v1/business/fleet/washlogs/{washLogId}/assign-lane	Authorize: Staff/Manager

Example:
{
  "laneId": 1,
  "staffUserId": 5
}

Expected:
Status = Assigned


Phase 12 – Start Processing
Staff:
POST /api/v1/business/fleet/start-processing	Authorize: Staff

Example:
{
  "washLogId": 1
}

Expected:
Status = Processing


Verify:
GET /api/v1/business/fleet/current-vehicles	Authorize: Staff/Manager

The vehicle should appear.

Phase 13 – Check Out
Staff:
POST /api/v1/business/fleet/checkout/{washLogId}	Authorize: Staff

Expected:
{
  "invoiceId": 15,
  "totalAmount": 250000
}


Database:
FleetWashLogs

Expected:
Status = Completed
CompletedTime != null


Phase 14 – Invoice Verification
GET /api/v1/business/fleet/invoices/booking/{bookingId}	Authorize: Business/Staff/Manager

Expected:
{
  "invoiceCode": "INV-20260605-001",
  "subtotal": 250000,
  "totalAmount": 250000,
  "items": [...]
}


Database:
Invoices

Expected:
1 invoice created

InvoiceItems

Expected:
1 record per service


Phase 15 – Dashboard
GET /api/v1/business/fleet/dashboard	Authorize: Business/Staff/Manager

Expected:
{
  "totalVehicles": 2,
  "activeVehicles": 2,
  "todayWashCount": 1,
  "monthlyWashCount": 1,
  "monthlySpend": 250000
}


Phase 16 – History
GET /api/v1/business/fleet/history		Authorize: Business

Expected:
[
  {
    "fleetWashLogId": 1,
    "licensePlate": "51A12345",
    "washType": "Booking",
    "status": "Completed"
  }
]


Final Success Criteria
If all pass, the entire Fleet lifecycle is validated:
Business Registration
        ↓
Fleet Import
        ↓
Approval
        ↓
Fleet Vehicle Active
        ↓
Booking
        ↓
Check In
        ↓
Lane Assignment
        ↓
Processing
        ↓
Check Out
        ↓
Invoice
        ↓
Dashboard
        ↓
History




1. Business Registration
Business Registration Page
Submit registration
Role: Customer
POST /api/v1/business/register

FormData:
companyName
taxCode
businessAddress
billingEmail
representativeName
paymentTermDays
businessLicense
authorizationLetter

Success:
{
  "message": "Business registration submitted successfully. Waiting for approval.",
  "data": {
    "businessProfileId": 1
  }
}


My Business Profile
Role: Business
GET /api/v1/business/my-profile

Use when:
Business Dashboard
Business Profile Page


2. Business Approval (Staff / Manager)
Pending Applications
GET /api/v1/business/staff/pending-applications

Role:
Staff
Manager

Display:
Company Name
Tax Code
Created Date
Status


Application Detail
GET /api/v1/business/staff/application/{businessProfileId}

Display:
Business License
Authorization Letter
Representative
Tax Code


Approve / Reject
POST /api/v1/business/staff/review-application

Body:
{
  "businessProfileId": 1,
  "isApproved": true
}

or
{
  "businessProfileId": 1,
  "isApproved": false,
  "rejectionReason": "Invalid tax code"
}


3. Fleet Management
Fleet Import
Download Template
GET /api/v1/fleet/template
Upload Excel
POST /api/v1/fleet/import

Role:
Business

FormData:
file


Pending Vehicles
GET /api/v1/fleet/pending

Role:
Business

Use:
Fleet Vehicle Approval Status Screen


Import History
GET /api/v1/fleet/fleet/imports

Role:
Manager
Staff


Import Detail
GET /api/v1/fleet/fleet/imports/{batchId}

Role:
Manager
Staff

Show:
Import Errors
Failed Rows
Success Rows


Approve Vehicle
POST /api/v1/fleet/staff/approve/{id}

Role:
Staff
Manager


Reject Vehicle
POST /api/v1/fleet/staff/reject/{id}

Body:
{
  "rejectionReason": "Invalid plate"
}


4. Fleet Vehicle Selection
Active Vehicles
GET /api/v1/business/vehicles

Role:
Business

Use:
Booking Creation Form
Vehicle Dropdown


5. Business Booking
Create Booking
POST /api/v1/business/bookings

Role:
Business

Body:
{
  "fleetVehicleId": 1,
  "branchId": 1,
  "slotId": 1,
  "scheduledTime": "2026-06-10",
  "serviceIds": [1,2]
}


Booking List
GET /api/v1/business

Role:
Business

Display:
Booking History
Booking Management


Booking Detail
GET /api/v1/business/{id}

Role:
Business


Cancel Booking
POST /api/v1/business/{id}/cancel

Role:
Business


6. Vehicle Check-In
Booking Check-In
POST /api/v1/fleet/check-in

Role:
Staff
Manager

Body:
{
  "bookingId": 1001
}

Use:
Reception Screen
Arrival Screen


Walk-In Check-In
POST /api/v1/fleet/walk-in

Role:
Staff
Manager

Body:
{
  "fleetVehicleId": 1,
  "branchId": 1
}


7. Queue Management
Current Queue
GET /api/v1/fleet/queue?branchId=1

Role:
Staff
Manager

Use:
Queue Screen
Operations Dashboard


Current Processing Vehicles
GET /api/v1/fleet/current

Role:
Staff
Manager


8. Lane Assignment
Assign Lane
POST /api/v1/business/washlogs/{washLogId}/assign-lane

Role:
Staff
Manager

Body:
{
  "laneId": 1,
  "staffUserId": 5
}


9. Processing
Start Processing
POST /api/v1/fleet/{washLogId}/start-processing

Role:
Staff
Manager

Body:
{
  "laneId": 1
}


10. Checkout
Checkout
POST /api/v1/fleet/checkout/{washLogId}

Role:
Staff
Manager

Returns:
{
  "fleetWashLogId": 1,
  "completedTime": "..."
}


11. Dashboard
Business Dashboard
GET /api/v1/business/dashboard

Role:
Business

Cards:
Total Vehicles
Active Vehicles
Today Washes
Monthly Washes
Monthly Spend


12. History
Fleet Wash History
GET /api/v1/business/history

Role:
Business

Filters:
FromDate
ToDate
Vehicle
Status
Branch


13. Monthly Statement
Monthly Statement Screen
GET /api/v1/business/statements/monthly?year=2026&month=5

Role:
Business

Display:
Total Washes
Total Cost
Vehicles
Usage Breakdown


14. Invoice Module
Invoice List
GET /api/v1/invoice/invoices

Role:
Business
Manager

Columns:
Invoice Code
Issue Date
Amount
Status


Invoice Detail
GET /api/v1/invoice/invoices/{invoiceId}

Role:
Business
Manager

Display:
Items
Subtotal
Tax
Total


Export Invoice Data (JSON)
GET /api/v1/business/invoices/{invoiceId}/export

Role:
Business
Manager
Staff

Use:
Preview Invoice Screen


Download PDF
GET /api/v1/invoice/invoices/{invoiceId}/pdf

Role:
Business
Manager
Staff

Browser behavior:
window.open(
  `/api/v1/invoice/invoices/${invoiceId}/pdf`
);

Generated filename:
invoice-2026-05-20260609-VinFast.pdf


15. Monthly Billing (Manager)
Generate Monthly Invoice
POST /api/v1/invoice/billing/monthly

Role:
Manager

Body:
{
  "businessProfileId": 1,
  "year": 2026,
  "month": 5
}

Use:
Billing Management Screen
Month End Closing
Finance Module

Flow:
Manager
   ↓
Generate Monthly Invoice
   ↓
Invoice Created
   ↓
Business Opens Invoice List
   ↓
View Invoice
   ↓
Download PDF
