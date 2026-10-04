export default function CatalogState({ loading, error, empty, onRetry }) {
  if (loading) return <p role="status" className="rounded-xl border border-outline-variant bg-white p-6 text-center text-on-surface-variant">Đang tải dữ liệu từ hệ thống…</p>
  if (error) return (
    <div role="alert" className="rounded-xl border border-error/30 bg-white p-6 text-center">
      <p className="text-error">{error}</p>
      <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-outline-variant px-4 py-2 font-medium text-primary">Thử lại</button>
    </div>
  )
  return <p className="rounded-xl border border-outline-variant bg-white p-6 text-center text-on-surface-variant">{empty}</p>
}
