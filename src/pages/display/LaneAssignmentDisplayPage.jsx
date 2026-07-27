import { useEffect, useMemo, useState } from 'react'
import {
  getLastLaneDisplayHeartbeat,
  getLatestLaneDisplayEvent,
  subscribeLaneDisplay,
} from '../../services/laneDisplayChannel'

const EVENT_TIMEOUTS = {
  reading: 12_000,
  assigned: 15_000,
  waiting: 20_000,
  payment: 20_000,
  assistance: 20_000,
  error: 20_000,
}

const VIEW_CONFIG = {
  idle: {
    eyebrow: 'LUXEWASH · CỔNG VÀO',
    icon: 'directions_car',
    title: 'SẴN SÀNG ĐÓN XE',
    message: 'Vui lòng di chuyển chậm qua khu vực nhận diện biển số',
    accent: 'text-cyan-300',
    glow: 'from-cyan-500/20 to-blue-600/10',
  },
  reading: {
    eyebrow: 'ĐANG NHẬN DIỆN',
    icon: 'document_scanner',
    title: 'VUI LÒNG CHỜ',
    message: 'Hệ thống đang kiểm tra thông tin xe',
    accent: 'text-cyan-300',
    glow: 'from-cyan-500/25 to-blue-600/10',
  },
  assigned: {
    eyebrow: 'ĐÃ PHÂN LÀN',
    icon: 'garage',
    title: 'VUI LÒNG DI CHUYỂN ĐẾN',
    message: 'Đi chậm và làm theo hướng dẫn tại khu vực rửa',
    accent: 'text-emerald-300',
    glow: 'from-emerald-500/30 to-cyan-500/10',
  },
  waiting: {
    eyebrow: 'ĐÃ TIẾP NHẬN XE',
    icon: 'hourglass_top',
    title: 'VUI LÒNG ĐỖ TẠI KHU VỰC CHỜ',
    message: 'Làn rửa sẽ được hiển thị ngay khi sẵn sàng',
    accent: 'text-amber-300',
    glow: 'from-amber-500/25 to-orange-600/10',
  },
  payment: {
    eyebrow: 'ĐÃ TIẾP NHẬN XE',
    icon: 'payments',
    title: 'ĐANG CHỜ XÁC NHẬN THANH TOÁN',
    message: 'Vui lòng làm theo hướng dẫn của nhân viên',
    accent: 'text-amber-300',
    glow: 'from-amber-500/25 to-orange-600/10',
  },
  assistance: {
    eyebrow: 'ĐÃ NHẬN DIỆN BIỂN SỐ',
    icon: 'support_agent',
    title: 'VUI LÒNG ĐẾN KHU VỰC TIẾP NHẬN',
    message: 'Nhân viên sẽ hỗ trợ tạo lượt rửa cho quý khách',
    accent: 'text-sky-300',
    glow: 'from-sky-500/25 to-indigo-600/10',
  },
  error: {
    eyebrow: 'CẦN NHÂN VIÊN HỖ TRỢ',
    icon: 'support_agent',
    title: 'VUI LÒNG DỪNG XE VÀ CHỜ HƯỚNG DẪN',
    message: 'Nhân viên đang kiểm tra thông tin cho quý khách',
    accent: 'text-rose-300',
    glow: 'from-rose-500/25 to-orange-600/10',
  },
}

