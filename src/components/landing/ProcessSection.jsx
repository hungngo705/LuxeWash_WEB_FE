const steps = [
  {
    number: 1,
    icon: 'calendar_month',
    title: 'Đặt lịch',
    description: 'Đặt lịch rửa xe qua app trong 30 giây. Chọn chi nhánh, dịch vụ và thời gian phù hợp.',
  },
  {
    number: 2,
    icon: 'directions_car',
    title: 'Đến trạm',
    description: 'Lái xe đến trạm LuxeWash đã đặt. Hệ thống tự nhận diện biển số khi bạn vào cổng.',
  },
  {
    number: 3,
    icon: 'local_car_wash',
    title: 'Rửa xe tự động',
    description: 'Xe được rửa tự động bằng công nghệ hiện đại. Bạn không cần xuống xe.',
  },
  {
    number: 4,
    icon: 'check_circle',
    title: 'Hoàn tất',
    description: 'Nhận thông báo khi xe sạch. Thanh toán qua app hoặc tại quầy.',
  },
]

export default function ProcessSection() {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[#006689]/10 text-[#006689] text-xs font-semibold rounded-full mb-3">Quy trình</span>
          <h2 className="font-sora text-3xl font-bold text-[#191c1e] mb-3">Quy trình 4 bước</h2>
          <p className="text-[#3f484e]">Trải nghiệm rửa xe không chạm chỉ trong vài phút</p>
        </div>

        <div className="hidden md:grid grid-cols-4 gap-8 relative">
          {steps.map((step, idx) => (
            <div key={step.number} className="text-center relative">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#006689] to-[#00b3e6] flex items-center justify-center mb-5 shadow-xl shadow-[#006689]/20 z-10 relative">
                <span className="material-symbols-outlined text-white text-4xl">{step.icon}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className="absolute top-12 left-[calc(50%+48px)] right-[calc(-50%+48px)] h-1 bg-gradient-to-r from-[#006689] to-[#00b3e6] z-0 rounded-full" />
              )}
              <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#006689] text-white text-xs font-bold mb-3 z-10 relative">
                {step.number}
              </div>
              <h3 className="font-sora text-lg font-bold text-[#191c1e] mb-2">{step.title}</h3>
              <p className="text-sm text-[#3f484e]">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="md:hidden space-y-6">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-4 bg-surface-container-lowest rounded-xl p-4 border border-outline-variant">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#006689] to-[#00b3e6] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#006689]/20">
                <span className="material-symbols-outlined text-white">{step.icon}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center">
                    {step.number}
                  </span>
                  <h3 className="font-sora font-semibold text-on-surface">{step.title}</h3>
                </div>
                <p className="text-sm text-on-surface-variant">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
