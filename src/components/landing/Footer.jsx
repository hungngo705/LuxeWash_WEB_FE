import { Link } from 'react-router-dom'

export default function Footer() {
  const columns = [
    {
      title: 'Về LuxeWash',
      links: [
        { label: 'Trang chủ', href: '/' },
        { label: 'Dịch vụ', href: '#services' },
        { label: 'Bảng giá', href: '#pricing' },
        { label: 'Chi nhánh', href: '#branches' },
      ],
    },
    {
      title: 'Dịch vụ',
      links: [
        { label: 'Rửa nhanh', href: '#' },
        { label: 'Rửa tiêu chuẩn', href: '#' },
        { label: 'Rửa cao cấp', href: '#' },
        { label: 'Hấp sấy', href: '#' },
      ],
    },
    {
      title: 'Hỗ trợ',
      links: [
        { label: 'Câu hỏi thường gặp', href: '#' },
        { label: 'Chính sách bảo hành', href: '#' },
        { label: 'Điều khoản sử dụng', href: '#' },
        { label: 'Chính sách bảo mật', href: '#' },
      ],
    },
    {
      title: 'Liên hệ',
      links: [
        { label: 'Hotline: 1900 1234', href: 'tel:19001234' },
        { label: 'Email: support@luxewash.vn', href: 'mailto:support@luxewash.vn' },
        { label: 'Địa chỉ: 123 Đồng Khởi, Q1, TP.HCM', href: '#' },
        { label: 'Giờ làm việc: 6:00 - 22:00', href: '#' },
      ],
    },
  ]

  return (
    <footer className="bg-[#191c1e] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <h1 className="font-sora text-2xl font-bold text-white mb-3">LuxeWash</h1>
            <p className="text-sm text-white/60 mb-4">
              Hệ thống trạm rửa xe tự động hiện đại với công nghệ LPR. Tiết kiệm thời gian, trải nghiệm không chạm.
            </p>
            <div className="flex gap-3">
              {['facebook', 'youtube', 'instagram'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#00b3e6] hover:text-white transition-colors text-white/70"
                >
                  <span className="material-symbols-outlined text-sm">{social}</span>
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-sora text-sm font-bold text-white mb-3">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-white/60 hover:text-[#00b3e6] transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/40">
            © 2026 LuxeWash. Tất cả quyền được bảo lưu.
          </p>
          <div className="flex gap-4">
            <Link to="/business/register" className="text-sm text-[#00b3e6] hover:text-[#7dd3fc] transition-colors">
              Đăng ký doanh nghiệp
            </Link>
            <Link to="/login" className="text-sm text-[#00b3e6] hover:text-[#7dd3fc] transition-colors">
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
