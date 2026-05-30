import { customerRecords } from './mockCustomers'
import { STAFF_ACCOUNTS } from './staffAccounts'
import { ADMIN_ACCOUNTS } from './adminAccounts'

const customers = customerRecords.map((c) => ({
  userId: c.userId,
  fullName: c.fullName,
  phoneNumber: c.phoneNumber,
  phoneMasked: c.phoneMasked,
  email: c.email,
  role: 'Customer',
  tierName: c.rankName,
  userScore: c.userScore,
  walletBalance: c.walletBalance,
  userStatus: c.userStatus,
  totalWashes: c.totalWashes,
  avatar: c.avatar,
  vehicles: c.vehicles,
}))

const staff = STAFF_ACCOUNTS.map((s) => ({
  userId: s.userId,
  fullName: s.fullName,
  phoneNumber: s.phoneNumber,
  phoneMasked: `${s.phoneNumber.slice(0, 3)}****${s.phoneNumber.slice(-3)}`,
  email: null,
  role: 'Staff',
  tierName: null,
  userScore: null,
  walletBalance: null,
  userStatus: 'Active',
  totalWashes: null,
  avatar: s.avatar,
  vehicles: [],
  station: s.station,
}))

const admins = ADMIN_ACCOUNTS.map((a) => ({
  userId: a.userId,
  fullName: a.fullName,
  phoneNumber: a.phoneNumber,
  phoneMasked: `${a.phoneNumber.slice(0, 3)}****${a.phoneNumber.slice(-3)}`,
  email: a.email,
  role: 'Admin',
  tierName: null,
  userScore: null,
  walletBalance: null,
  userStatus: 'Active',
  totalWashes: null,
  avatar: a.avatar,
  vehicles: [],
}))

export const initialAdminUsers = [...customers, ...staff, ...admins]

export function getUserStats(users) {
  return {
    total: users.length,
    customers: users.filter((u) => u.role === 'Customer').length,
    staff: users.filter((u) => u.role === 'Staff').length,
    admins: users.filter((u) => u.role === 'Admin').length,
    blocked: users.filter((u) => u.userStatus === 'Blocked').length,
  }
}
