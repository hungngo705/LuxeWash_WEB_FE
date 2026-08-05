import { useCallback, useEffect, useRef, useState } from 'react'
import {
  checkCameraHasCar,
  detectCameraPlate,
  recognizeCameraVehicle,
} from '../../api'

const SCAN_INTERVAL_MS = 3000
const PLATE_COOLDOWN_MS = 8000
const MAX_LOGS = 9
const MIN_REGION_ZOOM = 1
const MAX_REGION_ZOOM = 4
const REGION_ZOOM_STEP = 0.25
const CAMERA_STORAGE_KEYS = {
  entry: 'luxewash:camera:entry-device-id',
  exit: 'luxewash:camera:exit-device-id',
  entryLeftIsVip: 'luxewash:camera:entry-left-is-vip',
  activeMode: 'luxewash:camera:active-gate',
}

function createInitialRegionViews() {
  return {
    left: { zoom: MIN_REGION_ZOOM, panX: 0, panY: 0 },
    right: { zoom: MIN_REGION_ZOOM, panX: 0, panY: 0 },
    full: { zoom: MIN_REGION_ZOOM, panX: 0, panY: 0 },
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
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

function getStoredActiveMode() {
  try {
    return window.localStorage.getItem(CAMERA_STORAGE_KEYS.activeMode) === 'exit'
      ? 'exit'
      : 'entry'
  } catch {
    return 'entry'
  }
}

function getStoredLeftLaneIsVip() {
  try {
    return window.localStorage.getItem(CAMERA_STORAGE_KEYS.entryLeftIsVip) === 'true'
  } catch {
    return false
  }
}

function saveLeftLaneIsVip(isVip) {
  try {
    window.localStorage.setItem(CAMERA_STORAGE_KEYS.entryLeftIsVip, String(isVip))
  } catch {
    // Lane layout still works for the current session.
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
  const previewVideoRefs = useRef({ left: null, right: null })
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const dragRef = useRef(null)
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
  const [leftLaneIsVip, setLeftLaneIsVip] = useState(getStoredLeftLaneIsVip)
  const [regionViews, setRegionViews] = useState(createInitialRegionViews)
  const regionViewsRef = useRef(regionViews)
  const [draggingRegion, setDraggingRegion] = useState(null)
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

  useEffect(() => {
    if (mode === 'entry') saveLeftLaneIsVip(leftLaneIsVip)
  }, [leftLaneIsVip, mode])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    const videoElements = [videoRef.current, ...Object.values(previewVideoRefs.current)]
    videoElements.forEach((video) => {
      if (video) video.srcObject = null
    })
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
        const videoElements = [videoRef.current, ...Object.values(previewVideoRefs.current)]
          .filter(Boolean)
        await Promise.all(videoElements.map(async (video) => {
          video.srcObject = stream
          await video.play().catch(() => undefined)
        }))

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

  const captureFrame = useCallback((region = 'full') => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || video.readyState < 2) {
      return Promise.reject(new Error('Khung hình camera chưa sẵn sàng.'))
    }

    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    const sourceWidth = region === 'full' ? width : Math.floor(width / 2)
    const baseSourceX = region === 'right' ? width - sourceWidth : 0
    const view = regionViewsRef.current[region]
    const cropWidth = sourceWidth / view.zoom
    const cropHeight = height / view.zoom
    const sourceX = baseSourceX + ((sourceWidth - cropWidth) * (view.panX + 1)) / 2
    const sourceY = ((height - cropHeight) * (view.panY + 1)) / 2
    canvas.width = sourceWidth
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return Promise.reject(new Error('Không thể đọc khung hình camera.'))

    ctx.drawImage(
      video,
      sourceX,
      sourceY,
      cropWidth,
      cropHeight,
      0,
      0,
      sourceWidth,
      height,
    )
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Không thể chụp khung hình camera.'))
      }, 'image/jpeg', 0.82)
    })
  }, [])

  const updateRegionView = useCallback((region, updater) => {
    setRegionViews((currentViews) => {
      const currentView = currentViews[region]
      const nextView = typeof updater === 'function' ? updater(currentView) : updater
      const nextViews = { ...currentViews, [region]: nextView }
      regionViewsRef.current = nextViews
      return nextViews
    })
  }, [])

  const changeRegionZoom = useCallback((region, delta) => {
    updateRegionView(region, (currentView) => {
      const zoom = clamp(
        Math.round((currentView.zoom + delta) * 100) / 100,
        MIN_REGION_ZOOM,
        MAX_REGION_ZOOM,
      )
      return {
        zoom,
        panX: zoom === MIN_REGION_ZOOM ? 0 : currentView.panX,
        panY: zoom === MIN_REGION_ZOOM ? 0 : currentView.panY,
      }
    })
  }, [updateRegionView])

  const resetRegionView = useCallback((region) => {
    updateRegionView(region, { zoom: MIN_REGION_ZOOM, panX: 0, panY: 0 })
  }, [updateRegionView])

  const handleRegionPointerDown = useCallback((event, region) => {
    const view = regionViewsRef.current[region]
    if (view.zoom <= MIN_REGION_ZOOM || event.button !== 0) return

    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      region,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: view.panX,
      startPanY: view.panY,
      width: rect.width,
      height: rect.height,
      zoom: view.zoom,
    }
    setDraggingRegion(region)
    event.preventDefault()
  }, [])

  const handleRegionPointerMove = useCallback((event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const maxOffsetX = Math.max(1, (drag.width * (drag.zoom - 1)) / 2)
    const maxOffsetY = Math.max(1, (drag.height * (drag.zoom - 1)) / 2)
    const panX = clamp(drag.startPanX - (event.clientX - drag.startX) / maxOffsetX, -1, 1)
    const panY = clamp(drag.startPanY - (event.clientY - drag.startY) / maxOffsetY, -1, 1)
    updateRegionView(drag.region, (currentView) => ({ ...currentView, panX, panY }))
    event.preventDefault()
  }, [updateRegionView])

  const handleRegionPointerEnd = useCallback((event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDraggingRegion(null)
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
      const scanTargets =
        mode === 'entry'
          ? [
              {
                region: 'left',
                queueLaneSide: 'left',
                queueLaneType: leftLaneIsVip ? 'vip' : 'regular',
              },
              {
                region: 'right',
                queueLaneSide: 'right',
                queueLaneType: leftLaneIsVip ? 'regular' : 'vip',
              },
            ]
          : [
              {
                region: 'full',
                queueLaneSide: null,
                queueLaneType: null,
              },
            ]

      let detectedCarCount = 0
      let unreadableLaneCount = 0
      const detections = []
      const seenPlates = new Set()

      for (const target of scanTargets) {
        const imageBlob = await captureFrame(target.region)
        const carResult = await checkCameraHasCar(imageBlob, {
          signal: controller.signal,
        })

        if (!carResult.hasCar) continue

        detectedCarCount += carResult.carCount || 1
        const queueLaneLabel =
          target.queueLaneType === 'vip'
            ? 'làn VIP'
            : target.queueLaneType === 'regular'
              ? 'làn thường'
              : 'cổng ra'
        addLog(
          `Đã phát hiện xe tại ${queueLaneLabel} (${carResult.carCount || 1}). Đang đọc biển số.`,
        )

        let plateResult
        try {
          plateResult = await detectCameraPlate(imageBlob, {
            signal: controller.signal,
          })
        } catch (plateDetectionError) {
          if (isAbortError(plateDetectionError)) throw plateDetectionError
          unreadableLaneCount += 1
          addLog(
            `Có xe tại ${queueLaneLabel} nhưng chưa đọc được biển số.`,
            'error',
          )
          continue
        }

        const plates = (
          plateResult.plateTexts?.length
            ? plateResult.plateTexts
            : [plateResult.plateText]
        )
          .map((plate) => String(plate ?? '').trim().toUpperCase())
          .filter(Boolean)
          .slice(0, 3)

        addLog(
          plates.length > 1
            ? `${queueLaneLabel}: đã đọc ${plates.length} biển số ${plates.join(', ')}.`
            : `${queueLaneLabel}: đã đọc biển số ${plates[0]}.`,
          'success',
        )

        for (const [plateIndex, plate] of plates.entries()) {
          if (seenPlates.has(plate)) {
            addLog(`${plate}: bỏ qua kết quả trùng giữa hai vùng camera.`)
            continue
          }
          seenPlates.add(plate)
          detections.push({
            plate,
            plateIndex,
            plateCount: plates.length,
            confidence: plateResult.confidence,
            imageBlob,
            queueLaneSide: target.queueLaneSide,
            queueLaneType: target.queueLaneType,
          })
        }
      }

      setCarCount(detectedCarCount)
      if (detectedCarCount === 0) {
        setStatus('scanning')
        return
      }

      if (detections.length === 0) {
        setStatus('error')
        cooldownUntilRef.current = Date.now() + 4000
        restoreScanningStatus(4000)
        return
      }

      setLastPlate(
        detections
          .map(({ plate, queueLaneType }) =>
            queueLaneType ? `${plate} (${queueLaneType === 'vip' ? 'VIP' : 'Thường'})` : plate,
          )
          .join(' · '),
      )
      setConfidence(detections[0]?.confidence)
      setStatus('found')

      let successfulCount = 0
      let needsAction = unreadableLaneCount > 0

      for (const detection of detections) {
        const {
          plate,
          plateIndex,
          plateCount,
          confidence: plateConfidence,
          imageBlob,
          queueLaneSide,
          queueLaneType,
        } = detection
        let vehicleRecognition = null
        if (mode === 'entry') {
          try {
            vehicleRecognition = await recognizeCameraVehicle(imageBlob, plate, {
              signal: controller.signal,
            })
            const recognizedType = vehicleRecognition.primaryResult?.vehicleType
            if (recognizedType) {
              addLog(
                vehicleRecognition.isOverriddenByHistory
                  ? `${plate}: loại xe ${recognizedType} lấy từ hồ sơ đã lưu.`
                  : `${plate}: AI dự đoán loại xe ${recognizedType}.`,
                vehicleRecognition.isOverriddenByHistory ? 'success' : 'normal',
              )
            }
          } catch (recognitionError) {
            if (isAbortError(recognitionError)) throw recognitionError
            addLog(
              `${plate}: chưa nhận diện được loại xe, vẫn tiếp tục tra cứu booking.`,
              'error',
            )
          }
        }

        try {
          const result = await onPlateDetected?.(plate, {
            operationMode: mode,
            confidence: plateConfidence,
            source: 'camera-ai',
            imageBlob,
            vehicleRecognition,
            plateIndex,
            plateCount,
            queueLaneSide,
            queueLaneType,
          })

          successfulCount += 1
          needsAction ||= result?.status === 'needs-action'
          if (result?.message) {
            addLog(result.message, result.type === 'error' ? 'error' : 'success')
          }
        } catch (plateError) {
          if (isAbortError(plateError)) throw plateError
          addLog(`${plate}: ${getErrorMessage(plateError)}`, 'error')
        }
      }

      setStatus(
        successfulCount === 0
          ? 'error'
          : needsAction
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
    leftLaneIsVip,
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

        {mode === 'entry' && (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2">
              <span>
                <span className="block text-xs font-semibold text-on-surface">Khung trái</span>
                <span className="block text-[10px] text-on-surface-variant">
                  {leftLaneIsVip ? 'Làn VIP' : 'Làn thường'}
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-on-surface-variant">
                VIP
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-amber-500"
                  checked={leftLaneIsVip}
                  onChange={(event) => setLeftLaneIsVip(event.target.checked)}
                />
              </span>
            </label>
            <label className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2">
              <span>
                <span className="block text-xs font-semibold text-on-surface">Khung phải</span>
                <span className="block text-[10px] text-on-surface-variant">
                  {leftLaneIsVip ? 'Làn thường' : 'Làn VIP'}
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-on-surface-variant">
                VIP
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-amber-500"
                  checked={!leftLaneIsVip}
                  onChange={(event) => setLeftLaneIsVip(!event.target.checked)}
                />
              </span>
            </label>
          </div>
        )}

        <div className="relative aspect-video min-h-[220px] overflow-hidden rounded-lg bg-black">
          {mode === 'entry' && (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="pointer-events-none absolute h-px w-px opacity-0"
            />
          )}
          {mode === 'entry' && (
            <div className="absolute inset-0 grid grid-cols-2">
              {[
                { region: 'left', side: 'Trái', isVip: leftLaneIsVip },
                { region: 'right', side: 'Phải', isVip: !leftLaneIsVip },
              ].map((zone) => {
                const view = regionViews[zone.region]
                const maxTranslate = (view.zoom - 1) * 50
                const isDragging = draggingRegion === zone.region

                return (
                  <div
                    key={zone.region}
                    role="region"
                    aria-label={`Khung camera ${zone.side.toLowerCase()}`}
                    className={`relative touch-none overflow-hidden border-2 ${
                      zone.isVip
                        ? 'border-amber-400/80 bg-amber-500/5'
                        : 'border-primary-container/75 bg-primary/5'
                    } ${view.zoom > MIN_REGION_ZOOM
                      ? isDragging ? 'cursor-grabbing' : 'cursor-grab'
                      : 'cursor-default'}`}
                    onPointerDown={(event) => handleRegionPointerDown(event, zone.region)}
                    onPointerMove={handleRegionPointerMove}
                    onPointerUp={handleRegionPointerEnd}
                    onPointerCancel={handleRegionPointerEnd}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                      style={{
                        transform: `translate(${-view.panX * maxTranslate}%, ${-view.panY * maxTranslate}%) scale(${view.zoom})`,
                        transformOrigin: 'center',
                      }}
                    >
                      <video
                        ref={(element) => {
                          previewVideoRefs.current[zone.region] = element
                        }}
                        autoPlay
                        muted
                        playsInline
                        className={`absolute top-0 h-full w-[200%] max-w-none object-cover ${
                          zone.region === 'right' ? '-left-full' : 'left-0'
                        }`}
                      />
                    </div>

                    <span
                      className={`pointer-events-none absolute left-2 top-2 z-10 rounded px-2 py-1 text-[10px] font-bold uppercase text-white ${
                        zone.isVip ? 'bg-amber-600/90' : 'bg-primary/90'
                      }`}
                    >
                      {zone.side} · {zone.isVip ? 'Làn VIP' : 'Làn thường'}
                    </span>

                    <div
                      className="absolute right-2 top-2 z-20 flex items-center overflow-hidden rounded-lg border border-white/20 bg-black/75 text-white shadow-lg backdrop-blur"
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label={`Thu nhỏ khung ${zone.side.toLowerCase()}`}
                        title="Thu nhỏ"
                        disabled={view.zoom <= MIN_REGION_ZOOM}
                        onClick={() => changeRegionZoom(zone.region, -REGION_ZOOM_STEP)}
                      >
                        <span className="material-symbols-outlined text-[18px]">remove</span>
                      </button>
                      <span className="min-w-12 border-x border-white/15 px-1 text-center text-[10px] font-bold tabular-nums">
                        {view.zoom.toFixed(2)}×
                      </span>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label={`Phóng to khung ${zone.side.toLowerCase()}`}
                        title="Phóng to"
                        disabled={view.zoom >= MAX_REGION_ZOOM}
                        onClick={() => changeRegionZoom(zone.region, REGION_ZOOM_STEP)}
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center border-l border-white/15 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label={`Đặt lại khung ${zone.side.toLowerCase()}`}
                        title="Đặt lại góc nhìn"
                        disabled={view.zoom === MIN_REGION_ZOOM && view.panX === 0 && view.panY === 0}
                        onClick={() => resetRegionView(zone.region)}
                      >
                        <span className="material-symbols-outlined text-[17px]">restart_alt</span>
                      </button>
                    </div>

                    {view.zoom > MIN_REGION_ZOOM && (
                      <span className="pointer-events-none absolute left-1/2 top-12 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-black/55 px-2 py-1 text-[9px] font-medium text-white/80">
                        Kéo để di chuyển
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {mode === 'exit' && (() => {
            const view = regionViews.full
            const maxTranslate = (view.zoom - 1) * 50
            const isDragging = draggingRegion === 'full'

            return (
              <div
                role="region"
                aria-label="Khung camera cổng ra"
                className={`absolute inset-0 touch-none overflow-hidden ${
                  view.zoom > MIN_REGION_ZOOM
                    ? isDragging ? 'cursor-grabbing' : 'cursor-grab'
                    : 'cursor-default'
                }`}
                onPointerDown={(event) => handleRegionPointerDown(event, 'full')}
                onPointerMove={handleRegionPointerMove}
                onPointerUp={handleRegionPointerEnd}
                onPointerCancel={handleRegionPointerEnd}
              >
                <div
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  style={{
                    transform: `translate(${-view.panX * maxTranslate}%, ${-view.panY * maxTranslate}%) scale(${view.zoom})`,
                    transformOrigin: 'center',
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="pointer-events-none absolute inset-4 rounded-lg border border-primary-container/60">
                  <span className="absolute left-0 top-0 h-4 w-4 border-l-4 border-t-4 border-primary-container" />
                  <span className="absolute right-0 top-0 h-4 w-4 border-r-4 border-t-4 border-primary-container" />
                  <span className="absolute bottom-0 left-0 h-4 w-4 border-b-4 border-l-4 border-primary-container" />
                  <span className="absolute bottom-0 right-0 h-4 w-4 border-b-4 border-r-4 border-primary-container" />
                </div>

                <div
                  className="absolute right-3 top-3 z-20 flex items-center overflow-hidden rounded-lg border border-white/20 bg-black/75 text-white shadow-lg backdrop-blur"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Thu nhỏ camera cổng ra"
                    title="Thu nhỏ"
                    disabled={view.zoom <= MIN_REGION_ZOOM}
                    onClick={() => changeRegionZoom('full', -REGION_ZOOM_STEP)}
                  >
                    <span className="material-symbols-outlined text-[19px]">remove</span>
                  </button>
                  <span className="min-w-14 border-x border-white/15 px-1 text-center text-[11px] font-bold tabular-nums">
                    {view.zoom.toFixed(2)}×
                  </span>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Phóng to camera cổng ra"
                    title="Phóng to"
                    disabled={view.zoom >= MAX_REGION_ZOOM}
                    onClick={() => changeRegionZoom('full', REGION_ZOOM_STEP)}
                  >
                    <span className="material-symbols-outlined text-[19px]">add</span>
                  </button>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center border-l border-white/15 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Đặt lại camera cổng ra"
                    title="Đặt lại góc nhìn"
                    disabled={view.zoom === MIN_REGION_ZOOM && view.panX === 0 && view.panY === 0}
                    onClick={() => resetRegionView('full')}
                  >
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                  </button>
                </div>

                {view.zoom > MIN_REGION_ZOOM && (
                  <span className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-black/55 px-2 py-1 text-[10px] font-medium text-white/80">
                    Kéo để di chuyển
                  </span>
                )}
              </div>
            )
          })()}
          {!cameraReady && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 px-4 text-center text-sm font-semibold text-white">
              {!selectedDeviceId
                ? 'Chọn thiết bị camera cho cổng này'
                : status === 'error'
                  ? 'Không dùng được camera'
                  : 'Đang mở camera...'}
            </div>
          )}
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex items-end justify-between gap-2">
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
  const [activeMode, setActiveMode] = useState(getStoredActiveMode)
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

  useEffect(() => {
    try {
      window.localStorage.setItem(CAMERA_STORAGE_KEYS.activeMode, activeMode)
    } catch {
      // The toggle still works for the current session.
    }
  }, [activeMode])

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
              {laneLabel || 'Chưa xác định chi nhánh/làn Staff'} · chọn một cổng để giám sát
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-outline-variant bg-surface-container-lowest p-1"
            role="group"
            aria-label="Chọn camera cổng"
          >
            {[
              { mode: 'entry', label: 'Cổng vào', icon: 'login' },
              { mode: 'exit', label: 'Cổng ra', icon: 'logout' },
            ].map((option) => {
              const selected = activeMode === option.mode
              return (
                <button
                  key={option.mode}
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selected
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-variant'
                  }`}
                  aria-pressed={selected}
                  onClick={() => setActiveMode(option.mode)}
                >
                  <span className="material-symbols-outlined text-[16px]">{option.icon}</span>
                  {option.label}
                </button>
              )
            })}
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
      </div>

      {(deviceError || hasDuplicateAssignment) && (
        <div className="m-4 mb-0 rounded-lg border border-error/40 bg-error-container/30 px-4 py-3 text-sm font-medium text-error">
          {hasDuplicateAssignment
            ? 'Camera cổng vào và cổng ra phải là hai thiết bị khác nhau.'
            : deviceError}
        </div>
      )}

      <div className="p-4">
        <CameraStation
          key={activeMode}
          mode={activeMode}
          devices={devices}
          selectedDeviceId={activeMode === 'entry' ? entryDeviceId : exitDeviceId}
          disabled={disabled || hasDuplicateAssignment}
          onDeviceChange={(deviceId) => assignDevice(activeMode, deviceId)}
          onPlateDetected={onPlateDetected}
        />
      </div>
    </section>
  )
}
