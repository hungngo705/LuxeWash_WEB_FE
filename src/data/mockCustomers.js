/**
 * Khách hàng — Users + Customer_Profiles + Vehicles + Rank + Wallets
 * Users.Role = Customer, Users.Status = Active | Banned
 */

const AVATAR_VIP =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAktu-bVzR_JT37ws89HE34c7n9b2UGWvHnlfvCVSDjTEr_RFXPHDpkSBd15xKzG7vUdBT2Fc1CWdiiUL0KeHKNfY7YtOg7gubxF9E6--aRPk-p1ymC2db7611wmlsWpkC3aY4pwWBbD5LUvx0EZLbvH43oucZLmYf4cYBRuWaq9ZRV5868ufwWzg4oBjPYQ_car6rm2rODEa_1g4f02IjpMzdwMVHaKuEjG2ielfKCDNSUedXMvoTW5m-Ac5PtIxkgQe-nI8TMdszD'

const AVATAR_SILVER =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDP0T3ZucSr4IbqxbczWn3wzWK1eG0k3iMGtBMGaYRddCPuQV2qfKrMk5s7RWjaaRdaThCcU7s--Hf74mzaAtGmSA_5qHGU3aFJkbcCyzGqqsLfPswK9nJbhy15hH4R2UhmUL3_eWew8VaHhXTb5MbQyXiPnNJxJxqUPiKT-vvk_fLt5DfY6lEIgsvaAcJWSeZpT1Jfq15w8LSJJHlkI28_3vS2z0IFxWc9BsGUB5NKixNCTMVFCDqZCiChZ5ptU2SLkqMOcJhmDrA'

const AVATAR_STANDARD =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuClp7ADyI2iBVUMA7EIoPJsEAYC2R4QW-wLfbu4V-aXdn2Mz-TQbaCcFYwtlZAX9KsIFU7XGtg5P5AR6HmgOL12_CBKkQdCh9I-BO7ZutWni9cVeBvi07Qicp7uFO9EVhZ3lpQueRoPAmxh8p_bGfItEe3Q60cAdRRZDEUlgQ93Hj6MZEy9-MlXay4Ab63PaE6vJ6tQIlxr64EslF4K7_d4wmwqOG_XztDYgbI4RSQGLu2p4iTRecovl8-Wcs-iPQ7biJH3ov3inmPr'

