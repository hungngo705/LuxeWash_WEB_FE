export const initialAdminTransactions = [
  { transactionId: 501, bookingId: 901, customerName: 'Nguyễn Văn A', amount: 315000, paymentMethod: 'Wallet', status: 'Success', createdAt: '2026-05-25T14:30:00' },
  { transactionId: 502, bookingId: 902, customerName: 'Trần Thị B', amount: 198000, paymentMethod: 'Wallet', status: 'Success', createdAt: '2026-05-25T11:15:00' },
  { transactionId: 503, bookingId: 903, customerName: 'Lê Văn C', amount: 150000, paymentMethod: 'Card', status: 'Success', createdAt: '2026-05-24T16:45:00' },
  { transactionId: 504, bookingId: 904, customerName: 'Phạm Minh D', amount: 280000, paymentMethod: 'Wallet', status: 'Success', createdAt: '2026-05-24T09:20:00' },
  { transactionId: 506, bookingId: 906, customerName: 'Vũ Thành F', amount: 220000, paymentMethod: 'Wallet', status: 'Failed', createdAt: '2026-05-23T10:00:00' },
]

export const initialAdminPointsHistory = [
  { id: 1, userId: 1, customerName: 'Nguyễn Văn A', points: 420, type: 'Earn', reason: 'Hoàn thành Premium Wash', bookingId: 901, createdAt: '2026-05-25T14:30:00' },
  { id: 2, userId: 1, customerName: 'Nguyễn Văn A', points: -350, type: 'Redeem', reason: 'Đổi điểm khi đặt lịch', bookingId: 901, createdAt: '2026-05-25T14:00:00' },
  { id: 3, userId: 2, customerName: 'Trần Thị B', points: 180, type: 'Earn', reason: 'Hoàn thành Standard Wash', bookingId: 902, createdAt: '2026-05-25T11:15:00' },
]
