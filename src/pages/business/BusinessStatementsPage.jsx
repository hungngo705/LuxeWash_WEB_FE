import { useEffect, useState } from 'react'
import { fetchMonthlyStatement } from '../../api/business.api'
import { formatVnd } from '../../utils/format'

export default function BusinessStatementsPage() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const [statement, setStatement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchMonthlyStatement(year, month)
      .then(setStatement)
      .catch(() => setError('Không thể tải báo cáo.'))
      .finally(() => setLoading(false))
  }, [year, month])

  const years = Array.from({ length: 3 }, (_, i) => currentYear - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const sortedVehicles = statement?.vehicles
    ? [...statement.vehicles].sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sora text-lg font-semibold text-on-surface">Báo cáo tháng</h2>
          <p className="text-sm text-on-surface-variant">Tổng hợp chi phí và số lần rửa xe theo tháng</p>
        </div>
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="px-3 py-2 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface"
          >
            {months.map((m) => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-2 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant">
          <p className="text-xs text-on-surface-variant mb-1">Tháng {month}/{year}</p>
          <p className="font-sora text-2xl font-bold text-primary">
            {statement?.totalWashes || 0}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">Tổng lần rửa</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant">
          <p className="text-xs text-on-surface-variant mb-1">Tổng chi phí</p>
          <p className="font-sora text-2xl font-bold text-red-600">
            {formatVnd(statement?.totalCost || 0)}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">Chưa VAT</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant">
          <p className="text-xs text-on-surface-variant mb-1">VAT (8%)</p>
          <p className="font-sora text-2xl font-bold text-orange-600">
            {formatVnd((statement?.totalCost || 0) * 0.08)}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">Thuế GTGT</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant">
          <p className="text-xs text-on-surface-variant mb-1">Tổng cộng</p>
          <p className="font-sora text-2xl font-bold text-on-surface">
            {formatVnd((statement?.totalCost || 0) * 1.08)}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">Đã VAT</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
          <h3 className="font-medium text-on-surface text-sm">Chi phí theo xe (sắp xếp giảm dần)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Biển số</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-on-surface-variant uppercase">Số lần rửa</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-on-surface-variant uppercase">Tổng chi phí</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {sortedVehicles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-on-surface-variant">
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                sortedVehicles.map((v, idx) => (
                  <tr key={idx} className="hover:bg-surface-container transition-colors">
                    <td className="px-4 py-3 text-sm text-on-surface-variant">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-primary">{v.licensePlate}</td>
                    <td className="px-4 py-3 text-sm text-center text-on-surface">{v.washCount || 0}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-primary">{formatVnd(v.totalCost || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
