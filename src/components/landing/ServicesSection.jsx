import CatalogState from './CatalogState'

export default function ServicesSection({ services, loading, error, onRetry }) {
  return (
    <section id="services" className="scroll-mt-20 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="font-sora text-3xl font-bold text-on-surface">Dịch vụ đang hoạt động</h2>
          <p className="mt-3 text-on-surface-variant">Danh mục được tải trực tiếp từ hệ thống LuxeWash.</p>
        </div>
        {loading || error || !services.length ? (
          <CatalogState loading={loading} error={error} onRetry={onRetry} empty="Hệ thống chưa có dịch vụ đang hoạt động." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article key={service.id} className="rounded-2xl border border-outline-variant bg-white p-6">
                <span aria-hidden="true" className="material-symbols-outlined mb-4 rounded-xl bg-primary/10 p-3 text-primary">local_car_wash</span>
                <h3 className="break-words font-sora text-lg font-semibold text-on-surface">{service.name}</h3>
                {service.description && <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-on-surface-variant">{service.description}</p>}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
