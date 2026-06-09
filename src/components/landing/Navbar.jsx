import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { label: 'Trang chủ', href: '#' },
    { label: 'Dịch vụ', href: '#services' },
    { label: 'Bảng giá', href: '#pricing' },
    { label: 'Chi nhánh', href: '#branches' },
    { label: 'Về chúng tôi', href: '#about' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#003344]/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <h1 className="font-sora text-[24px] font-bold text-white tracking-tight">LuxeWash</h1>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors backdrop-blur-sm"
            >
              Đăng nhập
            </Link>
            <Link
              to="/business/register"
              className="px-4 py-2 text-sm font-medium text-[#003344] bg-white rounded-lg hover:bg-white/90 transition-colors font-semibold"
            >
              Đăng ký DN
            </Link>
          </div>

          <button
            className="md:hidden p-2 text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="material-symbols-outlined">
              {menuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-[#003344]/95 backdrop-blur-md border-t border-white/10 px-4 py-4">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block py-2 text-sm font-medium text-white/70"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-4 flex flex-col gap-2">
            <Link
              to="/login"
              className="block text-center py-2 text-sm font-medium text-white border border-white/30 rounded-lg"
            >
              Đăng nhập
            </Link>
            <Link
              to="/business/register"
              className="block text-center py-2 text-sm font-medium text-[#003344] bg-white rounded-lg font-semibold"
            >
              Đăng ký DN
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
