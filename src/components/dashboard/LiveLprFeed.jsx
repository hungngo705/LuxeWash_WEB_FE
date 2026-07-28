import { useCallback, useEffect, useRef, useState } from 'react'
import { checkCameraHasCar, detectCameraPlate } from '../../api'

const SCAN_INTERVAL_MS = 3000
const PLATE_COOLDOWN_MS = 8000
const MAX_LOGS = 9
const CAMERA_STORAGE_KEYS = {
  entry: 'luxewash:camera:entry-device-id',
  exit: 'luxewash:camera:exit-device-id',
}

const STATUS_META = {
  booting: {
    icon: 'videocam',
    label: 'Đang mở camera',
    className: 'border-outline-variant bg-surface-variant text-on-surface-variant',
  },
  scanning: {
    icon: 'radar',
    label: 'Đang quét',
    className: 'border-primary/35 bg-primary/10 text-primary',
  },
  processing: {
    icon: 'memory',
    label: 'AI đang xử lý',
    className: 'border-tertiary/40 bg-tertiary/10 text-tertiary',
  },
  found: {
    icon: 'pin',
    label: 'Đã nhận biển số',
    className: 'border-secondary/40 bg-secondary/10 text-secondary',
  },
  checkedIn: {
    icon: 'task_alt',
    label: 'Đã check-in',
    className: 'border-primary-container/40 bg-primary-container/10 text-primary-container',
  },
  checkedOut: {
    icon: 'output_circle',
    label: 'Barie đang mở',
    className: 'border-primary-container/40 bg-primary-container/10 text-primary-container',
  },
  paused: {
    icon: 'pause_circle',
    label: 'Tạm dừng',
    className: 'border-outline-variant bg-surface-variant text-on-surface-variant',
  },
  error: {
    icon: 'warning',
    label: 'Lỗi camera/API',
    className: 'border-error/40 bg-error-container/50 text-error',
  },
}

const STATION_META = {
  entry: {
    title: 'Camera cổng vào',
    description: 'Nhận diện xe check-in và phân làn',
    icon: 'login',
    accentClass: 'text-primary',
  },
  exit: {
    title: 'Camera cổng ra',
    description: 'Hoàn thành lượt rửa và mở barie',
    icon: 'logout',
    accentClass: 'text-secondary',
  },
}

