/**
 * Dữ liệu cứng — ánh xạ ERD: Bookings, Vehicles, Customer_Profiles, Rank, Services
 * Booking.Status: Pending | Checked-in | Completed | Cancelled
 */

export const STATION_ID = 'Station 04'

const CAMERA_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAFjN7-XxYHxosgsGY869CNoxfjrLh7Qt9VHdFFiW_AItYeZCpo7VbzGlAdWlfEvBg8BVeFEMV8DeNY_FYTGWe8JMGvJzF_OU4YNF1u-CJ-8g5vsAZM34a3Rcc_G_Y1_O4pp-DNmsgaIxEn-D1b_WiTS63Z1_QndSwW2KBHUL9KLOJb4ahrLqzxYEXq7gQO-4sT5EeGuv_YhwYbKTqk4vgLNvf82-E2WDsB4ND8H3Hi1O8uMSeJb6V1RatWd6ZYssjmj6KjnokaBqdu'

const AVATAR_VIP =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAktu-bVzR_JT37ws89HE34c7n9b2UGWvHnlfvCVSDjTEr_RFXPHDpkSBd15xKzG7vUdBT2Fc1CWdiiUL0KeHKNfY7YtOg7gubxF9E6--aRPk-p1ymC2db7611wmlsWpkC3aY4pwWBbD5LUvx0EZLbvH43oucZLmYf4cYBRuWaq9ZRV5868ufwWzg4oBjPYQ_car6rm2rODEa_1g4f02IjpMzdwMVHaKuEjG2ielfKCDNSUedXMvoTW5m-Ac5PtIxkgQe-nI8TMdszD'

const AVATAR_SILVER =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDP0T3ZucSr4IbqxbczWn3wzWK1eG0k3iMGtBMGaYRddCPuQV2qfKrMk5s7RWjaaRdaThCcU7s--Hf74mzaAtGmSA_5qHGU3aFJkbcCyzGqqsLfPswK9nJbhy15hH4R2UhmUL3_eWew8VaHhXTb5MbQyXiPnNJxJxqUPiKT-vvk_fLt5DfY6lEIgsvaAcJWSeZpT1Jfq15w8LSJJHlkI28_3vS2z0IFxWc9BsGUB5NKixNCTMVFCDqZCiChZ5ptU2SLkqMOcJhmDrA'

const AVATAR_STANDARD =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuClp7ADyI2iBVUMA7EIoPJsEAYC2R4QW-wLfbu4V-aXdn2Mz-TQbaCcFYwtlZAX9KsIFU7XGtg5P5AR6HmgOL12_CBKkQdCh9I-BO7ZutWni9cVeBvi07Qicp7uFO9EVhZ3lpQueRoPAmxh8p_bGfItEe3Q60cAdRRZDEUlgQ93Hj6MZEy9-MlXay4Ab63PaE6vJ6tQIlxr64EslF4K7_d4wmwqOG_XztDYgbI4RSQGLu2p4iTRecovl8-Wcs-iPQ7biJH3ov3inmPr'

/** Chi tiết LPR + khách hàng theo BookingID */
export const lprDetectionsByBookingId = {
  1001: {
    licensePlate: '51F-123.45',
    processingSeconds: '< 10s',
    lane: 1,
    cameraImage: CAMERA_IMAGE,
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
      lastVisitDisplay: '12/10/2023',
      avatar: AVATAR_VIP,
    },
  },
  1002: {
    licensePlate: '30A-987.65',
    processingSeconds: '< 10s',
    lane: 1,
    cameraImage: CAMERA_IMAGE,
    booking: {
      bookingId: 1002,
      serviceId: 1,
      serviceName: 'Standard Wash',
      scheduledTime: '2026-05-26T09:45:00',
      status: 'Pending',
    },
    vehicle: {
      licensePlate: '30A-987.65',
      vehicleType: 'SUV',
      displayName: 'Toyota Fortuner',
    },
    customer: {
      userId: 2,
      profileId: 2,
      fullName: 'Trần Thị B',
      phoneMasked: '091****234',
      rankName: 'SILVER',
      rankId: 2,
      lastVisitDisplay: '20/05/2026',
      avatar: AVATAR_SILVER,
    },
  },
  1003: {
    licensePlate: '29C-456.78',
    processingSeconds: '< 10s',
    lane: 1,
    cameraImage: CAMERA_IMAGE,
    booking: {
      bookingId: 1003,
      serviceId: 3,
      serviceName: 'Quick Wash',
      scheduledTime: '2026-05-26T09:15:00',
      status: 'Checked-in',
    },
    vehicle: {
      licensePlate: '29C-456.78',
      vehicleType: 'Sedan',
      displayName: 'Honda Civic',
    },
    customer: {
      userId: 3,
      profileId: 3,
      fullName: 'Lê Văn C',
      phoneMasked: '092****567',
      rankName: 'STANDARD',
      rankId: 1,
      lastVisitDisplay: '15/05/2026',
      avatar: AVATAR_STANDARD,
    },
  },
}

export const DEFAULT_BOOKING_ID = 1001

/** @param {number} bookingId */
export function getLprDetection(bookingId) {
  return lprDetectionsByBookingId[bookingId] ?? lprDetectionsByBookingId[DEFAULT_BOOKING_ID]
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
    icon: 'local_taxi',
  },
]
