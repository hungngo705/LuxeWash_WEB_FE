import { useState } from 'react'
import { NavLink } from 'react-router-dom'

// Cấu hình các nhóm navigation - sắp xếp theo đúng nghiệp vụ thực tế
const navGroups = [
  {
    title: 'Tổng quan',
    icon: 'dashboard',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard', end: true },
    ],
  },
  {
    title: 'Dịch vụ & Xe',
    icon: 'local_car_wash',
    items: [
      { to: '/admin/services', label: 'Dịch vụ', icon: 'local_car_wash' },
      { to: '/admin/vehicle-types', label: 'Loại xe', icon: 'directions_car' },
      { to: '/admin/vehicle-approvals', label: 'Duyệt loại xe', icon: 'pending_actions' },
      { to: '/admin/car-models', label: 'Mẫu xe', icon: 'commute' },
      { to: '/admin/pending-car-models', label: 'Duyệt mẫu xe', icon: 'fact_check' },
    ],
  },
  {
    title: 'Cơ sở vật hành',
    icon: 'store',
    items: [
      { to: '/admin/branches', label: 'Chi nhánh', icon: 'store' },
      { to: '/admin/lanes', label: 'Làn rửa', icon: 'garage' },
      { to: '/admin/time-slots', label: 'Khung giờ', icon: 'schedule' },
    ],
  },
  {
    title: 'Nhân sự',
    icon: 'group',
    items: [
      { to: '/admin/employees', label: 'Nhân viên', icon: 'badge' },
    ],
  },
  {
    title: 'Khuyến mãi',
    icon: 'local_offer',
    items: [
      { to: '/admin/vouchers', label: 'Voucher đổi điểm', icon: 'confirmation_number' },
      { to: '/admin/voucher-campaigns', label: 'Voucher tự cấp', icon: 'campaign' },
    ],
  },
  {
    title: 'Khách hàng',
    icon: 'people',
    items: [
      { to: '/admin/users', label: 'Người dùng', icon: 'group' },
      { to: '/admin/tiers', label: 'Hạng thành viên', icon: 'workspace_premium' },
    ],
  },
  {
    title: 'Vận hành',
    icon: 'assignment',
    items: [
      { to: '/admin/bookings', label: 'Lịch đặt', icon: 'calendar_month' },
      { to: '/admin/inventory', label: 'Kho vật tư', icon: 'inventory_2' },
    ],
  },
  {
    title: 'Tài chính',
    icon: 'payments',
    items: [
      { to: '/admin/transactions', label: 'Giao dịch', icon: 'payments' },
    ],
  },
  {
    title: 'Đối tác DN',
    icon: 'business',
    items: [
      { to: '/admin/business-applications', label: 'Đơn DN', icon: 'assignment' },
      { to: '/admin/fleet-approvals', label: 'Duyệt xe DN', icon: 'local_shipping' },
      { to: '/admin/business-invoices', label: 'Hóa đơn DN', icon: 'receipt_long' },
    ],
  },
]

// Component NavGroup - Header + collapsible items (cửa cuộn)
function NavGroup({ group, isFirst, isOpen, onToggle }) {
  return (
    <div className={!isFirst ? 'mt-2' : ''}>
      {/* Group Header - Nổi bật, có thể click để thu gọn */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`group relative mx-3 flex w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-md border border-outline-variant/60 bg-white px-4 py-2.5 text-on-surface transition-colors duration-300 hover:border-outline hover:bg-surface-variant/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          isOpen ? 'shadow-sm' : ''
        }`}
      >
        <span
          className="material-symbols-outlined text-[20px] leading-none transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {group.icon}
        </span>
        <span className="text-[12px] font-bold tracking-[0.08em]">
          {group.title}
        </span>
      </button>

      {/* Collapsible Items - Cửa cuộn trượt mượt */}
      <div
        className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 mt-0'
        }`}
      >
        <div className="min-h-0">
          <div className="flex flex-col gap-1 px-2">
            {group.items.map(({ to, label, icon, end }) => (
              <NavItem key={to} to={to} label={label} icon={icon} end={end} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Component NavItem - Item con trong nhóm (icon trái, text căn giữa)
function NavItem({ to, label, icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center justify-center rounded-lg px-3 py-2.5 transition-colors duration-200 active:scale-95 ${
          isActive
            ? 'bg-primary text-on-primary shadow-sm'
            : 'text-on-surface-variant hover:bg-surface-variant/60 hover:text-on-surface'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`material-symbols-outlined text-[22px] leading-none shrink-0 mr-auto ${isActive ? 'filled' : ''}`}
          >
            {icon}
          </span>
          <span className="text-[13.5px] font-medium tracking-wide grow text-center">
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

export default function AdminSidebar() {
  // Mặc định: nhóm đầu tiên mở, còn lại thu gọn - nhưng để UX tốt ta mở nhóm đang active
  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(navGroups.map((g, i) => [g.title, i === 0]))
  )

  const toggleGroup = (title) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <nav className="bg-surface-container-lowest fixed top-0 left-0 z-50 h-screen w-64 border-r border-outline-variant shadow-sm">
      <div className="flex h-full flex-col py-6">
        {/* Logo Header */}
        <div className="mb-6 px-4">
          <h1 className="font-sora text-[28px] leading-9 font-semibold tracking-tight text-primary">
            Luxewash
          </h1>
          <p className="mt-1 text-xs font-semibold tracking-wider text-tertiary">
            Admin Console
          </p>
        </div>

        {/* Navigation Groups */}
        <div className="flex flex-grow flex-col overflow-y-auto">
          {navGroups.map((group, index) => (
            <NavGroup
              key={group.title}
              group={group}
              isFirst={index === 0}
              isOpen={openGroups[group.title]}
              onToggle={() => toggleGroup(group.title)}
            />
          ))}
        </div>

        {/* Settings - Fixed at bottom */}
        <div className="mt-auto pt-4 border-t border-outline-variant px-3">
          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              `flex items-center justify-center rounded-lg px-3 py-2.5 transition-colors duration-200 active:scale-95 ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-variant/60 hover:text-on-surface'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`material-symbols-outlined text-[22px] leading-none shrink-0 mr-auto ${isActive ? 'filled' : ''}`}
                >
                  settings
                </span>
                <span className="text-[13.5px] font-medium tracking-wide grow text-center">
                  Cài đặt
                </span>
              </>
            )}
          </NavLink>
        </div>
      </div>
    </nav>
  )
}