export const customerRecords = [
  {
    userId: 1,
    profileId: 1,
    fullName: 'Nguyễn Văn A',
    phoneNumber: '0901234890',
    phoneMasked: '090****890',
    email: 'nguyenvana@email.com',
    address: '123 Nguyễn Huệ, Q.1, TP.HCM',
    rankId: 4,
    rankName: 'PLATINUM VIP',
    pointMultiplier: 2.0,
    userScore: 4850,
    walletBalance: 1250000,
    userStatus: 'Active',
    lastVisitDisplay: '25/05/2026',
    totalWashes: 28,
    avatar: AVATAR_VIP,
    vehicles: [
      { licensePlate: '51F-123.45', vehicleType: 'Sedan', displayName: 'Mercedes-Benz S-Class' },
    ],
  },
  {
    userId: 2,
    profileId: 2,
    fullName: 'Trần Thị B',
    phoneNumber: '0912345234',
    phoneMasked: '091****234',
    email: 'tranthib@email.com',
    address: '45 Lê Lợi, Q.3, TP.HCM',
    rankId: 2,
    rankName: 'SILVER',
    pointMultiplier: 1.2,
    userScore: 2100,
    walletBalance: 450000,
    userStatus: 'Active',
    lastVisitDisplay: '25/05/2026',
    totalWashes: 14,
    avatar: AVATAR_SILVER,
    vehicles: [
      { licensePlate: '30A-987.65', vehicleType: 'SUV', displayName: 'Toyota Fortuner' },
    ],
  },
  {
    userId: 3,
    profileId: 3,
    fullName: 'Lê Văn C',
    phoneNumber: '0923456567',
    phoneMasked: '092****567',
    email: 'levanc@email.com',
    address: '78 Hai Bà Trưng, Q.1, TP.HCM',
    rankId: 1,
    rankName: 'STANDARD',
    pointMultiplier: 1.0,
    userScore: 680,
    walletBalance: 120000,
    userStatus: 'Active',
    lastVisitDisplay: '24/05/2026',
    totalWashes: 6,
    avatar: AVATAR_STANDARD,
    vehicles: [
      { licensePlate: '29C-456.78', vehicleType: 'Sedan', displayName: 'Honda Civic' },
    ],
  },
  {
    userId: 4,
    profileId: 4,
    fullName: 'Phạm Minh D',
    phoneNumber: '0934567111',
    phoneMasked: '093****111',
    email: 'phamminhd@email.com',
    address: '12 Võ Văn Tần, Q.3, TP.HCM',
    rankId: 3,
    rankName: 'GOLD',
    pointMultiplier: 1.5,
    userScore: 3200,
    walletBalance: 780000,
    userStatus: 'Active',
    lastVisitDisplay: '24/05/2026',
    totalWashes: 19,
    avatar: AVATAR_SILVER,
    vehicles: [
      { licensePlate: '43B-112.99', vehicleType: 'SUV', displayName: 'Hyundai Santa Fe' },
      { licensePlate: '43B-999.01', vehicleType: 'Sedan', displayName: 'Honda Accord' },
    ],
  },
  {
    userId: 5,
    profileId: 5,
    fullName: 'Hoàng Thị E',
    phoneNumber: '0945678222',
    phoneMasked: '094****222',
    email: 'hoangthie@email.com',
    address: '200 Điện Biên Phủ, Bình Thạnh',
    rankId: 2,
    rankName: 'SILVER',
    pointMultiplier: 1.2,
    userScore: 1750,
    walletBalance: 320000,
    userStatus: 'Active',
    lastVisitDisplay: '23/05/2026',
    totalWashes: 11,
    avatar: AVATAR_STANDARD,
    vehicles: [{ licensePlate: '59D-888.12', vehicleType: 'Sedan', displayName: 'VinFast VF8' }],
  },
  {
    userId: 6,
    profileId: 6,
    fullName: 'Võ Thanh F',
    phoneNumber: '0956789333',
    phoneMasked: '095****333',
    email: 'vothanhf@email.com',
    address: '9 Cộng Hòa, Tân Bình',
    rankId: 1,
    rankName: 'STANDARD',
    pointMultiplier: 1.0,
    userScore: 420,
    walletBalance: 50000,
    userStatus: 'Banned',
    lastVisitDisplay: '22/05/2026',
    totalWashes: 3,
    avatar: AVATAR_STANDARD,
    vehicles: [{ licensePlate: '15F-321.88', vehicleType: 'SUV', displayName: 'Mazda CX-5' }],
  },
  {
    userId: 7,
    profileId: 7,
    fullName: 'Đặng Văn G',
    phoneNumber: '0967890444',
    phoneMasked: '096****444',
    email: 'dangvang@email.com',
    address: '55 Nguyễn Thị Minh Khai, Q.3',
    rankId: 4,
    rankName: 'PLATINUM VIP',
    pointMultiplier: 2.0,
    userScore: 5200,
    walletBalance: 2100000,
    userStatus: 'Active',
    lastVisitDisplay: '21/05/2026',
    totalWashes: 35,
    avatar: AVATAR_VIP,
    vehicles: [{ licensePlate: '88G-777.11', vehicleType: 'SUV', displayName: 'BMW X5' }],
  },
]

export function searchCustomers(query) {
  const q = query.trim().toLowerCase()
  if (!q) return customerRecords
  return customerRecords.filter(
    (c) =>
      c.fullName.toLowerCase().includes(q) ||
      c.phoneNumber.includes(q) ||
      c.phoneMasked.includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.vehicles.some(
        (v) =>
          v.licensePlate.toLowerCase().includes(q) ||
          v.displayName.toLowerCase().includes(q),
      ),
  )
}

export function getCustomerById(userId) {
  return customerRecords.find((c) => c.userId === userId) ?? null
}
