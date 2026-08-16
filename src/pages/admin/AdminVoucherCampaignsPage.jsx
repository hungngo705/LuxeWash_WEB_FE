import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ApiError,
  CAMPAIGN_TYPE,
  CAMPAIGN_TYPE_LABEL,
  createAgeCampaign,
  createBirthdayCampaign,
  createMilestoneCampaign,
  createVipCampaign,
  createWinbackCampaign,
  deleteCampaign,
  DISCOUNT_KIND,
  fetchTiers,
  fetchVouchers,
  normalizeCampaignVoucher,
  processVoucherCampaigns,
  toTimeInputValue,
  updateCampaignActive,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import DiscountFields from '../../components/admin/shared/DiscountFields'
import EmptyState from '../../components/admin/shared/EmptyState'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import TimeRangeField from '../../components/admin/shared/TimeRangeField'
import {
  describeVoucherUsability,
  formatVoucherDailyWindow,
  formatVoucherDiscount,
  formatVoucherValidityWindow,
} from '../../utils/voucherDisplay'
import { formatDateTime, formatVnd } from '../../utils/format'

// ─── Shared form field helpers ────────────────────────────────────────────────

const emptyBase = {
  code: '',
  discountKind: DISCOUNT_KIND.Fixed,
  discountAmount: '',
  discountPercent: '',
  maxDiscountAmount: '',
  maxUsages: '',
  maxUsagePerUser: '1',
  expiryDays: '7',
  startDate: '',
  endDate: '',
  minOrderAmount: '',
  imageUrl: '',
  requiredTierId: '',
  validStartTime: '',
  validEndTime: '',
  isActive: true,
}

const emptyBirthdayForm = { ...emptyBase }
const emptyAgeForm = { ...emptyBase, targetAge: '' }
const emptyWinbackForm = { ...emptyBase, inactiveDays: '', resendAfterDays: '' }
const emptyVipForm = { ...emptyBase, requiredTierId: '' }
const emptyMilestoneForm = { ...emptyBase, milestoneUsageCount: '' }

const TAB_KEYS = ['birthday', 'age', 'winback', 'vip', 'milestone']
const TAB_LABELS = {
  birthday: 'Sinh Nhật',
  age: 'Theo Tuổi',
  winback: 'Winback',
  vip: 'VIP',
  milestone: 'Kỷ Niệm',
}
const TAB_ICONS = {
  birthday: 'cake',
  age: 'elderly',
  winback: 'replay',
  vip: 'workspace_premium',
  milestone: 'flag',
}

