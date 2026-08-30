import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  buildVoucherPayload,
  createVoucher,
  deleteVoucher,
  DISCOUNT_KIND,
  fetchTiers,
  fetchVehicleTypes,
  fetchVouchers,
  grantVoucherToUsers,
  toDatetimeLocalValue,
  toTimeInputValue,
  updateVoucher,
  VOUCHER_TYPE,
  VOUCHER_TYPE_LABEL,
  CAMPAIGN_TYPE,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import DiscountFields from '../../components/admin/shared/DiscountFields'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import TimeRangeField from '../../components/admin/shared/TimeRangeField'
import DataTable from '../../components/ui/DataTable'
import Input from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import {
  describeVoucherUsability,
  formatVoucherDailyWindow,
  formatVoucherDiscount,
  formatVoucherValidityWindow,
} from '../../utils/voucherDisplay'
const VOUCHER_TYPE_OPTIONS = [
  { value: VOUCHER_TYPE.Discount, label: VOUCHER_TYPE_LABEL[VOUCHER_TYPE.Discount] },
]

const emptyForm = {
  code: '',
  discountKind: DISCOUNT_KIND.Fixed,
  discountAmount: '',
  discountPercent: '',
  maxDiscountAmount: '',
  pointsRequired: '',
  maxUsages: '',
  maxUsagePerUser: '1',
  minOrderAmount: '0',
  expiryDate: '',
  startDate: '',
  voucherType: VOUCHER_TYPE.Discount,
  imageUrl: '',
  requiredTierId: '',
  vehicleTypeId: '',
  validStartTime: '',
  validEndTime: '',
  isActive: true,
}

