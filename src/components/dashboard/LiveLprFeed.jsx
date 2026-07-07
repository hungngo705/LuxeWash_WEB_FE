import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CAMERA_AI_BASE_URL, checkCameraHasCar, detectCameraPlate } from '../../api'

const SCAN_INTERVAL_MS = 3000
const PLATE_COOLDOWN_MS = 8000
const MAX_LOGS = 9

const STATUS_META = {
  booting: {
    icon: 'videocam',
    label: 'Starting camera',
    className: 'border-outline-variant bg-surface-variant text-on-surface-variant',
  },
  scanning: {
    icon: 'radar',
    label: 'Scanning',
    className: 'border-primary/35 bg-primary/10 text-primary',
  },
  processing: {
    icon: 'memory',
    label: 'AI processing',
    className: 'border-tertiary/40 bg-tertiary/10 text-tertiary',
  },
  found: {
    icon: 'pin',
    label: 'Plate detected',
    className: 'border-secondary/40 bg-secondary/10 text-secondary',
  },
  checkedIn: {
    icon: 'task_alt',
    label: 'Check-in complete',
    className: 'border-primary-container/40 bg-primary-container/10 text-primary-container',
  },
  paused: {
    icon: 'pause_circle',
    label: 'Paused',
    className: 'border-outline-variant bg-surface-variant text-on-surface-variant',
  },
  error: {
    icon: 'warning',
    label: 'Camera/API error',
    className: 'border-error/40 bg-error-container/50 text-error',
  },
}

