import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchFleetTemplate, importFleet } from '../../api/business.api'

export default function BusinessImportPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  const handleDownloadTemplate = async () => {
    try {
      const data = await fetchFleetTemplate()
      const url = data?.downloadUrl
      if (!url) {
        throw new Error('missing downloadUrl')
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      setError('Không thể tải template. Vui lòng thử lại.')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.toLowerCase().endsWith('.xlsx')) {
      setFile(droppedFile)
      setError('')
      setResult(null)
    } else {
      setError('Vui lòng chọn file Excel .xlsx tải từ hệ thống.')
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.xlsx')) {
        setFile(null)
        setResult(null)
        setError('Vui lòng chọn file Excel .xlsx tải từ hệ thống.')
        e.target.value = ''
        return
      }
      setFile(selectedFile)
      setError('')
      setResult(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Vui lòng chọn file Excel để nhập.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const data = await importFleet(formData)
      if (!data || Number(data.totalRows) === 0) {
        setError('File Excel chưa có dòng xe nào. Hãy nhập dữ liệu từ dòng 2, lưu file, đóng Excel rồi chọn lại file.')
        return
      }
      setResult(data)
    } catch (err) {
      setError(err?.message || 'Nhập file thất bại. Vui lòng kiểm tra lại định dạng và dữ liệu trong file.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-sora text-lg font-semibold text-on-surface">Nhập danh sách xe từ Excel</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Tải template, điền thông tin xe và nhập danh sách vào hệ thống.
        </p>
        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex items-start gap-2">
          <span className="material-symbols-outlined text-base mt-0.5">info</span>
          <p>
            Xe có <span className="font-medium">hãng / dòng / loại phương tiện</span> đã tồn tại và
            đang hoạt động trong hệ thống sẽ được <span className="font-medium">tự động duyệt</span> ngay
            khi nhập. Chỉ xe có <span className="font-medium">hãng / dòng / loại</span> mới hoàn toàn
            mới cần Admin duyệt thủ công.
          </p>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-on-surface">File mẫu nhập xe</p>
            <p className="text-xs text-on-surface-variant mt-0.5">Định dạng: .xlsx</p>
            <p className="text-xs text-on-surface-variant mt-1">
              Hãy lưu và đóng file Excel trước khi chọn file để hệ thống nhận dữ liệu mới nhất.
            </p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-xl hover:bg-primary/5 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Tải template
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
              dragging
                ? 'border-primary bg-primary/5'
                : 'border-outline-variant hover:border-primary/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <span className="material-symbols-outlined text-3xl text-primary">description</span>
                <div className="text-left">
                  <p className="text-sm font-medium text-on-surface">{file.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="ml-4 p-1 text-on-surface-variant hover:text-red-500"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            ) : (
              <>
                <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2 block">upload_file</span>
                <p className="text-sm text-on-surface mb-1">Kéo thả file Excel vào đây</p>
                <p className="text-xs text-on-surface-variant mb-4">hoặc</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-xl hover:bg-primary/5 transition-colors"
                >
                  Chọn file
                </button>
              </>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-red-600">error</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {result && (() => {
            const failed = result.status === 'Failed' || Number(result.successRows) === 0
            const partial = !failed && Number(result.failedRows) > 0
            const errors = Array.isArray(result.errors) ? result.errors : []
            const importedVehicles = Array.isArray(result.vehicles) ? result.vehicles : []
            const pendingVehicles = importedVehicles.filter(
              (vehicle) => vehicle.status === 'PendingApproval',
            )
            const pendingRows = Number(result.pendingApprovalRows ?? pendingVehicles.length)
            const approvedRows = Number(
              result.approvedRows ?? Math.max(0, Number(result.successRows) - pendingRows),
            )
            const palette = failed
              ? {
                  container: 'bg-red-50 border-red-200',
                  icon: 'text-red-600',
                  title: 'text-red-800',
                }
              : partial || pendingRows > 0
                ? {
                    container: 'bg-yellow-50 border-yellow-200',
                    icon: 'text-yellow-600',
                    title: 'text-yellow-800',
                  }
                : {
                    container: 'bg-green-50 border-green-200',
                    icon: 'text-green-600',
                    title: 'text-green-800',
                  }
            const title = failed
              ? 'Nhập danh sách xe thất bại'
              : partial
                ? 'Đã nhập xe nhưng có một số dòng bị lỗi'
                : pendingRows > 0
                  ? `Đã nhập danh sách — ${pendingRows} xe đang chờ duyệt`
                  : 'Nhập danh sách xe thành công!'
            return (
            <div className={`rounded-xl p-5 border ${palette.container}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`material-symbols-outlined ${palette.icon}`}>
                  {failed ? 'error' : partial || pendingRows > 0 ? 'warning' : 'check_circle'}
                </span>
                <h4 className={`font-medium ${palette.title}`}>
                  {title}
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-on-surface">{result.totalRows}</p>
                  <p className="text-xs text-on-surface-variant">Tổng dòng</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{approvedRows}</p>
                  <p className="text-xs text-on-surface-variant">Đã duyệt</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{pendingRows}</p>
                  <p className="text-xs text-on-surface-variant">Chờ duyệt</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{result.failedRows}</p>
                  <p className="text-xs text-on-surface-variant">Thất bại</p>
                </div>
              </div>
              {pendingRows > 0 && (
                <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-amber-600">pending_actions</span>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Xe đang chờ Admin duyệt
                      </p>
                      <p className="mt-0.5 text-xs text-amber-800">
                        Các xe này chưa thể đặt lịch cho đến khi được duyệt.
                      </p>
                      {pendingVehicles.length > 0 && (
                        <ul className="mt-2 space-y-1 text-sm text-amber-900">
                          {pendingVehicles.map((vehicle, index) => (
                            <li key={`${vehicle.licensePlate}-${vehicle.rowNumber}-${index}`}>
                              Dòng {vehicle.rowNumber}: <strong>{vehicle.licensePlate}</strong> — Chờ duyệt
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {errors.length > 0 && (
                <div className="mt-4 border-t border-current/15 pt-3">
                  <p className="mb-2 text-sm font-medium text-on-surface">Chi tiết lỗi</p>
                  <ul className="space-y-1 text-sm text-red-700">
                    {errors.slice(0, 20).map((item, index) => (
                      <li key={`${item.rowNumber}-${index}`}>
                        Dòng {item.rowNumber}: {item.errorMessage}
                      </li>
                    ))}
                  </ul>
                  {errors.length > 20 && (
                    <p className="mt-2 text-xs text-on-surface-variant">
                      Còn {errors.length - 20} lỗi khác. Vui lòng kiểm tra lịch sử nhập xe.
                    </p>
                  )}
                </div>
              )}
            </div>
            )
          })()}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!file || loading}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  Đang nhập...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">upload</span>
                  Nhập danh sách xe
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/business/vehicles')}
              className="px-6 py-2.5 text-sm font-medium text-on-surface-variant border border-outline-variant rounded-xl hover:bg-surface-container transition-colors"
            >
              Quay lại
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