function validateForm(form) {
  if (!form.code.trim()) return 'Vui lòng nhập mã voucher'
  if (form.code.trim().length > 50) return 'Mã voucher tối đa 50 ký tự'
  if (form.discountKind === DISCOUNT_KIND.Percent) {
    if (!form.discountPercent || Number(form.discountPercent) < 1 || Number(form.discountPercent) > 100) {
      return 'Phần trăm giảm phải từ 1–100'
    }
    if (!form.maxDiscountAmount || Number(form.maxDiscountAmount) < 1) {
      return 'Vui lòng nhập trần giảm tối đa (VND)'
    }
  } else if (form.discountAmount === '' || form.discountAmount == null) {
    return 'Vui lòng nhập giảm giá'
  } else {
    const amount = Number(form.discountAmount)
    if (amount < 0 || amount > 1_000_000_000) return 'Giảm giá phải từ 0 đến 1.000.000.000 VND'
  }
  if (!form.expiryDate) return 'Vui lòng chọn ngày hết hạn'
  if (form.maxUsages === '' || form.maxUsages == null) return 'Vui lòng nhập max usages'
  if (Number(form.maxUsages) < 1) return 'Max usages phải ít nhất 1'
  if (form.pointsRequired === '' || form.pointsRequired == null) return 'Vui lòng nhập điểm đổi'
  if (Number(form.pointsRequired) < 0) return 'Điểm đổi không được âm'
  return null
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState([])
  const [tiers, setTiers] = useState([])
  const [vehicleTypes, setVehicleTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [grantTarget, setGrantTarget] = useState(null)
  const [grantUserIds, setGrantUserIds] = useState('')
  const [granting, setGranting] = useState(false)
  const toast = useToast()

  const loadVouchers = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchVouchers()
      const arr = Array.isArray(data) ? data : []
      // Chỉ hiển thị voucher thủ công (đổi điểm)
      const filtered = arr.filter(v => !v.campaignType || v.campaignType === CAMPAIGN_TYPE.Manual)
      setVouchers(filtered)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách voucher')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVouchers()
  }, [loadVouchers])

  useEffect(() => {
    fetchTiers()
      .then((data) => setTiers(Array.isArray(data) ? data : []))
      .catch(() => {})
    fetchVehicleTypes()
      .then((data) => setVehicleTypes(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm({
      ...emptyForm,
      expiryDate: toDatetimeLocalValue('2026-12-31T23:59:59Z'),
    })
    setModalOpen(true)
  }

  const openEdit = (voucher) => {
    setEditingId(voucher.voucherId)
    setForm({
      code: voucher.code,
      discountKind:
        voucher.discountPercent != null && Number(voucher.discountPercent) > 0
          ? DISCOUNT_KIND.Percent
          : DISCOUNT_KIND.Fixed,
      discountAmount: String(voucher.discountAmount),
      discountPercent:
        voucher.discountPercent != null ? String(voucher.discountPercent) : '',
      maxDiscountAmount:
        voucher.maxDiscountAmount != null
          ? String(voucher.maxDiscountAmount)
          : String(voucher.discountAmount),
      pointsRequired: String(voucher.pointsRequired),
      maxUsages: String(voucher.maxUsages),
      maxUsagePerUser: String(voucher.maxUsagePerUser ?? 1),
      minOrderAmount: String(voucher.minOrderAmount ?? 0),
      expiryDate: toDatetimeLocalValue(voucher.expiryDate),
      startDate: voucher.startDate ? toDatetimeLocalValue(voucher.startDate) : '',
      voucherType: voucher.voucherType ?? VOUCHER_TYPE.Discount,
      imageUrl: voucher.imageUrl ?? '',
      requiredTierId: voucher.requiredTierId ? String(voucher.requiredTierId) : '',
      vehicleTypeId: voucher.vehicleTypeId ? String(voucher.vehicleTypeId) : '',
      validStartTime: toTimeInputValue(voucher.validStartTime),
      validEndTime: toTimeInputValue(voucher.validEndTime),
      isActive: voucher.isActive !== false,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (saving) return

    const validationError = validateForm(form)
    if (validationError) {
      toast.error(validationError)
      return
    }

    const payload = buildVoucherPayload(form)

    setSaving(true)
    try {
      if (editingId) {
        await updateVoucher(editingId, payload)
        toast.success('Đã cập nhật voucher')
      } else {
        await createVoucher(payload)
        toast.success('Đã thêm voucher mới')
      }

      setModalOpen(false)
      await loadVouchers()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không lưu được voucher')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return

    setDeleting(true)
    try {
      await deleteVoucher(deleteTarget)
      setDeleteTarget(null)
      toast.success('Đã xóa voucher')
      await loadVouchers()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không xóa được voucher')
    } finally {
      setDeleting(false)
    }
  }

  const handleGrant = async () => {
    if (!grantTarget || granting) return
    const userIds = grantUserIds
      .split(/[,;\s]+/)
      .map((v) => Number(v.trim()))
      .filter((id) => id > 0)
    if (!userIds.length) {
      toast.warning('Nhập ít nhất một User ID')
      return
    }
    setGranting(true)
    try {
      await grantVoucherToUsers(grantTarget.voucherId, userIds)
      toast.success(`Đã cấp voucher ${grantTarget.code} cho ${userIds.length} khách`)
      setGrantTarget(null)
      setGrantUserIds('')
      await loadVouchers()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không cấp được voucher')
    } finally {
      setGranting(false)
    }
  }

  const columns = [
    { key: 'code', label: 'Mã voucher', render: (voucher) => <span className="font-mono font-medium">{voucher.code}</span> },
    { key: 'discount', label: 'Giảm giá', render: (voucher) => formatVoucherDiscount(voucher) },
    {
      key: 'validity',
      label: 'Thời gian hiệu lực',
      tdClassName: 'text-xs text-on-surface-variant',
      render: (voucher) => formatVoucherValidityWindow(voucher),
    },
    {
      key: 'daily',
      label: 'Thời gian',
      tdClassName: 'text-xs text-on-surface-variant',
      render: (voucher) => formatVoucherDailyWindow(voucher),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (voucher) => <StatusBadge status={describeVoucherUsability(voucher)} />,
    },
    {
      key: 'usage',
      label: 'Đã dùng',
      render: (voucher) => `${voucher.currentUsageCount ?? voucher.redeemedCount ?? 0} / ${voucher.maxUsages}`,
    },
    {
      key: 'type',
      label: 'Loại',
      tdClassName: 'text-on-surface-variant',
      render: (voucher) => VOUCHER_TYPE_LABEL[voucher.voucherType] ?? voucher.voucherType,
    },
    {
      key: 'actions',
      label: 'Thao tác',
      width: '200px',
      renderActions: (voucher) => (
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-primary hover:bg-primary-container/20"
            onClick={() => openEdit(voucher)}
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 0" }}>
              edit
            </span>
            Sửa
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-secondary hover:bg-secondary-container/20"
            onClick={() => {
              setGrantTarget(voucher)
              setGrantUserIds('')
            }}
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 0" }}>
              card_giftcard
            </span>
            Cấp
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-error hover:bg-error-container/20"
            onClick={() => setDeleteTarget(voucher.voucherId)}
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 0" }}>
              delete
            </span>
            Xóa
          </button>
        </div>
      ),
    },
  ]

  const filteredVouchers = vouchers.filter((v) => Number(v.campaignType ?? 0) === CAMPAIGN_TYPE.Manual)

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Khuyến mãi"
        title="Voucher thủ công"
        description="Tạo mã giảm giá cố định (khác chiến dịch tự động tại Voucher Campaign). Thiết lập ngày bắt đầu, khung thời gian và hình thức giảm giá."
        actionLabel="Thêm voucher"
        actionIcon="add"
        onAction={openCreate}
      />

      {loadError && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="rounded-lg border border-error/30 px-3 py-1.5 text-sm font-medium text-error hover:bg-error-container/20"
            onClick={loadVouchers}
          >
            Thử lại
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredVouchers}
        loading={loading}
        emptyIcon="confirmation_number"
        emptyTitle="Chưa có voucher"
        minWidth="980px"
      />

      <FormModal
        open={modalOpen}
        title={editingId ? 'Sửa voucher' : 'Thêm voucher'}
        submitLabel={saving ? 'Đang lưu…' : 'Lưu'}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
        size="xl"
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Loại voucher
            </span>
            <select
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.voucherType}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, voucherType: Number(e.target.value) }))}
            >
              {VOUCHER_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="Mã voucher (tên hiển thị)"
            required
            value={form.code}
            disabled={saving}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            className="font-mono uppercase"
          />

          <DiscountFields form={form} setForm={setForm} saving={saving} />

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Điểm đổi
              </span>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={form.pointsRequired}
                disabled={saving}
                onChange={(e) => {
                  const value = e.target.value
                  if (value !== '' && !/^\d+$/.test(value)) return
                  setForm((f) => ({ ...f, pointsRequired: value }))
                }}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Đơn tối thiểu (VND)
              </span>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={form.minOrderAmount}
                disabled={saving}
                onChange={(e) => {
                  const value = e.target.value
                  if (value !== '' && !/^\d+$/.test(value)) return
                  setForm((f) => ({ ...f, minOrderAmount: value }))
                }}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Tổng Voucher
              </span>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={form.maxUsages}
                disabled={saving}
                onChange={(e) => {
                  const value = e.target.value
                  if (value !== '' && !/^\d+$/.test(value)) return
                  setForm((f) => ({ ...f, maxUsages: value }))
                }}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Tối đa / khách
              </span>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={form.maxUsagePerUser}
                disabled={saving}
                onChange={(e) => {
                  const value = e.target.value
                  if (value !== '' && !/^\d+$/.test(value)) return
                  setForm((f) => ({ ...f, maxUsagePerUser: value }))
                }}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              label="Thời gian bắt đầu"
              value={form.startDate}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              helper="Để trống = có hiệu lực ngay khi kích hoạt."
            />
            <Input
              type="datetime-local"
              label="Thời gian kết thúc"
              value={form.expiryDate}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
            />
          </div>

          <TimeRangeField
            label="Khung giờ sử dụng"
            startValue={form.validStartTime}
            endValue={form.validEndTime}
            disabled={saving}
            hint="Khung giờ trong ngày khách được dùng voucher. Để trống = cả ngày."
            onStartChange={(value) => setForm((f) => ({ ...f, validStartTime: value }))}
            onEndChange={(value) => setForm((f) => ({ ...f, validEndTime: value }))}
          />
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Hạng yêu cầu (tùy chọn)
            </span>
            <select
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.requiredTierId}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, requiredTierId: e.target.value }))}
            >
              <option value="">— Không yêu cầu —</option>
              {tiers.map((tier) => (
                <option key={tier.tierId} value={tier.tierId}>
                  {tier.tierName}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Loại xe áp dụng (tùy chọn)
            </span>
            <select
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.vehicleTypeId}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, vehicleTypeId: e.target.value }))}
            >
              <option value="">— Tất cả loại xe —</option>
              {vehicleTypes.map((vt) => (
                <option key={vt.vehicleTypeId ?? vt.id} value={vt.vehicleTypeId ?? vt.id}>
                  {vt.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={form.isActive}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Đang kích hoạt
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              URL ảnh (tùy chọn)
            </span>
            <input
              type="url"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.imageUrl}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            />
          </label>
        </div>
      </FormModal>

      <FormModal
        open={Boolean(grantTarget)}
        title={`Cấp voucher ${grantTarget?.code ?? ''}`}
        submitLabel={granting ? 'Đang cấp…' : 'Cấp voucher'}
        onClose={() => !granting && setGrantTarget(null)}
        onSubmit={handleGrant}
      >
        <div className="space-y-3">
          <p className="text-sm text-on-surface-variant">
            Nhập User ID (cách nhau bởi dấu phẩy). Có tra cứu ID tại trang Người dùng.
          </p>
          <textarea
            className="w-full rounded-lg border border-outline-variant px-3 py-2 font-mono text-sm"
            rows={4}
            placeholder="VD: 12, 45, 78"
            value={grantUserIds}
            disabled={granting}
            onChange={(e) => setGrantUserIds(e.target.value)}
          />
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa voucher"
        message="Bạn chắc chắn muốn xóa voucher này?"
        confirmLabel={deleting ? 'Đang xóa…' : 'Xóa'}
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  )
}