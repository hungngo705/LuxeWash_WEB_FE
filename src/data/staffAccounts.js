/** Tài khoản Staff cứng — khớp Users (Role = Staff) trong ERD */
export const STAFF_ACCOUNTS = [
  {
    userId: 101,
    phoneNumber: '0901000001',
    password: 'staff123',
    fullName: 'Nguyễn Văn Hùng',
    role: 'Staff',
    station: 'Station 04',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuClp7ADyI2iBVUMA7EIoPJsEAYC2R4QW-wLfbu4V-aXdn2Mz-TQbaCcFYwtlZAX9KsIFU7XGtg5P5AR6HmgOL12_CBKkQdCh9I-BO7ZutWni9cVeBvi07Qicp7uFO9EVhZ3lpQueRoPAmxh8p_bGfItEe3Q60cAdRRZDEUlgQ93Hj6MZEy9-MlXay4Ab63PaE6vJ6tQIlxr64EslF4K7_d4wmwqOG_XztDYgbI4RSQGLu2p4iTRecovl8-Wcs-iPQ7biJH3ov3inmPr',
  },
  {
    userId: 102,
    phoneNumber: '0901000002',
    password: 'staff123',
    fullName: 'Trần Thị Lan',
    role: 'Staff',
    station: 'Station 04',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDP0T3ZucSr4IbqxbczWn3wzWK1eG0k3iMGtBMGaYRddCPuQV2qfKrMk5s7RWjaaRdaThCcU7s--Hf74mzaAtGmSA_5qHGU3aFJkbcCyzGqqsLfPswK9nJbhy15hH4R2UhmUL3_eWew8VaHhXTb5MbQyXiPnNJxJxqUPiKT-vvk_fLt5DfY6lEIgsvaAcJWSeZpT1Jfq15w8LSJJHlkI28_3vS2z0IFxWc9BsGUB5NKixNCTMVFCDqZCiChZ5ptU2SLkqMOcJhmDrA',
  },
  {
    userId: 103,
    phoneNumber: '0901000003',
    password: 'admin456',
    fullName: 'Lê Văn Đức',
    role: 'Staff',
    station: 'Station 04',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAktu-bVzR_JT37ws89HE34c7n9b2UGWvHnlfvCVSDjTEr_RFXPHDpkSBd15xKzG7vUdBT2Fc1CWdiiUL0KeHKNfY7YtOg7gubxF9E6--aRPk-p1ymC2db7611wmlsWpkC3aY4pwWBbD5LUvx0EZLbvH43oucZLmYf4cYBRuWaq9ZRV5868ufwWzg4oBjPYQ_car6rm2rODEa_1g4f02IjpMzdwMVHaKuEjG2ielfKCDNSUedXMvoTW5m-Ac5PtIxkgQe-nI8TMdszD',
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
