/**
 * Hàng đợi — Bookings.Status: Pending | Checked-in
 * Join: Vehicles, Services, Customer_Profiles, Rank
 */

export const QUEUE_STATUSES = ['Pending', 'Checked-in']

/** @typedef {'Pending' | 'Checked-in'} QueueStatus */

export const initialQueueBookings = [
  {
    bookingId: 1001,
    licensePlate: '51F-123.45',
    vehicleType: 'Sedan',
    vehicleDisplay: 'Mercedes-Benz S-Class',
    serviceId: 2,
    serviceName: 'Premium Wash',
    basePrice: 350000,
    durationMinutes: 45,
    scheduledTime: '2026-05-26T09:30:00',
    scheduledDisplay: '09:30 — Hôm nay',
    status: 'Pending',
    rankName: 'PLATINUM VIP',
    rankId: 4,
    customerName: 'Nguyễn Văn A',
    phoneMasked: '090****890',
    waitMinutes: 2,
    lane: 'Lane 1 — Platinum',
    isWalkIn: false,
  },
  {
    bookingId: 1002,
    licensePlate: '30A-987.65',
    vehicleType: 'SUV',
    vehicleDisplay: 'Toyota Fortuner',
    serviceId: 1,
    serviceName: 'Standard Wash',
    basePrice: 220000,
    durationMinutes: 30,
    scheduledTime: '2026-05-26T09:45:00',
    scheduledDisplay: '09:45 — Hôm nay',
    status: 'Pending',
    rankName: 'SILVER',
    rankId: 2,
    customerName: 'Trần Thị B',
    phoneMasked: '091****234',
    waitMinutes: 8,
    lane: 'Lane 2 — Ưu tiên',
    isWalkIn: false,
  },
  {
    bookingId: 1003,
    licensePlate: '29C-456.78',
    vehicleType: 'Sedan',
    vehicleDisplay: 'Honda Civic',
    serviceId: 3,
    serviceName: 'Quick Wash',
    basePrice: 150000,
    durationMinutes: 20,
    scheduledTime: '2026-05-26T09:15:00',
    scheduledDisplay: '09:15 — Hôm nay',
    status: 'Checked-in',
    rankName: 'STANDARD',
    rankId: 1,
    customerName: 'Lê Văn C',
    phoneMasked: '092****567',
    waitMinutes: 15,
    lane: 'Lane 3 — Tiêu chuẩn',
    isWalkIn: false,
  },
  {
    bookingId: 1004,
    licensePlate: '43B-112.99',
    vehicleType: 'SUV',
    vehicleDisplay: 'Hyundai Santa Fe',
    serviceId: 1,
    serviceName: 'Standard Wash',
    basePrice: 220000,
    durationMinutes: 30,
    scheduledTime: '2026-05-26T10:00:00',
    scheduledDisplay: '10:00 — Hôm nay',
    status: 'Pending',
    rankName: 'GOLD',
    rankId: 3,
    customerName: 'Phạm Minh D',
    phoneMasked: '093****111',
    waitMinutes: 5,
    lane: 'Lane 2 — Ưu tiên',
    isWalkIn: false,
  },
  {
    bookingId: 1005,
    licensePlate: '59D-888.12',
    vehicleType: 'Sedan',
    vehicleDisplay: 'VinFast VF8',
    serviceId: 2,
    serviceName: 'Premium Wash',
    basePrice: 350000,
    durationMinutes: 45,
    scheduledTime: '2026-05-26T10:15:00',
    scheduledDisplay: '10:15 — Hôm nay',
    status: 'Checked-in',
    rankName: 'SILVER',
    rankId: 2,
    customerName: 'Hoàng Thị E',
    phoneMasked: '094****222',
    waitMinutes: 20,
    lane: 'Lane 1 — Platinum',
    isWalkIn: false,
  },
  {
    bookingId: 1006,
    licensePlate: '72E-555.00',
    vehicleType: 'Sedan',
    vehicleDisplay: 'Kia K5',
    serviceId: 3,
    serviceName: 'Quick Wash',
    basePrice: 150000,
    durationMinutes: 20,
    scheduledTime: '2026-05-26T10:30:00',
    scheduledDisplay: '10:30 — Hôm nay',
    status: 'Pending',
    rankName: 'STANDARD',
    rankId: 1,
    customerName: null,
    phoneMasked: null,
    waitMinutes: 1,
    lane: 'Lane 3 — Tiêu chuẩn',
    isWalkIn: true,
  },
]

export function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getQueueStats(bookings) {
  const pending = bookings.filter((b) => b.status === 'Pending').length
  const checkedIn = bookings.filter((b) => b.status === 'Checked-in').length
  return {
    total: bookings.length,
    pending,
    checkedIn,
  }
}
