const services = [
  {
    icon: 'water_drop',
    title: 'Rửa nhanh',
    description: 'Rửa ngoài thân xe, lau khô, dọn nội thất cơ bản. Thời gian: 15-20 phút.',
    price: '50.000',
    color: 'bg-[#006689]/10 text-[#006689]',
    accent: 'from-[#006689] to-[#00b3e6]',
  },
  {
    icon: 'local_car_wash',
    title: 'Rửa tiêu chuẩn',
    description: 'Rửa toàn diện bên ngoài, hút bụi, lau bảng điều khiển. Thời gian: 30-40 phút.',
    price: '80.000',
    color: 'bg-green-50 text-green-700',
    accent: 'from-green-600 to-green-400',
  },
  {
    icon: 'verified_user',
    title: 'Rửa cao cấp',
    description: 'Rửa + wax bảo vệ sơn, vệ sinh nội thất sâu, làm mềm da. Thời gian: 60-90 phút.',
    price: '150.000',
    color: 'bg-purple-50 text-purple-700',
    accent: 'from-purple-600 to-purple-400',
  },
  {
    icon: 'ac_unit',
    title: 'Hấp sấy',
    description: 'Vệ sinh nội thất khử trùng, hấp sấy lỗ khí, làm thơm xe. Thời gian: 45-60 phút.',
    price: '120.000',
    color: 'bg-cyan-50 text-cyan-700',
    accent: 'from-cyan-600 to-cyan-400',
  },
]

export default function ServicesSection() {
  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[#006689]/10 text-[#006689] text-xs font-semibold rounded-full mb-3">Dịch vụ</span>
          <h2 className="font-sora text-3xl font-bold text-[#191c1e] mb-3">Bảng giá dịch vụ rửa xe</h2>
          <p className="text-[#3f484e]">Chọn gói dịch vụ phù hợp với nhu cầu của bạn</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <div
              key={service.title}
              className="bg-white rounded-2xl p-6 border border-[#e0e3e5] hover:shadow-xl hover:shadow-[#006689]/10 hover:border-[#006689]/30 transition-all duration-300 group cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br ${service.accent} shadow-lg shadow-current/10`}>
                <span className="material-symbols-outlined text-white text-2xl">{service.icon}</span>
              </div>
              <h3 className="font-sora text-lg font-bold text-[#191c1e] mb-2 group-hover:text-[#006689] transition-colors">{service.title}</h3>
              <p className="text-sm text-[#3f484e] mb-4 leading-relaxed">{service.description}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-[#006689]">Từ {service.price}</span>
                <span className="text-xs text-[#6f787f]">đ</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
