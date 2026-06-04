/** Tài khoản Staff / Manager cứng — khớp Users trong ERD */
export const STAFF_ACCOUNTS = [
  {
    userId: 101,
    phoneNumber: '0777777777',
    password: 'Staff@123',
    fullName: 'Staff',
    role: 'Staff',
    station: 'Station 04',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuClp7ADyI2iBVUMA7EIoPJsEAYC2R4QW-wLfbu4V-aXdn2Mz-TQbaCcFYwtlZAX9KsIFU7XGtg5P5AR6HmgOL12_CBKkQdCh9I-BO7ZutWni9cVeBvi07Qicp7uFO9EVhZ3lpQueRoPAmxh8p_bGfItEe3Q60cAdRRZDEUlgQ93Hj6MZEy9-MlXay4Ab63PaE6vJ6tQIlxr64EslF4K7_d4wmwqOG_XztDYgbI4RSQGLu2p4iTRecovl8-Wcs-iPQ7biJH3ov3inmPr',
  },
  {
    userId: 201,
    phoneNumber: '0888888888',
    password: 'Manager@123',
    fullName: 'Manager',
    role: 'Manager',
    station: 'Branch 01',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuClp7ADyI2iBVUMA7EIoPJsEAYC2R4QW-wLfbu4V-aXdn2Mz-TQbaCcFYwtlZAX9KsIFU7XGtg5P5AR6HmgOL12_CBKkQdCh9I-BO7ZutWni9cVeBvi07Qicp7uFO9EVhZ3lpQueRoPAmxh8p_bGfItEe3Q60cAdRRZDEUlgQ93Hj6MZEy9-MlXay4Ab63PaE6vJ6tQIlxr64EslF4K7_d4wmwqOG_XztDYgbI4RSQGLu2p4iTRecovl8-Wcs-iPQ7biJH3ov3inmPr',
  },
]

export function findStaffAccount(phoneOrEmail, password) {
  const normalized = phoneOrEmail.trim().toLowerCase()
  return STAFF_ACCOUNTS.find(
    (acc) =>
      (acc.phoneNumber === normalized ||
        acc.phoneNumber === phoneOrEmail.trim()) &&
      acc.password === password,
  )
}
