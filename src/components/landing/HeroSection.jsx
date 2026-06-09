import { Link } from 'react-router-dom'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#006689] via-[#004d66] to-[#003344] pt-16 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 right-20 w-[500px] h-[500px] bg-[#0099cc]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 left-10 w-[400px] h-[400px] bg-[#00b3e6]/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-[#33ccff]/5 rounded-full blur-[80px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0xMDAgMEwwIDEwMFYwaDEwMHptLTUgMGwtMTAgMTAwaDEwTDEwIDB6bS01IDBsLTEwIDEwMGgxMEwxMCA1em0tNSA1bC0xMCAxMDBoMTBMMTUgMTB6bS01IDBsLTEwIDEwMGgxMEwxMCA1eiIgc3Ryb2tlPSIjZmZmZiIgc3Ryb2tlLXdpZHRoPSIwLjEiIGZpbGw9Im5vbmUiLz48L3N2Zz4=')] opacity-20" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 text-white text-xs font-semibold mb-6 backdrop-blur-sm border border-white/20">
              <span className="material-symbols-outlined text-sm filled">auto_awesome</span>
              Công nghệ 4.0
            </div>

            <h1 className="font-sora text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Rửa xe thông minh.
              <br />
              <span className="text-[#7dd3fc]">Tiết kiệm thời gian.</span>
            </h1>

            <p className="text-lg text-white/80 mb-8 max-w-lg leading-relaxed">
              Hệ thống trạm rửa xe tự động hiện đại với công nghệ nhận diện biển số LPR.
              Đặt lịch nhanh chóng, trải nghiệm không chạm, thanh toán minh bạch.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="#"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#00b3e6] text-white rounded-xl font-semibold hover:bg-[#0099cc] transition-colors shadow-lg shadow-[#00b3e6]/30"
              >
                <span className="material-symbols-outlined">smartphone</span>
                Tải ứng dụng
              </a>
              <Link
                to="/business/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/30 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors"
              >
                <span className="material-symbols-outlined">business</span>
                Đăng ký doanh nghiệp
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-8">
              <div>
                <p className="text-2xl font-bold text-[#7dd3fc]">50K+</p>
                <p className="text-xs text-white/60">Khách hàng</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <p className="text-2xl font-bold text-[#7dd3fc]">10+</p>
                <p className="text-xs text-white/60">Chi nhánh</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <p className="text-2xl font-bold text-[#7dd3fc]">4.8</p>
                <p className="text-xs text-white/60">Điểm đánh giá</p>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/20">
              <img
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"
                alt="LuxeWash car wash station"
                className="w-full h-96 object-cover"
              />
              <div className="p-6 bg-white/95">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#191c1e]">Trạm rửa xe tự động</p>
                    <p className="text-xs text-[#3f484e]">Quận 1, TP.HCM</p>
                  </div>
                  <div className="flex items-center gap-1 text-[#f59e0b]">
                    <span className="material-symbols-outlined text-sm filled">star</span>
                    <span className="text-sm font-semibold">4.9</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 border border-white/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#006689]/10 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#006689] text-lg filled">check_circle</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#191c1e]">Rửa hoàn tất</p>
                  <p className="text-xs text-[#3f484e]">51A-12345</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
