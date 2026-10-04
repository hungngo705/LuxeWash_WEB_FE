const steps = [
  {
    number: 1,
    icon: 'calendar_month',
    title: 'Đặt lịch',
    description: 'Chọn xe, chi nhánh, dịch vụ và khung giờ còn chỗ trong ứng dụng khách hàng hoặc cổng doanh nghiệp.',
  },
  {
    number: 2,
    icon: 'directions_car',
    title: 'Đến trạm',
    description: 'Đến chi nhánh theo lịch hẹn. Nhân viên kiểm tra lịch và xác nhận check-in, có hỗ trợ nhận diện biển số.',
  },
  {
    number: 3,
    icon: 'local_car_wash',
    title: 'Thực hiện dịch vụ',
    description: 'Xe được phân vào làn rửa. Nhân viên thực hiện dịch vụ và cập nhật trạng thái trên hệ thống.',
  },
  {
    number: 4,
    icon: 'check_circle',
    title: 'Hoàn tất',
    description: 'Theo dõi trạng thái hoàn thành và check-out. Xem lại lịch sử dịch vụ và giao dịch trong tài khoản.',
  },
]

export default function ProcessSection() {
  return (
    <section id="about" className="scroll-mt-20 py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[#006689]/10 text-[#006689] text-xs font-semibold rounded-full mb-3">Quy trình</span>
          <h2 className="font-sora text-3xl font-bold text-[#191c1e] mb-3">Quy trình 4 bước</h2>
          <p className="text-[#3f484e]">Từ đặt lịch đến check-in, thực hiện dịch vụ và check-out.</p>
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
