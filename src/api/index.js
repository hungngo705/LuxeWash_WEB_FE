export {
  apiRequest,
  aiApiRequest,
  setUnauthorizedHandler,
  AI_API_BASE_URL,
  API_BASE_URL,
  ApiError,
  clearSession,
  getAccessToken,
  getStoredSession,
  saveSession,
} from './client'

export {
  CAMERA_AI_BASE_URL,
  automatedWashCheckIn,
  cameraCheckInByPlate,
  cameraCheckOutByPlate,
  checkCameraHasCar,
  detectCameraPlate,
  recognizeCameraVehicle,
  submitVehicleVisionFeedback,
} from './cameraAi.api'

export {
  decodeJwtPayload,
  fetchLatestLaneDisplayState,
  getLaneDisplayBranchId,
  isLaneDisplayEventExpired,
  normalizeLaneDisplayEvent,
  normalizeLaneDisplayState,
} from './laneDisplay.api'

export { loginWithCredentials, refreshAccessToken, fetchCurrentUser, updateCurrentUserProfile, changePassword } from './auth.api'

export {
  createBarrierCommand,
  fetchBarrierCommand,
  fetchBarrierDeviceStatus,
} from './barrier.api'

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
  grantVoucherToUsers,
  processVoucherCampaigns,
  normalizeVoucher,
  buildVoucherPayload,
  toApiExpiryDate,
  toDatetimeLocalValue,
  VOUCHER_TYPE,
  VOUCHER_TYPE_LABEL,
  DISCOUNT_KIND,
} from './admin.vouchers.api'

export {
  createBirthdayCampaign,
  createWinbackCampaign,
  createVipCampaign,
  updateCampaignActive,
  deleteCampaign,
  normalizeCampaignVoucher,
  CAMPAIGN_TYPE,
  CAMPAIGN_TYPE_LABEL,
} from './admin.voucherCampaigns.api'

export { fetchMyVouchers, redeemVoucher } from './customer.vouchers.api'

export {
  fetchBranches,
  fetchAdminBranches,
  fetchBranchById,
  createBranch,
  updateBranch,
  normalizeBranch,
} from './admin.branches.api'

export {
  fetchLanes,
  fetchLaneById,
  createLane,
  createBusinessLane,
  updateLane,
  normalizeLane,
} from './admin.lanes.api'

export { createEmployee, transferEmployee, fetchEmployees } from './admin.employees.api'

export {
  fetchCarModels,
  createCarModel,
  updateCarModel,
  deleteCarModel,
  normalizeCarModel,
  requestCarModel,
  fetchPendingCarModels,
  approveCarModelRequest,
  rejectCarModelRequest,
} from './admin.carModels.api'

