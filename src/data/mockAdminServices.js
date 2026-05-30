export const initialAdminServices = [
  {
    serviceId: 1,
    serviceName: 'Quick Wash',
    description: 'Rửa nhanh 20 phút',
    prices: [
      { vehicleTypeId: 1, vehicleTypeName: 'Sedan 4 chỗ', price: 150000, estimatedDurationMinutes: 20 },
      { vehicleTypeId: 2, vehicleTypeName: 'SUV / Crossover', price: 200000, estimatedDurationMinutes: 25 },
    ],
  },
  {
    serviceId: 2,
    serviceName: 'Premium Wash',
    description: 'Rửa bọt tuyết + sáp',
    prices: [
      { vehicleTypeId: 1, vehicleTypeName: 'Sedan 4 chỗ', price: 350000, estimatedDurationMinutes: 45 },
      { vehicleTypeId: 2, vehicleTypeName: 'SUV / Crossover', price: 420000, estimatedDurationMinutes: 50 },
    ],
  },
  {
    serviceId: 3,
    serviceName: 'Standard Wash',
    description: 'Rửa tiêu chuẩn',
    prices: [
      { vehicleTypeId: 1, vehicleTypeName: 'Sedan 4 chỗ', price: 220000, estimatedDurationMinutes: 30 },
      { vehicleTypeId: 2, vehicleTypeName: 'SUV / Crossover', price: 280000, estimatedDurationMinutes: 35 },
      { vehicleTypeId: 3, vehicleTypeName: 'MPV / 7 chỗ', price: 320000, estimatedDurationMinutes: 40 },
    ],
  },
]