function formatLogTime(date = new Date()) {
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getErrorMessage(err, fallback = 'Yêu cầu Camera AI thất bại.') {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

function isAbortError(err) {
  return err instanceof Error && err.name === 'AbortError'
}

function formatConfidence(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  const normalized = num <= 1 ? num * 100 : num
  return `${Math.round(normalized)}%`
}

function getStoredCameraId(mode) {
  try {
    return window.localStorage.getItem(CAMERA_STORAGE_KEYS[mode]) || ''
  } catch {
    return ''
  }
}

function saveCameraId(mode, deviceId) {
  try {
    if (deviceId) window.localStorage.setItem(CAMERA_STORAGE_KEYS[mode], deviceId)
    else window.localStorage.removeItem(CAMERA_STORAGE_KEYS[mode])
  } catch {
    // Camera selection can still work for the current session.
  }
}

function CameraStation({
  mode,
  devices,
  selectedDeviceId,
  disabled,
  onDeviceChange,
  onPlateDetected,
}) {
  const stationMeta = STATION_META[mode]
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const busyRef = useRef(false)
  const scanAbortRef = useRef(null)
  const cooldownUntilRef = useRef(0)
  const scanEnabledRef = useRef(true)
  const disabledRef = useRef(disabled)

  const [cameraReady, setCameraReady] = useState(false)
  const [scanEnabled, setScanEnabled] = useState(true)
  const [status, setStatus] = useState(selectedDeviceId ? 'booting' : 'paused')
  const [busy, setBusy] = useState(false)
  const [lastPlate, setLastPlate] = useState('')
  const [confidence, setConfidence] = useState(undefined)
  const [carCount, setCarCount] = useState(0)
  const [cameraRetryKey, setCameraRetryKey] = useState(0)
  const [logs, setLogs] = useState(() => [
    {
      id: 'init',
      time: formatLogTime(),
      type: 'normal',
      message: `Đã khởi tạo ${stationMeta.title.toLowerCase()}.`,
    },
  ])

  const statusMeta = STATUS_META[status] ?? STATUS_META.scanning
  const addLog = useCallback((message, type = 'normal') => {
    setLogs((items) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        time: formatLogTime(),
        type,
        message,
      },
      ...items,
    ].slice(0, MAX_LOGS))
  }, [])

  useEffect(() => {
    scanEnabledRef.current = scanEnabled
  }, [scanEnabled])

  useEffect(() => {
    disabledRef.current = disabled
  }, [disabled])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraReady(false)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      scanAbortRef.current?.abort()
      stopCamera()

      if (!selectedDeviceId) {
        setStatus('paused')
        return
      }

      setStatus('booting')
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error')
        addLog('Trình duyệt không cho phép truy cập camera.', 'error')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }

        setCameraReady(true)
        setStatus(scanEnabledRef.current && !disabledRef.current ? 'scanning' : 'paused')
        addLog(`${stationMeta.title} đã kết nối.`)
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        addLog(`Lỗi camera: ${getErrorMessage(err)}`, 'error')
      }
    }

    startCamera()
    return () => {
      cancelled = true
      scanAbortRef.current?.abort()
      stopCamera()
    }
  }, [addLog, cameraRetryKey, selectedDeviceId, stationMeta.title, stopCamera])

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || video.readyState < 2) {
      return Promise.reject(new Error('Khung hình camera chưa sẵn sàng.'))
    }

    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return Promise.reject(new Error('Không thể đọc khung hình camera.'))

    ctx.drawImage(video, 0, 0, width, height)
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Không thể chụp khung hình camera.'))
      }, 'image/jpeg', 0.82)
    })
  }, [])

  const restoreScanningStatus = useCallback((delayMs = 2500) => {
    window.setTimeout(() => {
      if (!busyRef.current && cameraReady && scanEnabledRef.current && !disabledRef.current) {
        setStatus('scanning')
      }
    }, delayMs)
  }, [cameraReady])

  const runScan = useCallback(async () => {
    if (disabled || !scanEnabled || !cameraReady || busyRef.current) return
    if (Date.now() < cooldownUntilRef.current) return

    const controller = new AbortController()
    scanAbortRef.current = controller
    busyRef.current = true
    setBusy(true)
    setStatus('processing')

    try {
      const imageBlob = await captureFrame()
      const carResult = await checkCameraHasCar(imageBlob, {
        signal: controller.signal,
      })

      if (!carResult.hasCar) {
        setCarCount(0)
        setStatus('scanning')
        return
      }

      setCarCount(carResult.carCount)
      addLog(`Đã phát hiện xe (${carResult.carCount || 1}). Đang đọc biển số.`)

      const plateResult = await detectCameraPlate(imageBlob, {
        signal: controller.signal,
      })
      const plate = plateResult.plateText.trim().toUpperCase()

      setLastPlate(plate)
      setConfidence(plateResult.confidence)
      setStatus('found')
      addLog(`Đã đọc biển số: ${plate}`, 'success')

      const result = await onPlateDetected?.(plate, {
        operationMode: mode,
        confidence: plateResult.confidence,
        source: 'camera-ai',
      })

      if (result?.message) {
        addLog(result.message, result.type === 'error' ? 'error' : 'success')
      }

      setStatus(
        result?.status === 'needs-action'
          ? 'found'
          : mode === 'exit'
            ? 'checkedOut'
            : 'checkedIn',
      )
      cooldownUntilRef.current = Date.now() + PLATE_COOLDOWN_MS
      restoreScanningStatus()
    } catch (err) {
      if (isAbortError(err)) return
      setStatus('error')
      addLog(getErrorMessage(err), 'error')
      cooldownUntilRef.current = Date.now() + 4000
      restoreScanningStatus(4000)
    } finally {
      busyRef.current = false
      scanAbortRef.current = null
      setBusy(false)
    }
  }, [
    addLog,
    cameraReady,
    captureFrame,
    disabled,
    mode,
    onPlateDetected,
    restoreScanningStatus,
    scanEnabled,
  ])

  useEffect(() => {
    if (!cameraReady || disabled || !scanEnabled) return undefined
    const initialScanId = window.setTimeout(runScan, 0)
    const intervalId = window.setInterval(runScan, SCAN_INTERVAL_MS)
    return () => {
      window.clearTimeout(initialScanId)
      window.clearInterval(intervalId)
    }
  }, [cameraReady, disabled, runScan, scanEnabled])

  const toggleScanning = () => {
    setScanEnabled((enabled) => {
      const next = !enabled
      if (!next) {
        scanAbortRef.current?.abort()
        setStatus('paused')
        addLog('Đã tạm dừng quét.')
      } else {
        setStatus(cameraReady && !disabled ? 'scanning' : 'paused')
        addLog('Đã tiếp tục quét.')
      }
      return next
    })
  }

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`material-symbols-outlined mt-0.5 ${stationMeta.accentClass}`}>
            {stationMeta.icon}
          </span>
          <div className="min-w-0">
            <h3 className="font-sora text-base font-semibold text-on-surface">
              {stationMeta.title}
            </h3>
            <p className="text-xs text-on-surface-variant">{stationMeta.description}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${statusMeta.className}`}>
          <span className="material-symbols-outlined text-[15px]">{statusMeta.icon}</span>
          {statusMeta.label}
        </span>
      </div>

      <div className="space-y-3 p-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            Thiết bị gán cố định
          </span>
          <select
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm font-medium text-on-surface outline-none focus:border-primary"
            value={selectedDeviceId}
            onChange={(event) => onDeviceChange(event.target.value)}
          >
            <option value="">Chưa chọn camera</option>
            {devices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </label>

        <div className="relative aspect-video min-h-[220px] overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-4 text-center text-sm font-semibold text-white">
              {!selectedDeviceId
                ? 'Chọn thiết bị camera cho cổng này'
                : status === 'error'
                  ? 'Không dùng được camera'
                  : 'Đang mở camera...'}
            </div>
          )}
          <div className="pointer-events-none absolute inset-4 rounded-lg border border-primary-container/60">
            <span className="absolute left-0 top-0 h-4 w-4 border-l-4 border-t-4 border-primary-container" />
            <span className="absolute right-0 top-0 h-4 w-4 border-r-4 border-t-4 border-primary-container" />
            <span className="absolute bottom-0 left-0 h-4 w-4 border-b-4 border-l-4 border-primary-container" />
            <span className="absolute bottom-0 right-0 h-4 w-4 border-b-4 border-r-4 border-primary-container" />
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
            <div className="rounded-lg border border-white/15 bg-black/70 px-3 py-2 text-white backdrop-blur">
              <p className="text-[9px] font-semibold tracking-wider text-white/60 uppercase">Biển số gần nhất</p>
              <p className="font-sora text-2xl font-bold tracking-widest">{lastPlate || '---'}</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-black/70 px-3 py-2 text-right text-white backdrop-blur">
              <p className="text-[9px] font-semibold tracking-wider text-white/60 uppercase">Độ tin cậy</p>
              <p className="font-sora text-xl font-semibold">{formatConfidence(confidence)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-on-surface-variant">Số xe</p>
            <p className="mt-1 font-sora text-xl font-semibold text-on-surface">{carCount}</p>
          </div>
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-on-surface-variant">Chu kỳ</p>
            <p className="mt-1 font-sora text-xl font-semibold text-on-surface">{SCAN_INTERVAL_MS / 1000}s</p>
          </div>
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-on-surface-variant">Quét</p>
            <p className="mt-1 truncate text-sm font-semibold text-on-surface">
              {busy ? 'Xử lý' : scanEnabled ? 'Sẵn sàng' : 'Tạm dừng'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-variant disabled:opacity-50"
            onClick={toggleScanning}
            disabled={!selectedDeviceId || (!cameraReady && status !== 'error')}
          >
            <span className="material-symbols-outlined text-[18px]">{scanEnabled ? 'pause' : 'play_arrow'}</span>
            {scanEnabled ? 'Tạm dừng' : 'Tiếp tục'}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
            onClick={runScan}
            disabled={!cameraReady || busy || disabled || !scanEnabled}
          >
            <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
            Quét ngay
          </button>
          {status === 'error' && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-variant"
              onClick={() => setCameraRetryKey((key) => key + 1)}
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Thử lại
            </button>
          )}
        </div>
      </div>

      <div className="mx-3 mb-3 flex min-h-[250px] flex-1 flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low">
        <div className="flex shrink-0 items-center gap-2 border-b border-outline-variant px-3 py-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px]">terminal</span>
          Nhật ký quét
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-scroll p-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`rounded border px-2 py-1.5 text-xs ${
                log.type === 'error'
                  ? 'border-error/30 bg-error-container/35 text-error'
                  : log.type === 'success'
                    ? 'border-primary-container/30 bg-primary-container/10 text-on-surface'
                    : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant'
              }`}
            >
              <span className="mr-2 font-semibold text-on-surface">{log.time}</span>
              {log.message}
            </div>
          ))}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </article>
  )
}

export default function LiveLprFeed({ laneLabel, disabled = false, onPlateDetected }) {
  const [devices, setDevices] = useState([])
  const [entryDeviceId, setEntryDeviceId] = useState('')
  const [exitDeviceId, setExitDeviceId] = useState('')
  const [deviceError, setDeviceError] = useState('')

  const refreshDevices = useCallback(async ({ requestPermission = false } = {}) => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDeviceError('Trình duyệt không hỗ trợ truy cập danh sách camera.')
      return
    }

    try {
      if (requestPermission) {
        const permissionStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        })
        permissionStream.getTracks().forEach((track) => track.stop())
      }

      const mediaDevices = await navigator.mediaDevices.enumerateDevices()
      const cameras = mediaDevices.filter((device) => device.kind === 'videoinput')
      setDevices(cameras)
      setDeviceError(cameras.length ? '' : 'Không tìm thấy camera nào trên máy Staff.')

      setEntryDeviceId((current) => {
        const stored = getStoredCameraId('entry')
        const candidate = cameras.some((camera) => camera.deviceId === current)
          ? current
          : cameras.some((camera) => camera.deviceId === stored)
            ? stored
            : cameras[0]?.deviceId || ''
        return candidate
      })

      setExitDeviceId((current) => {
        const stored = getStoredCameraId('exit')
        if (cameras.some((camera) => camera.deviceId === current)) return current
        if (cameras.some((camera) => camera.deviceId === stored)) return stored
        return cameras[1]?.deviceId || ''
      })
    } catch (err) {
      setDeviceError(`Không thể truy cập camera: ${getErrorMessage(err)}`)
    }
  }, [])

  useEffect(() => {
    const initialRefreshId = window.setTimeout(
      () => refreshDevices({ requestPermission: true }),
      0,
    )
    const handleDeviceChange = () => refreshDevices()
    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange)
    return () => {
      window.clearTimeout(initialRefreshId)
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange)
    }
  }, [refreshDevices])

  useEffect(() => {
    saveCameraId('entry', entryDeviceId)
  }, [entryDeviceId])

  useEffect(() => {
    saveCameraId('exit', exitDeviceId)
  }, [exitDeviceId])

  const assignDevice = (mode, deviceId) => {
    if (mode === 'entry') {
      setEntryDeviceId(deviceId)
      if (deviceId && deviceId === exitDeviceId) setExitDeviceId(entryDeviceId)
      return
    }
    setExitDeviceId(deviceId)
    if (deviceId && deviceId === entryDeviceId) setEntryDeviceId(exitDeviceId)
  }

  const hasDuplicateAssignment = Boolean(
    entryDeviceId && exitDeviceId && entryDeviceId === exitDeviceId,
  )

  return (
    <section className="soft-shadow overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="material-symbols-outlined text-primary">linked_camera</span>
          <div className="min-w-0">
            <h2 className="font-sora text-lg font-semibold text-on-surface">Hệ thống camera cổng</h2>
            <p className="truncate text-xs font-medium text-on-surface-variant">
              {laneLabel || 'Chưa xác định chi nhánh/làn Staff'} · hai camera hoạt động độc lập
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-variant"
          onClick={() => refreshDevices({ requestPermission: true })}
        >
          <span className="material-symbols-outlined text-[17px]">cameraswitch</span>
          Làm mới thiết bị
        </button>
      </div>

      {(deviceError || hasDuplicateAssignment) && (
        <div className="m-4 mb-0 rounded-lg border border-error/40 bg-error-container/30 px-4 py-3 text-sm font-medium text-error">
          {hasDuplicateAssignment
            ? 'Camera cổng vào và cổng ra phải là hai thiết bị khác nhau.'
            : deviceError}
        </div>
      )}

      <div className="grid items-stretch gap-4 p-4 xl:grid-cols-2">
        <CameraStation
          mode="entry"
          devices={devices}
          selectedDeviceId={entryDeviceId}
          disabled={disabled || hasDuplicateAssignment}
          onDeviceChange={(deviceId) => assignDevice('entry', deviceId)}
          onPlateDetected={onPlateDetected}
        />
        <CameraStation
          mode="exit"
          devices={devices}
          selectedDeviceId={exitDeviceId}
          disabled={disabled || hasDuplicateAssignment}
          onDeviceChange={(deviceId) => assignDevice('exit', deviceId)}
          onPlateDetected={onPlateDetected}
        />
      </div>
    </section>
  )
}
