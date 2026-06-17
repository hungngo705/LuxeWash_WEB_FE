import { formatVnd } from '../../utils/format'

const pricingData = [
  {
    vehicleType: 'Xe con (Sedan)',
    quick: 50000,
    standard: 80000,
    premium: 150000,
    steam: 120000,
  },
  {
    vehicleType: 'SUV / Crossover',
    quick: 70000,
    standard: 100000,
    premium: 180000,
    steam: 150000,
  },
  {
    vehicleType: 'Xe tải nhẹ / Van',
    quick: 90000,
    standard: 130000,
    premium: 220000,
    steam: 180000,
  },
]

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-[#f2f4f6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[#006689]/10 text-[#006689] text-xs font-semibold rounded-full mb-3">Bảng giá</span>
          <h2 className="font-sora text-3xl font-bold text-[#191c1e] mb-3">Bảng giá dịch vụ</h2>
          <p className="text-[#3f484e]">Giá được tính theo loại xe. Chưa bao gồm VAT 8%.</p>
        </div>

        <div className="overflow-x-auto rounded-2xl shadow-lg shadow-black/5">
          <table className="w-full bg-white rounded-2xl overflow-hidden">
            <thead>
              <tr className="bg-[#006689] text-white">
                <th className="px-6 py-4 text-left text-sm font-semibold">Loại xe</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Rửa nhanh</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Rửa tiêu chuẩn</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Rửa cao cấp</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Hấp sấy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e3e5]">
              {pricingData.map((row, idx) => (
                <tr key={row.vehicleType} className={`hover:bg-[#f2f4f6] transition-colors ${idx % 2 === 1 ? 'bg-[#f8fafb]' : ''}`}>
                  <td className="px-6 py-4 text-sm font-semibold text-[#191c1e]">{row.vehicleType}</td>
                  <td className="px-6 py-4 text-sm text-center text-[#3f484e]">{formatVnd(row.quick)}</td>
                  <td className="px-6 py-4 text-sm text-center text-[#3f484e]">{formatVnd(row.standard)}</td>
                  <td className="px-6 py-4 text-sm text-center font-semibold text-[#006689]">{formatVnd(row.premium)}</td>
                  <td className="px-6 py-4 text-sm text-center text-[#3f484e]">{formatVnd(row.steam)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-sm text-[#6f787f] mt-4">
          Giá có thể thay đổi theo chi nhánh. Đặt lịch trước để được giảm 10%.
        </p>
      </div>
    </section>
  )
}
