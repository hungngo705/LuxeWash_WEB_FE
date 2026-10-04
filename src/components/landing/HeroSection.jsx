import { Link } from 'react-router-dom'

export default function HeroSection() {
  return (
    <section id="home" className="scroll-mt-20 bg-gradient-to-br from-[#006689] via-[#004d66] to-[#003344] pt-16 text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
        <div>
          <p className="mb-5 text-sm font-semibold tracking-wide text-[#7dd3fc]">LUXEWASH · ĐẶT LỊCH & QUẢN LÝ RỬA XE</p>
          <h1 className="mb-6 font-sora text-4xl font-bold leading-tight sm:text-5xl">Đặt lịch rửa xe.<br /><span className="text-[#7dd3fc]">Theo dõi trên hệ thống.</span></h1>
          <p className="max-w-xl text-lg leading-relaxed text-white/90">Xem dịch vụ, giá theo loại xe và các chi nhánh đang hoạt động. Khách hàng cá nhân sử dụng ứng dụng LuxeWash; doanh nghiệp quản lý đội xe và lịch rửa trên cổng web.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#services" className="rounded-xl bg-white px-6 py-3 font-semibold text-[#003344] hover:bg-white/90">Xem dịch vụ</a>
            <Link to="/business/register" className="rounded-xl border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">Đăng ký doanh nghiệp</Link>
          </div>
        </div>
        <div className="rounded-3xl border border-white/20 bg-white/10 p-6 sm:p-8">
          <h2 className="mb-6 font-sora text-xl font-semibold">Các chức năng hiện có</h2>
          <div className="space-y-5">
            {[
              ['calendar_month', 'Đặt lịch theo chi nhánh', 'Chọn dịch vụ và khung giờ còn chỗ.'],
              ['directions_car', 'Quản lý phương tiện', 'Theo dõi xe cá nhân hoặc đội xe doanh nghiệp.'],
              ['receipt_long', 'Theo dõi lịch và thanh toán', 'Xem trạng thái lịch rửa và lịch sử giao dịch.'],
              ['build', 'Xử lý lịch bị sự cố', 'Xem phương án xử lý khi lịch bị ảnh hưởng.'],
            ].map(([icon, title, description]) => (
              <div key={icon} className="flex gap-4">
                <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-[#7dd3fc]">{icon}</span>
                <div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-white/85">{description}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
