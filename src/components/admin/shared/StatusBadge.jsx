const STATUS_STYLES = {
  Active: 'bg-primary-container/30 text-primary border-primary/30',
  Approved: 'bg-primary-container/30 text-primary border-primary/30',
  OK: 'bg-primary-container/30 text-primary border-primary/30',
  Blocked: 'bg-error-container/30 text-error border-error/30',
  Rejected: 'bg-error-container/30 text-error border-error/30',
  Discarded: 'bg-error-container/30 text-error border-error/30',
  Inactive: 'bg-surface-variant text-on-surface-variant border-outline-variant',
  Pending: 'bg-tertiary-container/40 text-on-tertiary-container border-tertiary/30',
  PendingApproval: 'bg-tertiary-container/40 text-on-tertiary-container border-tertiary/30',
  Completed: 'bg-primary-container/30 text-primary border-primary/30',
  'Checked-in': 'bg-secondary-container/40 text-on-secondary-container border-secondary/30',
  Cancelled: 'bg-surface-variant text-on-surface-variant border-outline-variant',
  Expired: 'bg-surface-variant text-on-surface-variant border-outline-variant',
  Paid: 'bg-primary-container/30 text-primary border-primary/30',
  Unpaid: 'bg-tertiary-container/40 text-on-tertiary-container border-tertiary/30',
  Refunded: 'bg-surface-variant text-on-surface-variant border-outline-variant',
  Success: 'bg-primary-container/30 text-primary border-primary/30',
  Failed: 'bg-error-container/30 text-error border-error/30',
  Earn: 'bg-primary-container/30 text-primary border-primary/30',
  Redeem: 'bg-tertiary-container/40 text-on-tertiary-container border-tertiary/30',
  'Low stock': 'bg-error-container/30 text-error border-error/30',
  Available: 'bg-primary-container/30 text-primary border-primary/30',
  Depleted: 'bg-surface-variant text-on-surface-variant border-outline-variant',
  BranchImport: 'bg-primary-container/30 text-primary border-primary/30',
  Usage: 'bg-secondary-container/40 text-on-secondary-container border-secondary/30',
  ExtraUsage: 'bg-tertiary-container/40 text-on-tertiary-container border-tertiary/30',
  Discard: 'bg-error-container/30 text-error border-error/30',
  Adjustment: 'bg-surface-variant text-on-surface-variant border-outline-variant',
}

const STATUS_LABELS = {
  Active: 'Đang hoạt động',
  Approved: 'Đã duyệt',
  OK: 'Ổn định',
  Blocked: 'Đã chặn',
  Rejected: 'Từ chối',
  Discarded: 'Đã hủy bỏ',
  Inactive: 'Ngừng hoạt động',
  Pending: 'Chờ xử lý',
  PendingApproval: 'Chờ duyệt',
  Processing: 'Đang xử lý',
  Completed: 'Hoàn thành',
  'Checked-in': 'Đã check-in',
  Cancelled: 'Đã hủy',
  'No-show': 'Vắng mặt',
  Expired: 'Hết hạn',
  Paid: 'Đã thanh toán',
  Unpaid: 'Chưa thanh toán',
  Refunded: 'Đã hoàn tiền',
  Success: 'Thành công',
  Failed: 'Thất bại',
  Earn: 'Cộng điểm',
  Redeem: 'Đổi điểm',
  'Low stock': 'Sắp hết hàng',
  Available: 'Có sẵn',
  Depleted: 'Đã hết',
  BranchImport: 'Nhập kho chi nhánh',
  Usage: 'Sử dụng',
  ExtraUsage: 'Sử dụng phát sinh',
  Discard: 'Hủy bỏ',
  Adjustment: 'Điều chỉnh',
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? 'bg-surface-variant text-on-surface-variant border-outline-variant'
  const label = STATUS_LABELS[status] ?? status

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide uppercase ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}
