import { useMemo, useState } from 'react'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import { initialAdminVouchers } from '../../data/mockAdminVouchers'
import { formatDateTime, formatVnd } from '../../utils/format'

const emptyForm = {
  code: '',
  discountAmount: 0,
  pointsRequired: 0,
  maxUsages: 100,
  usedCount: 0,
  expiryDate: '',
  status: 'Active',
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState(initialAdminVouchers)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState('')

  const nextId = useMemo(
    () => (vouchers.length ? Math.max(...vouchers.map((v) => v.voucherId)) + 1 : 1),
    [vouchers],
  )

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, expiryDate: '2026-12-31T23:59:59' })
    setModalOpen(true)
  }

  const openEdit = (voucher) => {
    setEditingId(voucher.voucherId)
    setForm({ ...voucher })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.code.trim()) return

    if (editingId) {
      setVouchers((prev) =>
        prev.map((v) => (v.voucherId === editingId ? { ...v, ...form } : v)),
      )
    } else {
      setVouchers((prev) => [...prev, { voucherId: nextId, ...form }])
    }
    setModalOpen(false)
    showToast('Đã lưu (mock)')
  }

  const handleDelete = () => {
    setVouchers((prev) => prev.filter((v) => v.voucherId !== deleteTarget))
    setDeleteTarget(null)
    showToast('Đã xóa voucher (mock)')
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

      {vouchers.length === 0 ? (
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
                    {voucher.usedCount} / {voucher.maxUsages}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {formatDateTime(voucher.expiryDate)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={voucher.status} />
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
        onClose={() => setModalOpen(false)}
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
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={form.discountAmount}
                onChange={(e) => setForm((f) => ({ ...f, discountAmount: Number(e.target.value) }))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Điểm đổi
              </span>
              <input
                type="number"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={form.pointsRequired}
                onChange={(e) => setForm((f) => ({ ...f, pointsRequired: Number(e.target.value) }))}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Max usages
              </span>
              <input
                type="number"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={form.maxUsages}
                onChange={(e) => setForm((f) => ({ ...f, maxUsages: Number(e.target.value) }))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Trạng thái
              </span>
              <select
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Ngày hết hạn
            </span>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.expiryDate ? form.expiryDate.slice(0, 16) : ''}
              onChange={(e) => setForm((f) => ({ ...f, expiryDate: `${e.target.value}:00` }))}
            />
          </label>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa voucher"
        message="Bạn chắc chắn muốn xóa voucher này?"
        confirmLabel="Xóa"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
