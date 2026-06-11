import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchFleetVehicles, createWalkIn } from '../../api/business.api'
import { fetchBranches } from '../../api/admin.branches.api'

export default function BusinessWalkInPage() {
  const [vehicles, setVehicles] = useState([])
  const [branches, setBranches] = useState([])
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchFleetVehicles(), fetchBranches()])
      .then(([v, b]) => {
        setVehicles(Array.isArray(v) ? v : [])
        setBranches(Array.isArray(b) ? b : [])
      })
      .catch(() => setError('Không thể tải dữ liệu.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!selectedVehicle || !selectedBranch) {
      setError('Vui lòng chọn đầy đủ thông tin.')
      return
    }
    setSubmitting(true)
    try {
      await createWalkIn({ fleetVehicleId: parseInt(selectedVehicle), branchId: parseInt(selectedBranch) })
      setSuccess('Check-in trực tiếp thành công! Xe đã được thêm vào hàng đợi.')
      setSelectedVehicle('')
      setSelectedBranch('')
    } catch (err) {
      const msg = err?.statusCode === 403 || err?.isForbidden
        ? 'Check-in trực tiếp chỉ dành cho nhân viên trạm. Vui lòng đặt lịch trước hoặc liên hệ quản lý chi nhánh.'
        : (err.message || 'Check-in thất bại. Vui lòng thử lại.')
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="font-sora text-lg font-semibold text-on-surface">Check-in trực tiếp</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Đăng ký xe vào rửa mà không cần đặt lịch trước.
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-green-600 filled">check_circle</span>
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-600">error</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Chọn xe <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="">-- Chọn xe --</option>
              {vehicles.map((v) => (
                <option key={v.fleetVehicleId || v.id} value={v.fleetVehicleId || v.id}>
                  {v.licensePlate} — {v.brand} {v.model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Chọn chi nhánh <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="">-- Chọn chi nhánh --</option>
              {branches.map((b) => (
                <option key={b.branchId || b.id} value={b.branchId || b.id}>
                  {b.name} — {b.address}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">directions_car</span>
                  Check-in ngay
                </>
              )}
            </button>
            <Link
              to="/business/bookings/new"
              className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-xl hover:bg-primary/5 transition-colors"
            >
              Hoặc đặt lịch trước
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
