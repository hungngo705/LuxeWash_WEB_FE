import { useState } from 'react'

const faqs = [
  {
    question: 'Thời gian rửa xe trung bình là bao lâu?',
    answer: 'Tùy gói dịch vụ: Rửa nhanh 15-20 phút, Rửa tiêu chuẩn 30-40 phút, Rửa cao cấp 60-90 phút, Hấp sấy 45-60 phút.',
  },
  {
    question: 'Tôi có cần đặt lịch trước không?',
    answer: 'Không bắt buộc, nhưng đặt lịch trước qua app giúp bạn được giảm 10% và ưu tiên vào làn rửa nhanh, tránh chờ đợi.',
  },
  {
    question: 'Làm sao để hủy hoặc thay đổi lịch đặt?',
    answer: 'Bạn có thể hủy hoặc thay đổi lịch trong mục "Lịch sử đặt lịch" trên app, tối thiểu 2 giờ trước giờ hẹn mà không mất phí.',
  },
  {
    question: 'Tôi có thể thanh toán bằng những cách nào?',
    answer: 'LuxeWash hỗ trợ thanh toán qua: Ví điện tử (VNPay, MoMo, ZaloPay), Thẻ ngân hàng (ATM, VISA, Mastercard), và tiền mặt tại quầy.',
  },
  {
    question: 'Chính sách bảo hành sau rửa xe như thế nào?',
    answer: 'Nếu xe không sạch theo tiêu chuẩn dịch vụ, bạn có thể phản ánh trong vòng 30 phút sau khi nhận xe. Chúng tôi sẽ rửa lại miễn phí.',
  },
  {
    question: 'Làm sao để đăng ký gói doanh nghiệp?',
    answer: 'Truy cập trang web luxewash.vn, chọn "Đăng ký doanh nghiệp", điền thông tin công ty và tải lên giấy phép kinh doanh. Đội ngũ của chúng tôi sẽ liên hệ trong 24 giờ.',
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section className="py-20 bg-white">
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
                className="w-full px-6 py-4 flex items-center justify-between text-left"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="text-sm font-semibold text-[#191c1e] pr-4">{faq.question}</span>
                <span className={`material-symbols-outlined text-[#006689] transition-transform flex-shrink-0 ${openIndex === index ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4">
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
