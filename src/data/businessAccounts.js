/** Tài khoản Business demo — đăng ký qua POST /business/register (Swagger: Business) */
export const BUSINESS_ACCOUNTS = [
  {
    userId: 25,
    phoneNumber: '0933333335',
    password: 'Business@123',
    fullName: 'VinFast Demo Fleet',
    role: 'Business',
    companyName: 'VinFast Demo Fleet',
    note: 'Đã đăng ký trên BE — role Business',
  },
]

export function findBusinessAccount(phoneOrEmail, password) {
  const normalized = phoneOrEmail.trim()
  return BUSINESS_ACCOUNTS.find(
    (acc) =>
      (acc.phoneNumber === normalized || acc.phoneNumber === phoneOrEmail.trim()) &&
      acc.password === password,
  )
}
