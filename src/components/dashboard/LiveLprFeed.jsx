export default function LiveLprFeed({ detection }) {
  const { licensePlate, processingSeconds, cameraImage, lane } = detection

  return (
    <section className="soft-shadow flex min-h-0 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest lg:col-span-7 lg:h-full">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">videocam</span>
          <h3 className="font-sora text-2xl font-semibold text-on-surface">
            Live LPR Feed - Lane {lane}
          </h3>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-primary-container/20 px-3 py-1 text-sm font-medium tracking-wide text-primary-container">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary-container" />
          REC
        </span>
      </div>

      <div className="relative min-h-[280px] flex-1 bg-black lg:min-h-0">
        <img
          alt="Car entering wash lane"
          className="h-full w-full object-cover opacity-80"
          src={cameraImage}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            key={licensePlate}
            className="glass-panel relative flex h-24 w-48 flex-col items-center justify-center rounded-lg border-2 border-primary-container shadow-[0_0_15px_rgba(74,169,215,0.4)] transition-all duration-300"
          >
            <div className="absolute top-0 left-0 h-3 w-3 rounded-tl-sm border-t-4 border-l-4 border-primary-container" />
            <div className="absolute top-0 right-0 h-3 w-3 rounded-tr-sm border-t-4 border-r-4 border-primary-container" />
            <div className="absolute bottom-0 left-0 h-3 w-3 rounded-bl-sm border-b-4 border-l-4 border-primary-container" />
            <div className="absolute right-0 bottom-0 h-3 w-3 rounded-br-sm border-r-4 border-b-4 border-primary-container" />
            <span className="font-sora text-[32px] leading-10 font-bold tracking-widest text-primary-container drop-shadow-md">
              {licensePlate}
            </span>
            <div className="mt-1 flex items-center gap-1 rounded border border-outline-variant bg-surface-container-lowest/80 px-2 py-1 text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">
              <span className="material-symbols-outlined text-[12px]">speed</span>
              Xử lý: {processingSeconds}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
