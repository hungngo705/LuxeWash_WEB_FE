export const adminKpiCards = [
  { id: 'revenue-today', label: 'Doanh thu hôm nay', value: 12450000, format: 'vnd', icon: 'payments' },
  { id: 'revenue-month', label: 'Doanh thu tháng 5', value: 285600000, format: 'vnd', icon: 'trending_up' },
  { id: 'bookings-today', label: 'Booking hôm nay', value: 24, format: 'number', icon: 'calendar_month' },
  { id: 'pending', label: 'Đang chờ (Pending)', value: 6, format: 'number', icon: 'hourglass_top' },
  { id: 'active-customers', label: 'Khách Active', value: 1248, format: 'number', icon: 'group' },
  { id: 'completion-rate', label: 'Tỷ lệ hoàn thành', value: 94.2, format: 'percent', icon: 'check_circle' },
  { id: 'vouchers-used', label: 'Voucher đã dùng (tháng)', value: 38, format: 'number', icon: 'confirmation_number' },
  { id: 'points-earned', label: 'Điểm đã cộng (tháng)', value: 42500, format: 'number', icon: 'stars' },
]

export const bookingsLast7Days = [
  { date: '20/05', count: 18 },
  { date: '21/05', count: 22 },
  { date: '22/05', count: 19 },
  { date: '23/05', count: 25 },
  { date: '24/05', count: 21 },
  { date: '25/05', count: 28 },
  { date: '26/05', count: 24 },
]

export const topServices = [
  { serviceName: 'Premium Wash', count: 86, revenue: 30100000 },
  { serviceName: 'Standard Wash', count: 124, revenue: 27280000 },
  { serviceName: 'Quick Wash', count: 98, revenue: 14700000 },
  { serviceName: 'Interior Care', count: 32, revenue: 9600000 },
  { serviceName: 'Wax & Polish', count: 18, revenue: 8100000 },
]

export const recentActivities = [
  { id: 1, type: 'booking', message: 'Booking #1004 mới — Phạm Minh D · Premium Wash', time: '5 phút trước', icon: 'calendar_add_on' },
  { id: 2, type: 'complete', message: 'Hoàn thành #901 — Nguyễn Văn A · +420 điểm', time: '12 phút trước', icon: 'check_circle' },
  { id: 3, type: 'user', message: 'Khách mới đăng ký — Võ Minh K', time: '25 phút trước', icon: 'person_add' },
  { id: 4, type: 'voucher', message: 'Voucher WELCOME50K được sử dụng', time: '38 phút trước', icon: 'confirmation_number' },
  { id: 5, type: 'booking', message: 'Booking #1006 walk-in — 72E-555.00', time: '1 giờ trước', icon: 'directions_car' },
  { id: 6, type: 'cancel', message: 'Hủy booking #880 — No-show', time: '1.5 giờ trước', icon: 'cancel' },
  { id: 7, type: 'tier', message: 'Trần Thị B lên hạng Gold', time: '2 giờ trước', icon: 'workspace_premium' },
  { id: 8, type: 'complete', message: 'Hoàn thành #902 — Trần Thị B', time: '3 giờ trước', icon: 'check_circle' },
]
