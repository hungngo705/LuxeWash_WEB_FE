import { DISCOUNT_KIND } from '../../../api/admin.vouchers.api'
import { formatVnd } from '../../../utils/format'

function num(setForm, field, value) {
  if (value !== '' && !/^\d+$/.test(value)) return
  setForm((f) => ({ ...f, [field]: value }))
}

/**
 * Giảm cố định (VND) hoặc % có trần tối đa
 */
export default function DiscountFields({ form, setForm, saving }) {
  const isPercent = form.discountKind === DISCOUNT_KIND.Percent
  const previewCap = Number(form.maxDiscountAmount || form.discountAmount || 0)
  const previewPercent = Number(form.discountPercent || 0)

  return (
    <div className="space-y-3 rounded-lg border border-outline-variant/60 bg-surface-container-low/40 p-3">
      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase text-on-surface-variant">Hình thức giảm</span>
        <select
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
          value={form.discountKind}
          disabled={saving}
          onChange={(e) => setForm((f) => ({ ...f, discountKind: e.target.value }))}
        >
          <option value={DISCOUNT_KIND.Fixed}>Giảm cố định (VND)</option>
          <option value={DISCOUNT_KIND.Percent}>Giảm theo %</option>
        </select>
      </label>

      {isPercent ? (
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Phần trăm (%)</span>
            <input
              type="number"
              min={1}
              max={100}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.discountPercent}
              disabled={saving}
              placeholder="50"
              onChange={(e) => num(setForm, 'discountPercent', e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Tối đa (VND)</span>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.maxDiscountAmount}
              disabled={saving}
              placeholder="50000"
              onChange={(e) => num(setForm, 'maxDiscountAmount', e.target.value)}
            />
          </label>
        </div>
      ) : (
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Giảm giá (VND)</span>
          <input
            type="number"
            min={1}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={form.discountAmount}
            disabled={saving}
            onChange={(e) => num(setForm, 'discountAmount', e.target.value)}
          />
        </label>
      )}

      {isPercent && previewPercent > 0 && previewCap > 0 && (
        <p className="text-xs text-on-surface-variant">
          Ví dụ: đơn 80.000 → giảm {formatVnd(Math.min(Math.round(80000 * previewPercent / 100), previewCap))};
          đơn 200.000 → giảm {formatVnd(Math.min(Math.round(200000 * previewPercent / 100), previewCap))}.
        </p>
      )}
    </div>
  )
}
