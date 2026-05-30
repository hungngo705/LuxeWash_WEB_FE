import { useState } from 'react'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import { initialAdminTiers } from '../../data/mockAdminTiers'

const TIER_COLORS = {
  Standard: 'border-outline-variant bg-surface-container-low',
  Silver: 'border-secondary/30 bg-secondary-container/20',
  Gold: 'border-tertiary/30 bg-tertiary-container/20',
  Platinum: 'border-primary/30 bg-primary-container/20',
}

export default function AdminTiersPage() {
  const [tiers, setTiers] = useState(initialAdminTiers)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const openEdit = (tier) => {
    setEditingId(tier.tierId)
    setForm({ ...tier })
    setModalOpen(true)
  }

  const handleSave = () => {
    setTiers((prev) =>
      prev.map((t) => (t.tierId === editingId ? { ...t, ...form } : t)),
    )
    setModalOpen(false)
    showToast('Đã lưu (mock)')
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Hạng thành viên"
        description="Cấu hình tier loyalty và quyền lợi đặt lịch"
      />

      <p className="mb-6 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
        <span className="material-symbols-outlined mr-1 align-middle text-[18px] text-primary">
          info
        </span>
        Đánh giá thăng/hạng tự động ngày 1 hàng tháng (BR-05)
      </p>

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiers.map((tier) => (
          <div
            key={tier.tierId}
            className={`glass-panel soft-shadow rounded-xl border p-5 ${TIER_COLORS[tier.tierName] ?? TIER_COLORS.Standard}`}
          >
            <div className="mb-4 flex items-start justify-between">
              <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-xs font-semibold tracking-wider uppercase">
                {tier.tierName}
              </span>
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => openEdit(tier)}
              >
                Sửa
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">Hệ số điểm</dt>
                <dd className="font-medium text-on-surface">×{tier.pointMultiplier}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">Cửa sổ đặt lịch</dt>
                <dd className="font-medium text-on-surface">{tier.bookingWindowDays} ngày</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">Điểm tích lũy tối thiểu</dt>
                <dd className="font-medium text-on-surface">
                  {tier.minAccumulatedPoints.toLocaleString('vi-VN')}
                </dd>
              </div>
              <div className="flex justify-between border-t border-outline-variant/40 pt-2">
                <dt className="text-on-surface-variant">Thành viên</dt>
                <dd className="font-sora font-semibold text-on-surface">{tier.memberCount}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <FormModal
        open={modalOpen}
        title={`Sửa hạng ${form.tierName ?? ''}`}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Hệ số điểm
            </span>
            <input
              type="number"
              step="0.1"
              min={1}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.pointMultiplier ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pointMultiplier: Number(e.target.value) }))}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Cửa sổ đặt lịch (ngày)
            </span>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.bookingWindowDays ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, bookingWindowDays: Number(e.target.value) }))}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Điểm tích lũy tối thiểu
            </span>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.minAccumulatedPoints ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, minAccumulatedPoints: Number(e.target.value) }))}
            />
          </label>
        </div>
      </FormModal>
    </div>
  )
}
