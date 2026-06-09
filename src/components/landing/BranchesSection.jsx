const branches = [
  {
    name: 'LuxeWash Quận 1',
    address: '123 Đồng Khởi, Quận 1, TP.HCM',
    hours: '6:00 - 22:00',
    phone: '028 1234 5678',
  },
  {
    name: 'LuxeWash Quận 7',
    address: '456 Nguyễn Trãi, Quận 7, TP.HCM',
    hours: '6:00 - 22:00',
    phone: '028 2345 6789',
  },
  {
    name: 'LuxeWash Bình Thạnh',
    address: '789 Xô Viết Nghệ Tĩnh, Bình Thạnh, TP.HCM',
    hours: '6:00 - 22:00',
    phone: '028 3456 7890',
  },
]

export default function BranchesSection() {
  return (
    <section id="branches" className="py-20 bg-[#f2f4f6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[#006689]/10 text-[#006689] text-xs font-semibold rounded-full mb-3">Chi nhánh</span>
          <h2 className="font-sora text-3xl font-bold text-[#191c1e] mb-3">Hệ thống chi nhánh</h2>
          <p className="text-[#3f484e]">Trạm rửa xe LuxeWash trên khắp TP.HCM</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {branches.map((branch) => (
            <div
              key={branch.name}
              className="bg-white rounded-2xl overflow-hidden border border-[#e0e3e5] hover:shadow-xl hover:shadow-[#006689]/10 hover:border-[#006689]/30 transition-all duration-300 cursor-pointer group"
            >
              <div className="h-36 bg-gradient-to-br from-[#006689] to-[#00b3e6] flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                  <span className="material-symbols-outlined text-4xl text-white">local_gas_station</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-sora text-base font-bold text-[#191c1e] mb-3 group-hover:text-[#006689] transition-colors">{branch.name}</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-base text-[#006689] mt-0.5">location_on</span>
                    <span className="text-sm text-[#3f484e]">{branch.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#006689]">schedule</span>
                    <span className="text-sm text-[#3f484e]">{branch.hours}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#006689]">phone</span>
                    <span className="text-sm text-[#3f484e]">{branch.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden shadow-lg border border-[#e0e3e5]">
          <iframe
            title="LuxeWash Locations"
            src="https://www.google.com/maps/embed?pb=!1m16!1m12!1m3!1d50115.2!2d106.66!3d10.77!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1stram+rua+xe+TPHCM!5e0!3m2!1svi!2s!4v1700000000000"
            width="100%"
            height="350"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full"
          />
        </div>
      </div>
    </section>
  )
}
