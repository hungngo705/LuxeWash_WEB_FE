/** Tài khoản Admin mock — Role = Admin */
export const ADMIN_ACCOUNTS = [
  {
    userId: 1,
    phoneNumber: '0999999999',
    password: 'Admin@123',
    fullName: 'System Admin',
    role: 'Admin',
    email: 'admin@luxewash.vn',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAktu-bVzR_JT37ws89HE34c7n9b2UGWvHnlfvCVSDjTEr_RFXPHDpkSBd15xKzG7vUdBT2Fc1CWdiiUL0KeHKNfY7YtOg7gubxF9E6--aRPk-p1ymC2db7611wmlsWpkC3aY4pwWBbD5LUvx0EZLbvH43oucZLmYf4cYBRuWaq9ZRV5868ufwWzg4oBjPYQ_car6rm2rODEa_1g4f02IjpMzdwMVHaKuEjG2ielfKCDNSUedXMvoTW5m-Ac5PtIxkgQe-nI8TMdszD',
  },
]

export function findAdminAccount(phoneOrEmail, password) {
  const normalized = phoneOrEmail.trim()
  return ADMIN_ACCOUNTS.find(
    (acc) =>
      (acc.phoneNumber === normalized ||
        acc.email?.toLowerCase() === normalized.toLowerCase()) &&
      acc.password === password,
  )
}
