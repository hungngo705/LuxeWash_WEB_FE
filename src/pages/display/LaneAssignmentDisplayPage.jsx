import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchLatestLaneDisplayState,
  getLaneDisplayBranchId,
  isLaneDisplayEventExpired,
} from '../../api/laneDisplay.api'
import {
  getLastLaneDisplayHeartbeat,
  getLatestLaneDisplayEvent,
  publishLaneDisplayEvent,
  subscribeLaneDisplay,
} from '../../services/laneDisplayChannel'
import { subscribeLaneDisplayRealtime } from '../../services/laneDisplayRealtime'

const EVENT_TIMEOUTS = {
  reading: 12_000,
  assigned: 15_000,
  processing: 15_000,
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
  processing: {
    eyebrow: 'XE ĐÃ VÀO LÀN',
    icon: 'local_car_wash',
    title: 'ĐANG BẮT ĐẦU RỬA XE',
    message: 'Xe đã vào đúng làn. Vui lòng làm theo hướng dẫn của nhân viên',
    accent: 'text-cyan-300',
    glow: 'from-cyan-500/25 to-blue-600/10',
  },
  waiting: {
    eyebrow: 'CHƯA CÓ LÀN TRỐNG',
    icon: 'hourglass_top',
    title: 'VUI LÒNG GIỮ NGUYÊN VỊ TRÍ',
    message: 'Xe đang chờ trước barie. Nhân viên sẽ hướng dẫn khi có làn trống',
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
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [now, setNow] = useState(() => Date.now())
  const seenEventIds = useRef(new Set())

  const acceptEvent = useCallback((nextEvent, { authoritative = false, broadcast = false } = {}) => {
    if (!nextEvent) {
      if (authoritative) setEvent(null)
      return
    }

    const eventId = String(nextEvent.eventId ?? '')
    if (eventId && seenEventIds.current.has(eventId)) return
    if (eventId) {
      seenEventIds.current.add(eventId)
      if (seenEventIds.current.size > 100) {
        seenEventIds.current = new Set(Array.from(seenEventIds.current).slice(-50))
      }
    }

    setLastHeartbeat(Date.now())
    setEvent(
      nextEvent.type === 'cleared' || isLaneDisplayEventExpired(nextEvent)
        ? null
        : nextEvent,
    )

    if (broadcast) publishLaneDisplayEvent(nextEvent)
  }, [])

  useEffect(
    () =>
      subscribeLaneDisplay((message) => {
        if (!message) return
        if (message.kind === 'heartbeat') {
          setLastHeartbeat(Number(message.timestamp) || Date.now())
        }
        if (message.kind === 'event') acceptEvent(message)
      }),
    [acceptEvent],
  )

  useEffect(() => {
    const handleState = (state) => {
      setLastHeartbeat(Date.now())
      acceptEvent(state?.latestEvent, {
        authoritative: true,
        broadcast: Boolean(state?.latestEvent),
      })
    }

    const branchId = getLaneDisplayBranchId()
    const restoreLatestState = () => {
      if (!branchId) return Promise.resolve()
      return fetchLatestLaneDisplayState(branchId)
        .then(handleState)
        .catch(() => {
          // The hub also sends ReceiveInitialState; keep the local channel as fallback.
        })
    }

    const unsubscribe = subscribeLaneDisplayRealtime({
      onEvent: (nextEvent) =>
        acceptEvent(nextEvent, { authoritative: true, broadcast: true }),
      onInitialState: handleState,
      onStatusChange: ({ status }) => {
        setConnectionStatus(status)
        if (status === 'reconnecting') {
          // A protected REST call refreshes an expired JWT before the next hub retry.
          void restoreLatestState()
        }
      },
    })

    void restoreLatestState()

    return unsubscribe
  }, [acceptEvent])

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
    if (event.type === 'cleared' || isLaneDisplayEventExpired(event, now)) return null
    const timeout = EVENT_TIMEOUTS[event.type]
    const freshnessTimestamp =
      event.source === 'signalr'
        ? Number(event.receivedAt || event.timestamp || 0)
        : Number(event.timestamp || 0)
    return timeout && now - freshnessTimestamp > timeout ? null : event
  }, [event, now])

  const hasLocalFallback = Boolean(lastHeartbeat && now - lastHeartbeat <= 35_000)
  const isRealtimeConnected = connectionStatus === 'connected'
  const isDisconnected = !isRealtimeConnected && !hasLocalFallback
  const connectionLabel = isRealtimeConnected
    ? 'KẾT NỐI REALTIME'
    : hasLocalFallback
      ? 'KẾT NỐI DỰ PHÒNG'
      : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
        ? 'ĐANG KẾT NỐI LẠI'
        : 'MẤT KẾT NỐI ĐIỀU HÀNH'
  const type = visibleEvent?.type || 'idle'
  const config = VIEW_CONFIG[type] ?? VIEW_CONFIG.idle
  const plate = visibleEvent?.plate
  const laneName = visibleEvent?.laneName || (visibleEvent?.laneId ? `LÀN ${visibleEvent.laneId}` : '')
  const isAdmissionGranted = type === 'assigned'
  const barrierStatus = String(visibleEvent?.barrierStatus || '').trim().toLowerCase()
  const isBarrierPublished = isAdmissionGranted && barrierStatus === 'published'
  const isBarrierUnavailable =
    isAdmissionGranted && (barrierStatus === 'expired' || barrierStatus === 'failed')
  const barrierLabel = isBarrierPublished
    ? 'BARIE ĐANG MỞ'
    : isBarrierUnavailable
      ? 'BARIE CHƯA MỞ · CHỜ NHÂN VIÊN'
      : 'ĐANG CHỜ XÁC NHẬN BARIE'
  const barrierBadgeClass = isBarrierPublished
    ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200'
    : isBarrierUnavailable
      ? 'border-rose-300/40 bg-rose-300/10 text-rose-200'
      : 'border-amber-300/40 bg-amber-300/10 text-amber-200'
  const shouldShowLane = type === 'assigned' || type === 'processing'
  const displayMessage =
    visibleEvent?.message ||
    (isAdmissionGranted
      ? isBarrierPublished
        ? 'Barie đang mở. Vui lòng di chuyển chậm vào đúng làn được chỉ định'
        : isBarrierUnavailable
          ? 'Barie chưa mở. Vui lòng giữ nguyên vị trí và chờ nhân viên hỗ trợ'
          : 'Vui lòng giữ nguyên vị trí trong khi hệ thống xác nhận mở barie'
      : config.message)

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
              {connectionLabel}
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
          {shouldShowLane && laneName && (
            <div className="my-[clamp(1.5rem,4vh,3rem)]">
              <div className="rounded-3xl border-2 border-emerald-300/40 bg-emerald-300/10 px-[clamp(2rem,7vw,8rem)] py-[clamp(1rem,2.5vh,2rem)] text-[clamp(3.5rem,10vw,10rem)] font-black leading-none text-emerald-300 shadow-[0_0_80px_rgba(110,231,183,.18)]">
                {laneName.toUpperCase()}
              </div>
              {isAdmissionGranted && (
                <div className={`mx-auto mt-5 inline-flex items-center gap-3 rounded-full border px-6 py-3 text-[clamp(1rem,1.8vw,1.5rem)] font-bold tracking-wider ${barrierBadgeClass}`}>
                  <span className="material-symbols-outlined text-3xl">garage_door</span>
                  {barrierLabel}
                </div>
              )}
            </div>
          )}
          <p className="mt-6 max-w-5xl text-[clamp(1.25rem,2.5vw,2.25rem)] font-medium leading-relaxed text-slate-300">
            {displayMessage}
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
