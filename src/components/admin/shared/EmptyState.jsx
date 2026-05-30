export default function EmptyState({ icon = 'inbox', title = 'Không có dữ liệu', message }) {
  return (
    <div className="glass-panel soft-shadow flex flex-col items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest px-6 py-16 text-center">
      <span className="material-symbols-outlined mb-4 text-5xl text-on-surface-variant/50">
        {icon}
      </span>
      <p className="font-sora text-lg font-semibold text-on-surface">{title}</p>
      {message && <p className="mt-2 max-w-md text-sm text-on-surface-variant">{message}</p>}
    </div>
  )
}
