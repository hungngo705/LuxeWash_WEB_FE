import { useState } from 'react'

const faqs = [
  {
    question: 'Giá và thời gian dịch vụ được xác định như thế nào?',
    answer: 'Giá và thời gian ước tính được cấu hình theo dịch vụ, loại xe và chi nhánh. Chọn chi nhánh trong bảng giá để xem dữ liệu hiện có. Thời gian ước tính không phải cam kết hoàn thành.',
  },
  {
    question: 'Khách hàng cá nhân và doanh nghiệp đặt lịch ở đâu?',
    answer: 'Khách hàng cá nhân đặt lịch trong ứng dụng LuxeWash. Doanh nghiệp sử dụng cổng web sau khi đăng ký và được duyệt. Trang giới thiệu này chỉ hiển thị dịch vụ, bảng giá và chi nhánh; không tạo lịch đặt.',
  },
  {
    question: 'Làm sao để hủy hoặc thay đổi lịch đặt?',
    answer: 'Mở chi tiết lịch hẹn trong tài khoản để xem thao tác đang được cho phép. Hệ thống kiểm tra trạng thái và thời gian còn lại; điều kiện hoàn tiền được xử lý riêng. Nếu lịch bị ảnh hưởng bởi sự cố, hãy sử dụng màn hình xử lý sự cố thay vì luồng đổi hoặc hủy thông thường.',
  },
  {
    question: 'Tôi có thể thanh toán bằng những cách nào?',
    answer: 'Hệ thống có ví nội bộ và thanh toán QR qua PayOS. Các lựa chọn khả dụng được hiển thị trong bước thanh toán tương ứng. Doanh nghiệp có luồng công nợ, hóa đơn và sao kê riêng theo cấu hình tài khoản.',
  },
  {
    question: 'Ứng dụng khách hàng có những chức năng nào?',
    answer: 'Ứng dụng hỗ trợ quản lý xe, đặt lịch, theo dõi lịch hẹn, ví, điểm thưởng và voucher. Ưu đãi chỉ được áp dụng khi tài khoản và lịch đặt đáp ứng điều kiện của voucher hoặc cấu hình hiện tại.',
  },
  {
    question: 'Làm sao để đăng ký gói doanh nghiệp?',
    answer: 'Chọn “Đăng ký doanh nghiệp”, điền thông tin tài khoản và doanh nghiệp, tải giấy phép kinh doanh rồi gửi hồ sơ. Hồ sơ cần được quản trị viên xét duyệt trước khi sử dụng các chức năng dành cho doanh nghiệp.',
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section id="faq" className="scroll-mt-20 py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[#006689]/10 text-[#006689] text-xs font-semibold rounded-full mb-3">Hỗ trợ</span>
          <h2 className="font-sora text-3xl font-bold text-[#191c1e] mb-3">Câu hỏi thường gặp</h2>
          <p className="text-[#3f484e]">Giải đáp những thắc mắc phổ biến nhất</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`rounded-xl border overflow-hidden transition-colors ${openIndex === index ? 'border-[#006689]/30 bg-[#006689]/5' : 'border-[#e0e3e5] bg-white'}`}
            >
              <button
                type="button"
                aria-expanded={openIndex === index}
                aria-controls={`landing-faq-${index}`}
                className="w-full px-6 py-4 flex items-center justify-between text-left"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="text-sm font-semibold text-[#191c1e] pr-4">{faq.question}</span>
                <span className={`material-symbols-outlined text-[#006689] transition-transform flex-shrink-0 ${openIndex === index ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              {openIndex === index && (
                <div id={`landing-faq-${index}`} className="px-6 pb-4">
                  <p className="text-sm text-[#3f484e] leading-relaxed border-t border-[#e0e3e5] pt-3">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
