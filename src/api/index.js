export {
  apiRequest,
  setUnauthorizedHandler,
  API_BASE_URL,
  ApiError,
  clearSession,
  getAccessToken,
  getStoredSession,
  saveSession,
} from './client'

export { loginWithCredentials, refreshAccessToken, fetchCurrentUser, updateCurrentUserProfile, changePassword } from './auth.api'

export {
  fetchVehicleTypes,
  createVehicleType,
  updateVehicleType,
  deleteVehicleType,
} from './admin.vehicleTypes.api'

export {
  fetchServices,
  createService,
  updateService,
  deleteService,
} from './admin.services.api'

export {
  fetchTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  toApiTimeValue,
  toTimeInputValue,
} from './admin.timeSlots.api'

export { fetchTiers, createTier, updateTier } from './admin.tiers.api'

export {
  fetchVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  toApiExpiryDate,
  toDatetimeLocalValue,
} from './admin.vouchers.api'

export {
  fetchBranches,
  fetchBranchById,
  createBranch,
  updateBranch,
  normalizeBranch,
} from './admin.branches.api'

export {
  fetchLanes,
  fetchLaneById,
  createLane,
  updateLane,
  normalizeLane,
} from './admin.lanes.api'

export { createEmployee, transferEmployee } from './admin.employees.api'

export {
  fetchCarModels,
  createCarModel,
  updateCarModel,
  deleteCarModel,
  normalizeCarModel,
} from './admin.carModels.api'

export {
  fetchUsers,
  fetchUserById,
  updateUserStatus,
  normalizeListUser,
} from './admin.users.api'

export {
  fetchPendingVehicleApprovals,
  approveNewVehicleType,
  rejectNewVehicleType,
  normalizePendingApproval,
} from './admin.vehicles.api'

export {
  fetchBookingsByDate,
  fetchBookingsByLicensePlate,
  updateBookingStatus,
  updateBookingStatusByLicensePlate,
  markBookingNoShow,
  forceCancelBookings,
  reportBookingMismatch,
  normalizeAdminBooking,
  normalizeBookingStatus,
  toApiTargetDate,
  toApiBookingStatus,
} from './admin.bookings.api'

export {
  fetchTransactions,
  fetchPointsHistory,
  normalizeTransaction,
  normalizePointsEntry,
} from './admin.transactions.api'

export { fetchDashboardStats } from './admin.dashboard.api'