export {
  fetchUsers,
  fetchUserById,
  fetchUserPointsHistory,
  updateUserStatus,
  syncUserPoints,
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
  searchBookingsByLicensePlate,
  smartLookupLicensePlate,
  normalizeSmartLicensePlateLookup,
  fetchBookingById,
  fetchBookingsByUserId,
  asBookingList,
  updateBookingStatus,
  updateBookingStatusByLicensePlate,
  markBookingNoShow,
  forceCancelBookings,
  reportBookingMismatch,
  updateBookingCondition,
  normalizeAdminBooking,
  filterBookingsByBranch,
  normalizeBookingStatus,
  normalizePlateQuery,
  plateSearchVariants,
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

export {
  approveRevenueStimulusProposal,
  checkManagerRevenueStimulus,
  evaluateBranchRevenue,
  fetchRevenueStimulusProposals,
  generateComprehensiveRevenueProposals,
  modifyRevenueStimulusProposal,
  rejectRevenueStimulusProposal,
  triggerAllRevenueCampaigns,
  triggerBranchRevenueCampaign,
  triggerWeatherCampaign,
} from './revenueAnalytics.api'

export {
  fetchManagerBookings,
  fetchManagerStaffs,
  assignStaffToLane,
  checkinAssignBooking,
  markManagerBookingNoShow,
  normalizeManagerBooking,
} from './manager.api'

export {
  fetchManagerLanes,
  createManagerLane,
  fetchLaneAssignedStaff,
  fetchAllLaneStaffAssignments,
  unassignStaffFromLane,
  normalizeLaneAssignedStaff,
  asManagerCollection,
} from './manager.lanes.api'

export {
  fetchManagerTimeSlots,
  createManagerTimeSlot,
  updateManagerTimeSlot,
  deleteManagerTimeSlot,
} from './manager.timeSlots.api'

export {
  createManagerStaff,
  normalizeManagerStaff,
  fetchBranchEmployeesSummary,
} from './manager.employees.api'

export {
  fetchManagerWorkShifts,
  createManagerWorkShift,
  updateManagerWorkShift,
  fetchManagerShiftAssignments,
  createManagerShiftAssignment,
  updateManagerShiftAssignment,
  deleteManagerShiftAssignment,
  fetchManagerOvertimeRequests,
  reviewManagerOvertimeRequest,
  fetchManagerShiftSwapRequests,
  reviewManagerShiftSwapRequest,
  normalizeWorkShift,
  normalizeShiftAssignment,
  normalizeOvertimeRequest,
  normalizeShiftSwapRequest,
} from './manager.shifts.api'

export {
  fetchStaffShifts,
  fetchStaffOvertimeRequests,
  createStaffOvertimeRequest,
  fetchStaffShiftSwapRequests,
  createStaffShiftSwapRequest,
  fetchStaffWorkShifts,
  fetchStaffAvailableShiftsForSwap,
  normalizeStaffShift,
  normalizeStaffOvertimeRequest,
  normalizeStaffShiftSwapRequest,
  normalizeStaffWorkShift,
} from './staff.shifts.api'

export { fetchMyWallet, createWalletTopUp, normalizeWallet } from './wallet.api'

export {
  fetchStaffTasks,
  fetchStaffLaneAssignment,
  fetchStaffLaneOccupancies,
  fetchStaffServiceHistory,
  enrichStaffBooking,
  enrichStaffTasks,
  updateStaffBookingStatus,
  staffCheckinBooking,
  swapStaffLaneByPhone,
  recognizeVehicleByPlate,
  consumeStaffVoucher,
  normalizeStaffTask,
  normalizeStaffCheckInResult,
  normalizeStaffLaneAssignment,
  normalizeVehicleRecognition,
  formatStaffStationLabel,
  formatPaymentMethodLabel,
} from './operationStaff.api'

export {
  adjustManagerInventoryStock,
  approveManagerExtraUsageRequest,
  createAdminMaterial,
  createAdminMaterialUnit,
  discardManagerInventoryBatch,
  fetchAdminInventoryBatches,
  fetchAdminInventoryReport,
  fetchAdminInventoryStocks,
  fetchAdminMaterialUnits,
  fetchAdminMaterials,
  fetchBranchInventorySetting,
  fetchConditionMultipliers,
  fetchMaterialUnits,
  fetchMaterials,
  fetchManagerExpiringBatches,
  fetchManagerExtraUsageRequests,
  fetchManagerInventoryBatches,
  fetchManagerInventoryReport,
  fetchManagerInventoryStocks,
  fetchManagerInventoryTransactions,
  fetchServiceMaterials,
  importManagerInventoryBatch,
  rejectManagerExtraUsageRequest,
  reportStaffExtraMaterialUsage,
  updateAdminMaterial,
  updateAdminMaterialUnit,
  updateBranchInventorySetting,
  updateConditionMultiplier,
  updateServiceMaterial,
  upsertServiceMaterials,
} from './inventory.api'

export {
  mapUserDetailToCustomerView,
  mapListUserToCustomerView,
  maskPhoneNumber,
  findUserByLicensePlate,
  normalizePlateKey,
} from './staff.customers.api'

export {
  checkAvailableSlots,
  checkSlotsWithSuggestions,
  checkCompatibility,
  createBooking,
  fetchBookingPaymentStatus,
  createWalkInBooking,
} from './customer.api'

export {
  fetchPendingFleetVehicles,
  fetchBusinessPendingFleetVehicles,
  fetchStaffPendingFleetVehicles,
  fetchAdminPendingFleetVehicles,
  approveFleetVehicle,
  approveAdminFleetVehicle,
  rejectFleetVehicle,
  rejectAdminFleetVehicle,
  normalizeFleetPendingVehicle,
  fetchFleetImportBatches,
  fetchFleetImportBatchDetail,
  fleetCheckIn,
  fleetWalkIn,
  fleetWalkOut,
  fleetStartProcessing,
  fleetCheckout,
  fetchFleetQueue as fetchStaffFleetQueue,
  fetchFleetCurrent,
  fetchFleetHistory,
  fetchFleetOperationsDashboard,
} from './fleet.api'

export {
  fetchBusinessProfile,
  updateBusinessProfile,
  fetchBusinessDashboard,
  fetchFleetDashboard,
  fetchBusinessServices,
  asBusinessCollection,
  normalizeBusinessVehicle,
  normalizeBusinessBooking,
  normalizeBusinessService,
  getServicePriceForContext,
  resolveVehicleTypeId,
  normalizeBusinessSlot,
  fetchFleetVehicles,
  fetchFleetVehicleDetail,
  fetchPendingVehicles,
  approveVehicle,
  rejectVehicle,
  fetchFleetTemplate,
  importFleet,
  fetchImportHistory,
  fetchImportBatchDetail,
  fetchBusinessBookings,
  fetchBookingDetail,
  createBusinessBooking,
  cancelBooking,
  getBusinessAvailableSlots,
  getAvailableSlots,
  createWalkIn,
  fetchFleetQueue,
  fetchCurrentVehicles,
  fetchBusinessHistory,
  fetchBusinessInvoices,
  fetchInvoiceDetail,
  exportInvoice,
  downloadInvoicePdf,
  fetchBookingInvoice,
  fetchMonthlyStatement,
  registerBusinessProfile,
  fetchPendingApplications,
  fetchApplicationDetail,
  reviewApplication,
  assignWashLogLane,
} from './business.api'