function formatLogTime(date = new Date()) {
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getErrorMessage(err, fallback = 'Camera AI request failed.') {
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

export default function LiveLprFeed({
  laneLabel,
  disabled = false,
  onPlateDetected,
}) {
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
  const [status, setStatus] = useState('booting')
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
      message: 'Camera AI feed initialized.',
    },
  ])

  const statusMeta = STATUS_META[status] ?? STATUS_META.scanning
  const aiHostLabel = useMemo(() => {
    try {
      return new URL(CAMERA_AI_BASE_URL).host
    } catch {
      return CAMERA_AI_BASE_URL
    }
  }, [])

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
    setCameraReady(false)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      stopCamera()
      setStatus('booting')

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error')
        addLog('This browser does not expose camera access.', 'error')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
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
        addLog('Camera connected.')
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        addLog(`Camera error: ${getErrorMessage(err)}`, 'error')
      }
    }

    startCamera()

    return () => {
      cancelled = true
      scanAbortRef.current?.abort()
      stopCamera()
    }
  }, [addLog, cameraRetryKey, stopCamera])

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || video.readyState < 2) {
      return Promise.reject(new Error('Camera frame is not ready.'))
    }

    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return Promise.reject(new Error('Cannot read camera canvas.'))

    ctx.drawImage(video, 0, 0, width, height)

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Cannot capture camera frame.'))
      }, 'image/jpeg', 0.82)
    })
  }, [])

  const restoreScanningStatus = useCallback((delayMs = 2500) => {
    window.setTimeout(() => {
      if (!busyRef.current && cameraReady && scanEnabled && !disabled) {
        setStatus('scanning')
      }
    }, delayMs)
  }, [cameraReady, disabled, scanEnabled])

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
      addLog(`Vehicle detected (${carResult.carCount || 1}). OCR running.`)

      const plateResult = await detectCameraPlate(imageBlob, {
        signal: controller.signal,
      })
      const plate = plateResult.plateText.trim().toUpperCase()

      setLastPlate(plate)
      setConfidence(plateResult.confidence)
      setStatus('found')
      addLog(`Plate read: ${plate}`, 'success')

      const result = await onPlateDetected?.(plate, {
        confidence: plateResult.confidence,
        source: 'camera-ai',
      })

      if (result?.message) {
        addLog(result.message, result.type === 'error' ? 'error' : 'success')
      }

      setStatus(result?.status === 'needs-action' ? 'found' : 'checkedIn')
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
        addLog('Scanning paused.')
      } else {
        setStatus(cameraReady && !disabled ? 'scanning' : 'paused')
        addLog('Scanning resumed.')
      }
      return next
    })
  }

  const retryCamera = () => {
    setCameraRetryKey((key) => key + 1)
  }

  return (
    <section className="soft-shadow overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="material-symbols-outlined text-primary">linked_camera</span>
          <div className="min-w-0">
            <h2 className="font-sora text-lg font-semibold text-on-surface">
              Camera AI Live View
            </h2>
            <p className="truncate text-xs font-medium text-on-surface-variant">
              {laneLabel || 'No lane assigned'} · AI {aiHostLabel}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase ${statusMeta.className}`}
        >
          <span className="material-symbols-outlined text-[16px]">{statusMeta.icon}</span>
          {statusMeta.label}
        </span>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.85fr)]">
        <div className="relative aspect-video min-h-[260px] overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />

          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-sm font-semibold text-white">
              {status === 'error' ? 'Camera unavailable' : 'Opening camera...'}
            </div>
          )}

          <div className="pointer-events-none absolute inset-5 rounded-lg border border-primary-container/60 shadow-[0_0_18px_rgba(74,169,215,0.2)]">
            <span className="absolute top-0 left-0 h-5 w-5 border-t-4 border-l-4 border-primary-container" />
            <span className="absolute top-0 right-0 h-5 w-5 border-t-4 border-r-4 border-primary-container" />
            <span className="absolute bottom-0 left-0 h-5 w-5 border-b-4 border-l-4 border-primary-container" />
            <span className="absolute right-0 bottom-0 h-5 w-5 border-r-4 border-b-4 border-primary-container" />
          </div>

          <div className="absolute right-4 bottom-4 left-4 flex flex-wrap items-end justify-between gap-3">
            <div className="rounded-lg border border-white/15 bg-black/70 px-3 py-2 text-white backdrop-blur">
              <p className="text-[10px] font-semibold tracking-wider text-white/60 uppercase">
                Last plate
              </p>
              <p className="font-sora text-3xl font-bold tracking-widest">
                {lastPlate || '---'}
              </p>
            </div>
            <div className="rounded-lg border border-white/15 bg-black/70 px-3 py-2 text-right text-white backdrop-blur">
              <p className="text-[10px] font-semibold tracking-wider text-white/60 uppercase">
                Confidence
              </p>
              <p className="font-sora text-2xl font-semibold">
                {formatConfidence(confidence)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-[260px] flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <p className="text-[10px] font-semibold tracking-wide text-on-surface-variant uppercase">
                Cars
              </p>
              <p className="mt-1 font-sora text-2xl font-semibold text-on-surface">
                {carCount}
              </p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <p className="text-[10px] font-semibold tracking-wide text-on-surface-variant uppercase">
                Cadence
              </p>
              <p className="mt-1 font-sora text-2xl font-semibold text-on-surface">
                {SCAN_INTERVAL_MS / 1000}s
              </p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <p className="text-[10px] font-semibold tracking-wide text-on-surface-variant uppercase">
                State
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-on-surface">
                {busy ? 'Busy' : scanEnabled ? 'Ready' : 'Paused'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              title={scanEnabled ? 'Pause scan' : 'Resume scan'}
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-variant disabled:opacity-50"
              onClick={toggleScanning}
              disabled={!cameraReady && status !== 'error'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {scanEnabled ? 'pause' : 'play_arrow'}
              </span>
              {scanEnabled ? 'Pause' : 'Resume'}
            </button>
            <button
              type="button"
              title="Scan now"
              className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
              onClick={runScan}
              disabled={!cameraReady || busy || disabled || !scanEnabled}
            >
              <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
              Scan
            </button>
            {status === 'error' && (
              <button
                type="button"
                title="Retry camera"
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-variant"
                onClick={retryCamera}
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Retry
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low">
            <div className="flex items-center gap-2 border-b border-outline-variant px-3 py-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">terminal</span>
              Scan log
            </div>
            <div className="max-h-[190px] space-y-1 overflow-y-auto p-3">
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
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </section>
  )
}
