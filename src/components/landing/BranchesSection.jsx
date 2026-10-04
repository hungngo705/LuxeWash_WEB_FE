import CatalogState from './CatalogState'

export default function BranchesSection({ branches, loading, error, onRetry }) {
  return (
    <section id="branches" className="scroll-mt-20 bg-surface-container-low py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center"><h2 className="font-sora text-3xl font-bold text-on-surface">Chi nhánh đang hoạt động</h2><p className="mt-3 text-on-surface-variant">Tên và địa chỉ theo dữ liệu của hệ thống.</p></div>
        {loading || error || !branches.length ? <CatalogState loading={loading} error={error} onRetry={onRetry} empty="Hiện chưa có chi nhánh đang hoạt động." /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => (
              <article key={branch.id} className="rounded-2xl border border-outline-variant bg-white p-6">
                <span aria-hidden="true" className="material-symbols-outlined mb-4 rounded-xl bg-primary/10 p-3 text-primary">storefront</span>
                <h3 className="break-words font-sora text-lg font-semibold text-on-surface">{branch.name}</h3>
                {branch.address && <p className="mt-3 break-words text-sm leading-relaxed text-on-surface-variant">{branch.address}</p>}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
