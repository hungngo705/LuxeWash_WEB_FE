import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createVoucher,
  deleteVoucher,
  fetchVouchers,
  toApiExpiryDate,
  toDatetimeLocalValue,
  updateVoucher,
} from '../../api'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import { formatDateTime, formatVnd } from '../../utils/format'

const emptyForm = {
  code: '',
  discountAmount: 50000,
  pointsRequired: 0,
  maxUsages: 100,
  expiryDate: '',
}

function getVoucherStatus(voucher) {
  const expiry = new Date(voucher.expiryDate)
  if (expiry < new Date()) return 'Expired'
  if ((voucher.redeemedCount ?? 0) >= voucher.maxUsages) return 'Expired'
  return 'Active'
}

function toApiPayload(form) {
  return {
    code: form.code.trim().toUpperCase(),
    discountAmount: Number(form.discountAmount),
    maxUsages: Number(form.maxUsages),
    expiryDate: toApiExpiryDate(form.expiryDate),
    pointsRequired: Number(form.pointsRequired),
  }
}

function validateForm(form) {
  if (!form.code.trim()) return 'Vui lòng nhập mã voucher'
  if (form.code.trim().length > 50) return 'Mã voucher tối đa 50 ký tự'
  const amount = Number(form.discountAmount)
  if (amount < 1 || amount > 1_000_000_000) return 'Giảm giá phải từ 1 đến 1.000.000.000 VND'
  if (!form.expiryDate) return 'Vui lòng chọn ngày hết hạn'
  if (Number(form.maxUsages) < 1) return 'Max usages phải ít nhất 1'
  if (Number(form.pointsRequired) < 0) return 'Điểm đổi không được âm'
  return null
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadVouchers = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchVouchers()
      setVouchers(Array.isArray(data) ? data : [])
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách voucher')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVouchers()
  }, [loadVouchers])

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
      discountAmount: voucher.discountAmount,
      pointsRequired: voucher.pointsRequired,
      maxUsages: voucher.maxUsages,
      expiryDate: toDatetimeLocalValue(voucher.expiryDate),
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (saving) return

    const validationError = validateForm(form)
    if (validationError) {
      showToast(validationError)
      return
    }

    const payload = toApiPayload(form)

    setSaving(true)
    try {
      if (editingId) {
        await updateVoucher(editingId, payload)
        showToast('Đã cập nhật voucher')
      } else {
        await createVoucher(payload)
        showToast('Đã thêm voucher mới')
      }

      setModalOpen(false)
      await loadVouchers()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không lưu được voucher')
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
      showToast('Đã xóa voucher')
      await loadVouchers()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không xóa được voucher')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Quản lý voucher"
        description="Tạo và quản lý mã giảm giá loyalty"
        actionLabel="Thêm voucher"
        onAction={openCreate}
      />

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
            onClick={loadVouchers}
          >
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải voucher…</p>
      ) : vouchers.length === 0 && !loadError ? (
        <EmptyState icon="confirmation_number" title="Chưa có voucher" />
      ) : (
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Giảm giá</th>
                <th className="px-4 py-3">Điểm đổi</th>
                <th className="px-4 py-3">Đã dùng / Max</th>
                <th className="px-4 py-3">Hết hạn</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {vouchers.map((voucher) => (
                <tr key={voucher.voucherId} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 font-mono font-medium text-on-surface">{voucher.code}</td>
                  <td className="px-4 py-3 text-on-surface">{formatVnd(voucher.discountAmount)}</td>
                  <td className="px-4 py-3 text-on-surface">{voucher.pointsRequired}</td>
                  <td className="px-4 py-3 text-on-surface">
                    {voucher.redeemedCount ?? 0} / {voucher.maxUsages}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {formatDateTime(voucher.expiryDate)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={getVoucherStatus(voucher)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-primary hover:bg-primary-container/20"
                        onClick={() => openEdit(voucher)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-error hover:bg-error-container/20"
                        onClick={() => setDeleteTarget(voucher.voucherId)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormModal
        open={modalOpen}
        title={editingId ? 'Sửa voucher' : 'Thêm voucher'}
        submitLabel={saving ? 'Đang lưu…' : 'Lưu'}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Mã voucher
            </span>
            <input
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono uppercase"
              value={form.code}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Giảm giá (VND)
              </span>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={form.discountAmount}
                disabled={saving}
                onChange={(e) => setForm((f) => ({ ...f, discountAmount: Number(e.target.value) }))}
              />
            </label>
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
                onChange={(e) => setForm((f) => ({ ...f, pointsRequired: Number(e.target.value) }))}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Max usages
            </span>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.maxUsages}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, maxUsages: Number(e.target.value) }))}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Ngày hết hạn
            </span>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.expiryDate}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
            />
          </label>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa voucher"
        message="Bạn chắc chắn muốn xóa voucher này?"
        confirmLabel={deleting ? 'Đang xóa…' : 'Xóa'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  )
}
