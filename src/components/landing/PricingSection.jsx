import { formatVnd } from '../../utils/format'
import CatalogState from './CatalogState'

export default function PricingSection({ branches, branchId, onBranchChange, rows, loading, error, onRetry }) {
  return (
    <section id="pricing" className="scroll-mt-20 bg-surface-container-low py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="font-sora text-3xl font-bold text-on-surface">Giá theo chi nhánh và loại xe</h2>
          <p className="mt-3 text-on-surface-variant">Giá dịch vụ và thời gian ước tính theo cấu hình hiện tại. Số tiền thanh toán được xác định trong bước đặt lịch.</p>
        </div>
        {!loading && !error && branches.length > 0 && (
          <label className="mb-6 flex flex-wrap items-center gap-3 font-medium text-on-surface">
            Chi nhánh
            <select value={branchId} onChange={(e) => onBranchChange(e.target.value)} className="max-w-full rounded-lg border border-outline-variant bg-white px-4 py-3">
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
        )}
        {loading || error || !rows.length ? (
          <CatalogState loading={loading} error={error} onRetry={onRetry} empty={branches.length ? 'Chi nhánh này chưa có giá dịch vụ được cấu hình.' : 'Chưa có chi nhánh đang hoạt động để hiển thị giá.'} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-white">
            <table className="w-full min-w-[580px] text-left text-sm">
              <caption className="sr-only">Giá dịch vụ tại {branches.find((branch) => branch.id === Number(branchId))?.name}</caption>
              <thead className="bg-primary text-on-primary"><tr>{['Dịch vụ', 'Loại xe', 'Giá dịch vụ', 'Thời gian ước tính'].map((title) => <th key={title} scope="col" className="px-5 py-4 font-semibold">{title}</th>)}</tr></thead>
              <tbody className="divide-y divide-outline-variant">
                {rows.map((row) => (
                  <tr key={`${row.serviceId}-${row.branchId}-${row.vehicleTypeId}`}>
                    <td className="px-5 py-4 font-medium text-on-surface">{row.serviceName}</td>
                    <td className="px-5 py-4 text-on-surface-variant">{row.vehicleTypeName && row.vehicleTypeName !== 'N/A' ? row.vehicleTypeName : `Loại xe #${row.vehicleTypeId}`}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-primary">{formatVnd(row.price)}</td>
                    <td className="px-5 py-4 text-on-surface-variant">{Number.isFinite(row.estimatedDurationMinutes) && row.estimatedDurationMinutes > 0 ? `${row.estimatedDurationMinutes} phút` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
