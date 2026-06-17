const reviews = [
  {
    name: 'Nguyễn Văn Minh',
    role: 'Khách hàng thường xuyên',
    content: 'Rất tiện lợi! Tôi chỉ cần đặt lịch qua app, đến trạm là xe được rửa ngay. Nhân viên thân thiện, xe sạch bóc.',
    rating: 5,
  },
  {
    name: 'Trần Thị Lan',
    role: 'Khách hàng VIP',
    content: 'Dịch vụ rửa cao cấp tuyệt vời. Nội thất xe như mới sau khi hấp sấy. Giá cả hợp lý so với chất lượng.',
    rating: 5,
  },
  {
    name: 'Lê Hoàng Nam',
    role: 'Doanh nghiệp vận tải',
    content: 'Chúng tôi đã đăng ký gói doanh nghiệp cho đội xe. Tiết kiệm chi phí, theo dõi dễ dàng qua dashboard.',
    rating: 5,
  },
]

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`material-symbols-outlined text-sm ${i < rating ? 'text-yellow-500' : 'text-gray-300'}`}
        >
          star
        </span>
      ))}
    </div>
  )
}

export default function ReviewsSection() {
  return (
    <section className="py-20 bg-[#f2f4f6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[#006689]/10 text-[#006689] text-xs font-semibold rounded-full mb-3">Đánh giá</span>
          <h2 className="font-sora text-3xl font-bold text-[#191c1e] mb-3">Khách hàng nói gì về chúng tôi</h2>
          <p className="text-[#3f484e]">Hơn 50,000 khách hàng đã tin tưởng LuxeWash</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <div
              key={review.name}
              className="bg-white rounded-2xl p-6 border border-[#e0e3e5] hover:shadow-xl hover:shadow-black/5 transition-shadow"
            >
              <StarRating rating={review.rating} />
              <p className="mt-4 text-sm text-[#3f484e] leading-relaxed">&ldquo;{review.content}&rdquo;</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#006689] to-[#00b3e6] flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-sm filled">person</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#191c1e]">{review.name}</p>
                  <p className="text-xs text-[#6f787f]">{review.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
