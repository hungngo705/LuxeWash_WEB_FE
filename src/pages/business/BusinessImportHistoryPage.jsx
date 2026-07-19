import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchImportHistory, fetchImportBatchDetail } from '../../api/business.api'
import { formatDateTime } from '../../utils/format'

function ImportDetailModal({ batch, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!batch?.fleetImportBatchId) return
    fetchImportBatchDetail(batch.fleetImportBatchId)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [batch])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-outline-variant">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <h3 className="font-sora text-lg font-semibold text-on-surface">
            Chi tiết lô nhập #{batch?.fleetImportBatchId}
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-4rem)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : detail ? (
            <>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-surface-container rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-on-surface">{detail.totalRows || 0}</p>
                  <p className="text-xs text-on-surface-variant">Tổng dòng</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-green-600">{detail.successRows || 0}</p>
                  <p className="text-xs text-on-surface-variant">Thành công</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-red-600">{detail.failedRows || 0}</p>
                  <p className="text-xs text-on-surface-variant">Thất bại</p>
                </div>
                <div className="bg-surface-container rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-on-surface">{detail.status}</p>
                  <p className="text-xs text-on-surface-variant">Trạng thái</p>
                </div>
              </div>

              {detail.errors && detail.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-on-surface mb-3">Danh sách lỗi</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {detail.errors.map((err, idx) => (
                      <div key={idx} className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
                        <span className="font-medium text-red-700">Dòng {err.rowNumber}: </span>
                        <span className="text-red-600">{err.errorMessage}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-sm text-on-surface-variant">Không có dữ liệu chi tiết.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BusinessImportHistoryPage() {
  const navigate = useNavigate()
  const [imports, setImports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedBatch, setSelectedBatch] = useState(null)

  useEffect(() => {
    fetchImportHistory()
      .then((data) => setImports(Array.isArray(data) ? data : []))
      .catch((err) => {
        const msg = err?.statusCode === 403 || err?.isForbidden
          ? err.message || 'Lịch sử nhập xe chưa khả dụng cho tài khoản doanh nghiệp trên API hiện tại.'
          : 'Không thể tải lịch sử nhập xe.'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [])

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
          <h2 className="font-sora text-lg font-semibold text-on-surface">Lịch sử nhập xe</h2>
          <p className="text-sm text-on-surface-variant">Danh sách các lô xe đã nhập từ file Excel</p>
        </div>
        <button
          onClick={() => navigate('/business/vehicles')}
          className="px-4 py-2 text-sm font-medium text-on-surface-variant border border-outline-variant rounded-xl hover:bg-surface-container transition-colors"
        >
          Quay lại
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container">
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">ID lô</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Ngày nhập</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-on-surface-variant uppercase">Tổng dòng</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-on-surface-variant uppercase">Thành công</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-on-surface-variant uppercase">Thất bại</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-on-surface-variant uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-on-surface-variant uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {imports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-on-surface-variant">
                    Chưa có lịch sử nhập xe.
                  </td>
                </tr>
              ) : (
                imports.map((item) => (
                  <tr key={item.fleetImportBatchId} className="hover:bg-surface-container transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-primary">#{item.fleetImportBatchId}</td>
                    <td className="px-4 py-3 text-sm text-on-surface">{formatDateTime(item.importedAt || item.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-center text-on-surface">{item.totalRows || 0}</td>
                    <td className="px-4 py-3 text-sm text-center text-green-600 font-medium">{item.successRows || 0}</td>
                    <td className="px-4 py-3 text-sm text-center text-red-600 font-medium">{item.failedRows || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        item.status === 'Failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {{
                          Completed: 'Hoàn thành',
                          Failed: 'Thất bại',
                          Processing: 'Đang xử lý',
                          Pending: 'Đang chờ',
                        }[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedBatch(item)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBatch && (
        <ImportDetailModal batch={selectedBatch} onClose={() => setSelectedBatch(null)} />
      )}
    </div>
  )
}
