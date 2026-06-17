export default function AppDownloadSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-[#003344] to-[#006689]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-sora text-3xl font-bold text-white mb-4">
              Tải ứng dụng LuxeWash
            </h2>
            <p className="text-white/80 mb-8 text-lg leading-relaxed">
              Đặt lịch, theo dõi trạng thái và thanh toán ngay trên điện thoại. Tích điểm nhận ưu đãi mỗi lần rửa xe.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="#"
                className="inline-flex items-center gap-3 bg-white text-[#003344] px-6 py-3 rounded-xl hover:bg-white/90 transition-colors shadow-lg"
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-left">
                  <p className="text-xs opacity-70">Tải trên</p>
                  <p className="text-sm font-semibold">App Store</p>
                </div>
              </a>

              <a
                href="#"
                className="inline-flex items-center gap-3 bg-white text-[#003344] px-6 py-3 rounded-xl hover:bg-white/90 transition-colors shadow-lg"
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm3.35-4.31c.34.27.59.69.59 1.19s-.22.9-.57 1.18l-2.29 1.32-2.5-2.5 2.5-2.5 2.27 1.31zM6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z" />
                </svg>
                <div className="text-left">
                  <p className="text-xs opacity-70">Tải trên</p>
                  <p className="text-sm font-semibold">Google Play</p>
                </div>
              </a>
            </div>
          </div>

          <div className="hidden md:flex justify-center">
            <div className="relative">
              <div className="w-64 h-[500px] bg-[#1a1a2e] rounded-[3rem] border-4 border-white/20 shadow-2xl overflow-hidden flex items-center justify-center">
                <div className="bg-gradient-to-br from-[#003344] to-[#006689] w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-6xl text-white/50">smartphone</span>
                </div>
              </div>

              <div className="absolute top-1/4 -right-8 bg-white rounded-2xl shadow-xl p-3 w-36">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-green-500 filled text-base">check_circle</span>
                  <span className="text-xs font-semibold text-[#191c1e]">Thanh toán OK</span>
                </div>
                <p className="text-[10px] text-[#6f787f]">Thanh toán thành công</p>
              </div>

              <div className="absolute bottom-1/4 -left-8 bg-white rounded-2xl shadow-xl p-3 w-36">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[#006689] filled text-base">star</span>
                  <span className="text-xs font-semibold text-[#191c1e]">Tích điểm</span>
                </div>
                <p className="text-[10px] text-[#6f787f]">+50 điểm thưởng</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
