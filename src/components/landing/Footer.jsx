import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-[#191c1e] py-10 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2">
          <div><p className="font-sora text-2xl font-bold">LuxeWash</p><p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80">Hệ thống đặt lịch, quản lý đội xe và vận hành rửa xe theo chi nhánh.</p></div>
          <nav aria-label="Liên kết cuối trang" className="flex flex-wrap items-start gap-x-6 gap-y-4 text-sm">
            {[['#services', 'Dịch vụ'], ['#pricing', 'Bảng giá'], ['#branches', 'Chi nhánh'], ['#faq', 'Câu hỏi thường gặp']].map(([href, label]) => <a key={href} href={href} className="text-white/85 hover:text-[#7dd3fc]">{label}</a>)}
            <Link to="/business/register" className="text-[#7dd3fc]">Đăng ký doanh nghiệp</Link>
            <Link to="/login" className="text-[#7dd3fc]">Đăng nhập cổng web</Link>
          </nav>
        </div>
        <p className="mt-8 border-t border-white/15 pt-6 text-sm text-white/70">© {new Date().getFullYear()} LuxeWash.</p>
      </div>
    </footer>
  )
}
