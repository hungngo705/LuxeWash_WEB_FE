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
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile)
      setError('')
    } else {
      setError('Vui lòng chọn file Excel (.xlsx hoặc .xls).')
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
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
      setResult(data)
    } catch (err) {
      setError(err.message || 'Nhập file thất bại. Vui lòng kiểm tra lại định dạng.')
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
            <p className="text-xs text-on-surface-variant mt-0.5">Định dạng: .xlsx hoặc .xls</p>
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
              accept=".xlsx,.xls"
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

          {result && (
            <div className={`rounded-xl p-5 border ${
              result.failedRows === 0
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`material-symbols-outlined ${
                  result.failedRows === 0 ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {result.failedRows === 0 ? 'check_circle' : 'warning'}
                </span>
                <h4 className={`font-medium ${
                  result.failedRows === 0 ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {result.failedRows === 0 ? 'Nhập thành công!' : 'Nhập hoàn tất (có lỗi)'}
                </h4>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-on-surface">{result.totalRows}</p>
                  <p className="text-xs text-on-surface-variant">Tổng dòng</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{result.successRows}</p>
                  <p className="text-xs text-on-surface-variant">Thành công</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{result.failedRows}</p>
                  <p className="text-xs text-on-surface-variant">Thất bại</p>
                </div>
              </div>
            </div>
          )}

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