function getCreateFn(tab) {
  switch (tab) {
    case 'birthday': return createBirthdayCampaign
    case 'age': return createAgeCampaign
    case 'winback': return createWinbackCampaign
    case 'vip': return createVipCampaign
    case 'milestone': return createMilestoneCampaign
    default: return createBirthdayCampaign
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateBase(form) {
  if (!form.code.trim()) return 'Vui lòng nhập mã voucher campaign'
  if (form.code.trim().length > 50) return 'Mã voucher tối đa 50 ký tự'
  if (form.discountKind === DISCOUNT_KIND.Percent) {
    if (!form.discountPercent || Number(form.discountPercent) < 1 || Number(form.discountPercent) > 100) {
      return 'Phần trăm giảm phải từ 1–100'
    }
    if (!form.maxDiscountAmount || Number(form.maxDiscountAmount) < 1) {
      return 'Vui lòng nhập trần giảm tối đa (VND)'
    }
  } else if (!form.discountAmount || Number(form.discountAmount) <= 0) {
    return 'Giảm giá phải lớn hơn 0'
  } else if (Number(form.discountAmount) > 1_000_000_000) {
    return 'Giảm giá tối đa 1.000.000.000 VND'
  }
  if (!form.maxUsages || Number(form.maxUsages) < 1) return 'Tổng lượt dùng phải ít nhất 1'
  if (!form.maxUsagePerUser || Number(form.maxUsagePerUser) < 1) return 'Lượt dùng mỗi user phải ít nhất 1'
  if (!form.expiryDays || Number(form.expiryDays) < 1) return 'Số ngày hết hạn phải ít nhất 1'
  return null
}

function validateTab(tab, form) {
  const base = validateBase(form)
  if (base) return base

  if (tab === 'age') {
    if (!form.targetAge || Number(form.targetAge) < 1) return 'Tuổi mục tiêu phải lớn hơn 0'
    if (Number(form.targetAge) > 150) return 'Tuổi mục tiêu không hợp lệ'
  }
  if (tab === 'winback') {
    if (!form.inactiveDays || Number(form.inactiveDays) < 1) return 'Số ngày không hoạt động phải lớn hơn 0'
    if (!form.resendAfterDays || Number(form.resendAfterDays) < 1) return 'Số ngày gửi lại phải lớn hơn 0'
    if (Number(form.resendAfterDays) > Number(form.inactiveDays)) return 'Số ngày gửi lại không nên lớn hơn số ngày không hoạt động'
  }
  if (tab === 'vip') {
    if (!form.requiredTierId) return 'Vui lòng chọn hạng thành viên tối thiểu'
  }
  if (tab === 'milestone') {
    if (!form.milestoneUsageCount || Number(form.milestoneUsageCount) < 1) return 'Số lần sử dụng mục tiêu phải lớn hơn 0'
  }
  return null
}

// ─── Number input handler ─────────────────────────────────────────────────────

function num(setForm, field, value) {
  if (value !== '' && !/^\d+$/.test(value)) return
  setForm((f) => ({ ...f, [field]: value }))
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${checked ? 'bg-primary' : 'bg-outline-variant'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ─── Form Fields ──────────────────────────────────────────────────────────────

function BaseFields({ form, setForm, saving, tiers }) {
  return (
    <>
      <div className="rounded-lg border border-secondary/20 bg-secondary-container/10 px-3 py-2 text-xs text-on-surface-variant">
        <strong className="text-on-surface">Campaign</strong> = quy tắc tự động cấp voucher.
        <strong className="ml-1 text-on-surface">Mã voucher</strong> bên dưới là mã sẽ cấp cho khách (khác trang Voucher thủ công).
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
          Mã voucher cấp cho khách <span className="text-error">*</span>
        </span>
        <input
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono uppercase placeholder:normal-case"
          value={form.code}
          disabled={saving}
          placeholder="VD: BIRTHDAY20"
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
        />
      </label>

      <DiscountFields form={form} setForm={setForm} saving={saving} />

      <div className="grid grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
            Tổng lượt dùng <span className="text-error">*</span>
          </span>
          <input
            type="number"
            min={1}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={form.maxUsages}
            disabled={saving}
            placeholder="1000"
            onChange={(e) => num(setForm, 'maxUsages', e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
            Lượt/người <span className="text-error">*</span>
          </span>
          <input
            type="number"
            min={1}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={form.maxUsagePerUser}
            disabled={saving}
            onChange={(e) => num(setForm, 'maxUsagePerUser', e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
            Thời hạn voucher (ngày) <span className="text-error">*</span>
          </span>
          <input
            type="number"
            min={1}
            max={3650}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={form.expiryDays}
            disabled={saving}
            onChange={(e) => num(setForm, 'expiryDays', e.target.value)}
          />
          <p className="text-xs text-on-surface-variant">
            Số ngày voucher có hiệu lực kể từ lúc được cấp cho khách (không phải ngày tạo campaign).
          </p>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
            Giá trị đơn tối thiểu (VND)
          </span>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={form.minOrderAmount}
            disabled={saving}
            placeholder="0"
            onChange={(e) => num(setForm, 'minOrderAmount', e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
              Thời gian bắt đầu
            </span>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.startDate}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
              Thời gian kết thúc
            </span>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.endDate}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </label>
      </div>

      <TimeRangeField
        label="Khung giờ sử dụng"
        startValue={form.validStartTime}
        endValue={form.validEndTime}
        disabled={saving}
        hint="Khung giờ khách được dùng voucher sau khi nhận."
        onStartChange={(value) => setForm((f) => ({ ...f, validStartTime: value }))}
        onEndChange={(value) => setForm((f) => ({ ...f, validEndTime: value }))}
      />

      <label className="block space-y-1">
        <span className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
          URL ảnh
        </span>
        <input
          type="url"
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
          value={form.imageUrl}
          disabled={saving}
          placeholder="https://..."
          onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
        />
      </label>
    </>
  )
}

function TabSpecificFields({ tab, form, setForm, saving, tiers }) {
  if (tab === 'age') {
    return (
      <label className="block space-y-1">
        <span className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
          Tuổi mục tiêu <span className="text-error">*</span>
        </span>
        <input
          type="number"
          min={1}
          max={150}
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
          value={form.targetAge}
          disabled={saving}
          placeholder="VD: 20"
          onChange={(e) => num(setForm, 'targetAge', e.target.value)}
        />
        <p className="mt-1 text-xs text-on-surface-variant">
          Voucher sẽ được cấp khi khách đủ tuổi này (tính từ ngày sinh).
        </p>
      </label>
    )
  }

  if (tab === 'winback') {
    return (
      <div className="grid grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
            Ngày không hoạt động <span className="text-error">*</span>
          </span>
          <input
            type="number"
            min={1}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={form.inactiveDays}
            disabled={saving}
            placeholder="60"
            onChange={(e) => num(setForm, 'inactiveDays', e.target.value)}
          />
          <p className="mt-1 text-xs text-on-surface-variant">
            Cấp voucher khi khách không quay lại sau N ngày.
          </p>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
            Gửi lại sau (ngày) <span className="text-error">*</span>
          </span>
          <input
            type="number"
            min={1}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={form.resendAfterDays}
            disabled={saving}
            placeholder="30"
            onChange={(e) => num(setForm, 'resendAfterDays', e.target.value)}
          />
          <p className="mt-1 text-xs text-on-surface-variant">
            Sau bao lâu mới gửi lại cho cùng khách.
          </p>
        </label>
      </div>
    )
  }

  if (tab === 'vip') {
    return (
      <label className="block space-y-1">
        <span className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
          Hạng thành viên tối thiểu <span className="text-error">*</span>
        </span>
        <select
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
          value={form.requiredTierId}
          disabled={saving}
          onChange={(e) => setForm((f) => ({ ...f, requiredTierId: e.target.value }))}
        >
          <option value="">— Chọn hạng —</option>
          {tiers.map((t) => (
            <option key={t.tierId} value={t.tierId}>
              {t.tierName}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-on-surface-variant">
          Voucher chỉ được cấp cho khách có hạng bằng hoặc cao hơn hạng đã chọn.
        </p>
      </label>
    )
  }

  if (tab === 'milestone') {
    return (
      <label className="block space-y-1">
        <span className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant">
          Số lần sử dụng dịch vụ <span className="text-error">*</span>
        </span>
        <input
          type="number"
          min={1}
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
          value={form.milestoneUsageCount}
          disabled={saving}
          placeholder="VD: 10"
          onChange={(e) => num(setForm, 'milestoneUsageCount', e.target.value)}
        />
        <p className="mt-1 text-xs text-on-surface-variant">
          Cấp voucher khi khách hoàn thành đủ N lần booking.
        </p>
      </label>
    )
  }

  return null
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminVoucherCampaignsPage() {
  const [activeTab, setActiveTab] = useState('birthday')
  const [tiers, setTiers] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [toggling, setToggling] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const formRefs = useRef({})

  const getForm = (tab) => {
    if (!formRefs.current[tab]) {
      switch (tab) {
        case 'birthday': formRefs.current[tab] = { ...emptyBirthdayForm }; break
        case 'age': formRefs.current[tab] = { ...emptyAgeForm }; break
        case 'winback': formRefs.current[tab] = { ...emptyWinbackForm }; break
        case 'vip': formRefs.current[tab] = { ...emptyVipForm }; break
        case 'milestone': formRefs.current[tab] = { ...emptyMilestoneForm }; break
        default: formRefs.current[tab] = { ...emptyBirthdayForm }
      }
    }
    return formRefs.current[tab]
  }

  const setForm = (tab, updater) => {
    if (typeof updater === 'function') {
      formRefs.current[tab] = updater(formRefs.current[tab])
    } else {
      formRefs.current[tab] = updater
    }
    setForceUpdate((n) => n + 1)
  }

  const [, setForceUpdate] = useState(0)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const campaignsRef = useRef([])

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [vouchersData] = await Promise.all([
        fetchVouchers(),
      ])
      const all = (Array.isArray(vouchersData) ? vouchersData : [])

      // Giữ lại campaignType đã biết cho mỗi voucherId — phòng khi backend
      // trả về campaignType = 0 (Manual) sau khi PUT toggle IsActive.
      const knownTypes = new Map(
        campaignsRef.current
          .filter((c) => c && c.campaignType !== undefined)
          .map((c) => [c.voucherId, c.campaignType]),
      )
      const normalized = all.map(normalizeCampaignVoucher).map((v) => {
        if (v.campaignType === CAMPAIGN_TYPE.Manual) {
          const remembered = knownTypes.get(v.voucherId)
          if (remembered && remembered !== CAMPAIGN_TYPE.Manual) {
            return { ...v, campaignType: remembered }
          }
        }
        return v
      })

      const filtered = normalized.filter(
        (v) => v.campaignType !== CAMPAIGN_TYPE.Manual,
      )

      campaignsRef.current = filtered
      setCampaigns(filtered)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    fetchTiers()
      .then((data) => setTiers(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (tab) => {
    const form = formRefs.current[tab]
    if (!form) return

    if (saving) return
    const err = validateTab(tab, form)
    if (err) {
      showToast(err)
      return
    }

    setSaving(true)
    try {
      const createFn = getCreateFn(tab)
      await createFn(form)
      showToast('Tạo chiến dịch thành công!')
      formRefs.current[tab] = (() => {
        switch (tab) {
          case 'birthday': return { ...emptyBirthdayForm }
          case 'age': return { ...emptyAgeForm }
          case 'winback': return { ...emptyWinbackForm }
          case 'vip': return { ...emptyVipForm }
          case 'milestone': return { ...emptyMilestoneForm }
          default: return { ...emptyBirthdayForm }
        }
      })()
      setForceUpdate((n) => n + 1)
      await loadData()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Tạo chiến dịch thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (voucher) => {
    if (toggling !== null) return
    setToggling(voucher.voucherId)

    // Optimistic update: giữ nguyên campaignType và chỉ đổi isActive trên FE
    // để tránh trường hợp backend trả về campaignType = Manual sai sau update.
    const previousList = campaignsRef.current
    const optimistic = previousList.map((v) =>
      v.voucherId === voucher.voucherId
        ? { ...v, isActive: !voucher.isActive }
        : v,
    )
    campaignsRef.current = optimistic
    setCampaigns(optimistic)

    try {
      await updateCampaignActive(voucher, !voucher.isActive)
      showToast(voucher.isActive ? 'Đã tắt chiến dịch' : 'Đã bật chiến dịch')
      await loadData()
    } catch (err) {
      campaignsRef.current = previousList
      setCampaigns(previousList)
      showToast(err instanceof ApiError ? err.message : 'Không cập nhật được trạng thái')
    } finally {
      setToggling(null)
    }
  }

  const handleProcessCampaigns = async () => {
    if (processing) return
    setProcessing(true)
    try {
      const result = await processVoucherCampaigns()
      const rows = Array.isArray(result) ? result : []
      const granted = rows.reduce((sum, row) => sum + Number(row.grantedCount ?? 0), 0)
      showToast(
        rows.length
          ? `Đã chạy campaign — cấp ${granted} voucher cho khách đủ điều kiện.`
          : 'Đã chạy campaign — không có khách đủ điều kiện hôm nay.',
      )
      await loadData()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không chạy được campaign')
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(deleteTarget)
    try {
      await deleteCampaign(deleteTarget)
      setDeleteTarget(null)
      showToast('Đã xóa chiến dịch')
      await loadData()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không xóa được chiến dịch')
    } finally {
      setDeleting(null)
    }
  }

  const tabDescriptions = {
    birthday: 'Tự động cấp voucher cho khách hàng có ngày sinh trùng hôm nay. Mỗi khách chỉ nhận được một lần mỗi năm.',
    age: 'Tự động cấp voucher khi khách đủ tuổi mục tiêu (tính theo ngày sinh).',
    winback: 'Tự động cấp voucher để thu hút khách hàng lâu ngày không quay lại sử dụng dịch vụ.',
    vip: 'Tự động cấp voucher cho khách thuộc hạng thành viên bằng hoặc cao hơn hạng được chọn.',
    milestone: 'Tự động cấp voucher khi khách hoàn thành đủ N lần sử dụng dịch vụ.',
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Chiến dịch Voucher tự động"
        description="Tạo rule tự động cấp voucher cho khách hàng theo điều kiện"
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-on-secondary hover:bg-secondary/90 disabled:opacity-50"
          onClick={handleProcessCampaigns}
          disabled={processing}
        >
          <span className="material-symbols-outlined text-base">play_arrow</span>
          {processing ? 'Đang chạy campaign…' : 'Chạy campaign hôm nay'}
        </button>
        <p className="text-sm text-on-surface-variant">
          Quét và cấp voucher tự động cho khách đủ điều kiện hôm nay.
        </p>
      </div>

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      {loadError && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-error-container bg-error-container/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="rounded-lg border border-error/30 px-3 py-1.5 text-sm font-medium text-error hover:bg-error-container/20"
            onClick={loadData}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-primary text-on-primary shadow-sm'
                : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-base">{TAB_ICONS[key]}</span>
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {/* ── Campaign Info ─────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-xl border border-primary/20 bg-primary-container/10 px-5 py-4">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-primary">
          <span className="material-symbols-outlined text-base">{TAB_ICONS[activeTab]}</span>
          Voucher {TAB_LABELS[activeTab]}
        </h3>
        <p className="text-sm text-on-surface-variant">{tabDescriptions[activeTab]}</p>
      </div>

      {/* ── Create Form ───────────────────────────────────────────────────── */}
      <div className="mb-10 glass-panel soft-shadow overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant bg-surface-container-low px-6 py-4">
          <h3 className="text-sm font-semibold text-on-surface">Tạo chiến dịch mới</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <BaseFields
              form={getForm(activeTab)}
              setForm={(updater) => setForm(activeTab, updater)}
              saving={saving}
              tiers={tiers}
            />
            <TabSpecificFields
              tab={activeTab}
              form={getForm(activeTab)}
              setForm={(updater) => setForm(activeTab, updater)}
              saving={saving}
              tiers={tiers}
            />

            {/* Is Active toggle */}
            <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3">
              <div>
                <p className="text-sm font-medium text-on-surface">Bật chiến dịch</p>
                <p className="text-xs text-on-surface-variant">
                  Chiến dịch sẽ bắt đầu chạy ngay khi được kích hoạt
                </p>
              </div>
              <Toggle
                checked={getForm(activeTab).isActive}
                onChange={(val) => setForm(activeTab, (f) => ({ ...f, isActive: val }))}
                disabled={saving}
              />
            </div>

            <button
              type="button"
              className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary transition-colors hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60"
              disabled={saving}
              onClick={() => handleSubmit(activeTab)}
            >
              {saving ? 'Đang tạo…' : 'Tạo chiến dịch'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Existing Campaigns ────────────────────────────────────────────── */}
      <div className="glass-panel soft-shadow overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant bg-surface-container-low px-6 py-4">
          <h3 className="text-sm font-semibold text-on-surface">
            Chiến dịch đã tạo ({campaigns.length})
          </h3>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-on-surface-variant">Đang tải…</p>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon="campaign"
            title="Chưa có chiến dịch nào"
            description="Tạo chiến dịch mới bằng form bên trên"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                  <th className="px-4 py-3">Mã voucher</th>
                  <th className="px-4 py-3">Loại campaign</th>
                  <th className="px-4 py-3">Giảm giá</th>
                  <th className="px-4 py-3">Thời gian hiệu lực</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Hạn (ngày)</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Hoạt động</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {campaigns.map((c) => (
                  <tr key={c.voucherId} className="hover:bg-surface-container-low/50">
                    <td className="px-4 py-3 font-mono font-medium text-on-surface">{c.code}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={CAMPAIGN_TYPE_LABEL[c.campaignType] ?? '—'} />
                    </td>
                    <td className="px-4 py-3 text-on-surface">{formatVoucherDiscount(c)}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">
                      {formatVoucherValidityWindow(c)}
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">
                      {formatVoucherDailyWindow(c)}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {c.expiryDays ?? '—'} (từ lúc cấp)
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={describeVoucherUsability(c)} />
                    </td>
                    <td className="px-4 py-3">
                      <Toggle
                        checked={c.isActive}
                        onChange={() => handleToggle(c)}
                        disabled={toggling === c.voucherId}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-error hover:bg-error-container/20"
                        onClick={() => setDeleteTarget(c.voucherId)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa chiến dịch"
        message="Bạn chắc chắn muốn xóa chiến dịch này? Hành động này không thể hoàn tác."
        confirmLabel={deleting ? 'Đang xóa…' : 'Xóa'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  )
}