export default function LaneAssignmentDisplayPage() {
  const [event, setEvent] = useState(() => getLatestLaneDisplayEvent())
  const [lastHeartbeat, setLastHeartbeat] = useState(() => getLastLaneDisplayHeartbeat())
  const [now, setNow] = useState(0)

  useEffect(() => subscribeLaneDisplay((message) => {
    if (!message) return
    if (message.kind === 'heartbeat') setLastHeartbeat(Number(message.timestamp) || Date.now())
    if (message.kind === 'event') {
      setLastHeartbeat(Number(message.timestamp) || Date.now())
      setEvent(message)
    }
  }), [])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let wakeLock
    const requestWakeLock = async () => {
      try {
        wakeLock = await navigator.wakeLock?.request('screen')
      } catch {
        // Wake Lock is optional and may require fullscreen/user interaction.
      }
    }
    requestWakeLock()
    document.addEventListener('visibilitychange', requestWakeLock)
    return () => {
      document.removeEventListener('visibilitychange', requestWakeLock)
      wakeLock?.release?.()
    }
  }, [])

  const visibleEvent = useMemo(() => {
    if (!event) return null
    const timeout = EVENT_TIMEOUTS[event.type]
    return timeout && now - Number(event.timestamp || 0) > timeout ? null : event
  }, [event, now])

  const isDisconnected = !lastHeartbeat || now - lastHeartbeat > 35_000
  const type = visibleEvent?.type || 'idle'
  const config = VIEW_CONFIG[type] ?? VIEW_CONFIG.idle
  const plate = visibleEvent?.plate
  const laneName = visibleEvent?.laneName || (visibleEvent?.laneId ? `LÀN ${visibleEvent.laneId}` : '')

  const enterFullscreen = () => document.documentElement.requestFullscreen?.()

  return (
    <main className="relative flex min-h-screen min-h-[100dvh] w-full overflow-hidden bg-[#06111d] text-white">
      <div className={`absolute inset-0 bg-gradient-to-br ${config.glow}`} />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative z-10 flex min-h-screen min-h-[100dvh] w-full flex-col px-[clamp(1.5rem,5vw,6rem)] py-[clamp(1.5rem,4vh,3rem)]">
        <header className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10">
              <span className="material-symbols-outlined text-3xl text-cyan-200">local_car_wash</span>
            </div>
            <div>
              <p className="text-xl font-black tracking-[0.24em]">LUXEWASH</p>
              <p className="text-sm font-medium tracking-[0.2em] text-slate-400">HỆ THỐNG PHÂN LÀN TỰ ĐỘNG</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${isDisconnected ? 'bg-rose-400' : 'animate-pulse bg-emerald-400'}`} />
            <span className="hidden text-sm font-semibold tracking-wider text-slate-300 sm:block">
              {isDisconnected ? 'MẤT KẾT NỐI ĐIỀU HÀNH' : 'HỆ THỐNG SẴN SÀNG'}
            </span>
            <button
              type="button"
              onClick={enterFullscreen}
              className="ml-3 rounded-xl border border-white/15 bg-white/5 p-3 text-slate-200 transition hover:bg-white/10"
              title="Toàn màn hình"
            >
              <span className="material-symbols-outlined">fullscreen</span>
            </button>
          </div>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <p className={`mb-5 text-[clamp(1rem,2vw,1.75rem)] font-bold tracking-[0.25em] ${config.accent}`}>
            {config.eyebrow}
          </p>
          {plate && (
            <div className="mb-[clamp(1.5rem,4vh,3rem)] rounded-2xl border-2 border-white/20 bg-white/10 px-[clamp(2rem,5vw,5rem)] py-3 font-mono text-[clamp(2.5rem,7vw,6.5rem)] font-black leading-none tracking-[0.12em] shadow-2xl backdrop-blur">
              {plate}
            </div>
          )}

          <span className={`material-symbols-outlined mb-5 text-[clamp(4rem,8vw,8rem)] ${config.accent}`}>
            {config.icon}
          </span>
          <h1 className="max-w-6xl text-[clamp(2.25rem,5.7vw,6.5rem)] font-black leading-[1.05] tracking-tight">
            {visibleEvent?.title || config.title}
          </h1>
          {type === 'assigned' && laneName && (
            <div className="my-[clamp(1.5rem,4vh,3rem)] rounded-3xl border-2 border-emerald-300/40 bg-emerald-300/10 px-[clamp(2rem,7vw,8rem)] py-[clamp(1rem,2.5vh,2rem)] text-[clamp(3.5rem,10vw,10rem)] font-black leading-none text-emerald-300 shadow-[0_0_80px_rgba(110,231,183,.18)]">
              {laneName.toUpperCase()}
            </div>
          )}
          <p className="mt-6 max-w-5xl text-[clamp(1.25rem,2.5vw,2.25rem)] font-medium leading-relaxed text-slate-300">
            {visibleEvent?.message || config.message}
          </p>
        </section>

        <footer className="flex items-end justify-between gap-4 text-sm text-slate-500">
          <p>Vui lòng tuân theo hướng dẫn của nhân viên tại khu vực tiếp nhận</p>
          <time className="font-mono text-lg text-slate-400">
            {now
              ? new Date(now).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              : '--:--'}
          </time>
        </footer>
      </div>
    </main>
  )
}
