/**
 * Dữ liệu cứng — ánh xạ ERD: Bookings, Vehicles, Customer_Profiles, Rank, Services
 * Booking.Status: Pending | Checked-in | Completed | Cancelled
 */

export const STATION_ID = 'Station 04'

export const dashboardStats = {
  queueCount: 3,
  checkedInToday: 12,
  completedToday: 28,
  revenueTodayVnd: 18_450_000,
  systemOnline: true,
}

/** Xe đang nhận diện tại LPR (Lane 1) */
export const currentLprDetection = {
  licensePlate: '51F-123.45',
  processingSeconds: '< 10s',
  lane: 1,
  cameraImage:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAFjN7-XxYHxosgsGY869CNoxfjrLh7Qt9VHdFFiW_AItYeZCpo7VbzGlAdWlfEvBg8BVeFEMV8DeNY_FYTGWe8JMGvJzF_OU4YNF1u-CJ-8g5vsAZM34a3Rcc_G_Y1_O4pp-DNmsgaIxEn-D1b_WiTS63Z1_QndSwW2KBHUL9KLOJb4ahrLqzxYEXq7gQO-4sT5EeGuv_YhwYbKTqk4vgLNvf82-E2WDsB4ND8H3Hi1O8uMSeJb6V1RatWd6ZYssjmj6KjnokaBqdu',
  booking: {
    bookingId: 1001,
    serviceId: 2,
    serviceName: 'Premium Wash',
    scheduledTime: '2026-05-26T09:30:00',
    status: 'Pending',
  },
  vehicle: {
    licensePlate: '51F-123.45',
    vehicleType: 'Sedan',
    displayName: 'Mercedes-Benz S-Class',
  },
  customer: {
    userId: 1,
    profileId: 1,
    fullName: 'Nguyễn Văn A',
    phoneMasked: '090****890',
    rankName: 'PLATINUM VIP',
    rankId: 4,
    lastVisitDate: '2023-10-12',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAktu-bVzR_JT37ws89HE34c7n9b2UGWvHnlfvCVSDjTEr_RFXPHDpkSBd15xKzG7vUdBT2Fc1CWdiiUL0KeHKNfY7YtOg7gubxF9E6--aRPk-p1ymC2db7611wmlsWpkC3aY4pwWBbD5LUvx0EZLbvH43oucZLmYf4cYBRuWaq9ZRV5868ufwWzg4oBjPYQ_car6rm2rODEa_1g4f02IjpMzdwMVHaKuEjG2ielfKCDNSUedXMvoTW5m-Ac5PtIxkgQe-nI8TMdszD',
  },
}

/** Hàng chờ ưu tiên — Bookings Pending / Checked-in */
export const priorityQueue = [
  {
    bookingId: 1001,
    licensePlate: '51F-123.45',
    rankName: 'VIP',
    rankId: 4,
    vehicleType: 'Sedan',
    serviceName: 'Premium Wash',
    status: 'Pending',
    waitLabel: 'Vừa tới',
    note: 'Vào làn Platinum riêng biệt',
    isActive: true,
  },
  {
    bookingId: 1002,
    licensePlate: '30A-987.65',
    rankName: 'SILVER',
    rankId: 2,
    vehicleType: 'SUV',
    serviceName: 'Standard Wash',
    status: 'Pending',
    waitLabel: '5p trước',
    note: 'Chờ tại hàng ưu tiên',
    isActive: false,
  },
  {
    bookingId: 1003,
    licensePlate: '29C-456.78',
    rankName: 'STANDARD',
    rankId: 1,
    vehicleType: 'Sedan',
    serviceName: 'Quick Wash',
    status: 'Checked-in',
    waitLabel: '12p trước',
    note: 'Chờ tại hàng tiêu chuẩn',
    isActive: false,
    icon: 'local_taxi',
  },
]
