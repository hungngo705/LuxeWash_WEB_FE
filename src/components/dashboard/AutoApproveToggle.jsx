export default function AutoApproveToggle({ enabled, onChange }) {
  return (
    <div className="glass-panel soft-shadow flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary">bolt</span>
        <span className="font-label-bold text-[14px] font-medium tracking-wider text-on-surface uppercase">
          Tự động duyệt
        </span>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          checked={enabled}
          className="peer sr-only"
          type="checkbox"
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="peer h-6 w-11 rounded-full bg-surface-variant shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] peer-checked:bg-primary peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-surface-container-lowest after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white" />
      </label>
    </div>
  )
}
