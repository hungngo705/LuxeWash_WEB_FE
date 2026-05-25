export default function PlaceholderPage({ title, description }) {
  return (
    <div className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
      <span className="material-symbols-outlined mb-4 text-5xl text-primary">construction</span>
      <h2 className="font-sora text-2xl font-semibold text-on-surface">{title}</h2>
      <p className="mt-3 text-on-surface-variant">{description}</p>
    </div>
  )
}
