import { useMemo, useState } from 'react'
import ConfirmDialog from '../../components/admin/shared/ConfirmDialog'
import EmptyState from '../../components/admin/shared/EmptyState'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import { initialAdminTimeSlots } from '../../data/mockAdminTimeSlots'

const emptyForm = {
  startTime: '07:00',
  endTime: '07:20',
  maxCapacity: 3,
  isVipOnly: false,
  bookedToday: 0,
}

export default function AdminTimeSlotsPage() {
  const [slots, setSlots] = useState(initialAdminTimeSlots)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState('')

  const nextId = useMemo(
    () => (slots.length ? Math.max(...slots.map((s) => s.slotId)) + 1 : 1),
    [slots],
  )

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (slot) => {
    setEditingId(slot.slotId)
    setForm({
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxCapacity: slot.maxCapacity,
      isVipOnly: slot.isVipOnly,
      bookedToday: slot.bookedToday,
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (editingId) {
      setSlots((prev) =>
        prev.map((s) => (s.slotId === editingId ? { ...s, ...form } : s)),
      )
    } else {
      setSlots((prev) => [...prev, { slotId: nextId, ...form }])
    }
    setModalOpen(false)
    showToast('Đã lưu (mock)')
  }

  const handleDelete = () => {
    setSlots((prev) => prev.filter((s) => s.slotId !== deleteTarget))
    setDeleteTarget(null)
    showToast('Đã xóa khung giờ (mock)')
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Khung giờ đặt lịch"
        description="Cấu hình slot trong ngày và capacity"
        actionLabel="Thêm khung giờ"
        onAction={openCreate}
      />

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      {slots.length === 0 ? (
        <EmptyState icon="schedule" title="Chưa có khung giờ" />
      ) : (
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Giờ bắt đầu</th>
                <th className="px-4 py-3">Giờ kết thúc</th>
                <th className="px-4 py-3">Capacity</th>
                <th className="px-4 py-3">VIP only</th>
                <th className="px-4 py-3">Đã đặt hôm nay</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {slots.map((slot) => (
                <tr key={slot.slotId} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 text-on-surface-variant">#{slot.slotId}</td>
                  <td className="px-4 py-3 text-on-surface">{slot.startTime}</td>
                  <td className="px-4 py-3 text-on-surface">{slot.endTime}</td>
                  <td className="px-4 py-3 text-on-surface">{slot.maxCapacity}</td>
                  <td className="px-4 py-3">
                    {slot.isVipOnly ? (
                      <span className="material-symbols-outlined text-tertiary">workspace_premium</span>
                    ) : (
                      <span className="text-on-surface-variant">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-on-surface">
                    {slot.bookedToday}/{slot.maxCapacity}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-primary hover:bg-primary-container/20"
                        onClick={() => openEdit(slot)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-error hover:bg-error-container/20"
                        onClick={() => setDeleteTarget(slot.slotId)}
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
        title={editingId ? 'Sửa khung giờ' : 'Thêm khung giờ'}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Giờ bắt đầu
              </span>
              <input
                type="time"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                Giờ kết thúc
              </span>
              <input
                type="time"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Capacity
            </span>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.maxCapacity}
              onChange={(e) => setForm((f) => ({ ...f, maxCapacity: Number(e.target.value) }))}
            />
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.isVipOnly}
              onChange={(e) => setForm((f) => ({ ...f, isVipOnly: e.target.checked }))}
              className="h-4 w-4 rounded border-outline-variant"
            />
            <span className="text-sm text-on-surface">Chỉ dành cho VIP (Platinum/Gold)</span>
          </label>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa khung giờ"
        message="Bạn chắc chắn muốn xóa khung giờ này?"
        confirmLabel="Xóa"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
