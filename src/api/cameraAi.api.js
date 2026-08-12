import { API_DEFAULT_TIMEOUT_MS, CAMERA_AI_BASE_URL } from './config'
import { apiRequest } from './client'
import { ApiError } from './errors'
import { normalizeStaffTask } from './operationStaff.api'
import { normalizeVietnameseLicensePlate } from '../utils/licensePlate'

function buildCameraUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${CAMERA_AI_BASE_URL.replace(/\/$/, '')}${normalized}`
}

async function parseBody(response) {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return response.json()
  const text = await response.text()
  return text ? { message: text } : null
}

function getMessage(body, fallback) {
  if (body && typeof body === 'object' && 'message' in body) {
    return String(body.message ?? fallback)
  }
  return fallback
}

async function cameraRequest(path, options = {}) {
  const {
    timeoutMs = API_DEFAULT_TIMEOUT_MS,
    headers: customHeaders,
    ...fetchOptions
  } = options

  const headers = new Headers(customHeaders)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const externalSignal = fetchOptions.signal
  const onExternalAbort = () => controller.abort()

  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true })
  }

  let response
  try {
    response = await fetch(buildCameraUrl(path), {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })
  } catch (err) {
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort)
    if (err instanceof Error && err.name === 'AbortError') {
      if (externalSignal?.aborted) {
        const abortErr = new Error('Aborted')
        abortErr.name = 'AbortError'
        throw abortErr
      }
      throw new ApiError('Yêu cầu Camera AI quá thời gian chờ.', 408)
    }
    throw new ApiError(err instanceof Error ? err.message : 'Lỗi kết nối Camera AI', 0)
  } finally {
    clearTimeout(timeoutId)
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort)
  }

  const body = await parseBody(response)

  if (!response.ok) {
    throw new ApiError(getMessage(body, `HTTP ${response.status}`), response.status, body)
  }

  if (body && typeof body === 'object' && 'statusCode' in body) {
    const statusCode = Number(body.statusCode)
    if (statusCode >= 400) {
      throw new ApiError(getMessage(body, 'Yêu cầu Camera AI thất bại'), statusCode, body)
    }
  }

  return body
}

export async function checkCameraHasCar(imageBlob, options = {}) {
  const formData = new FormData()
  formData.append('imageFile', imageBlob, 'frame.jpg')

  const data = await cameraRequest('/api/lpr/check-has-car', {
    method: 'POST',
    body: formData,
    timeoutMs: 20_000,
    ...options,
  })

  const item = data && typeof data === 'object' ? data : {}
  return {
    hasCar: Boolean(item.hasCar),
    carCount: Number(item.carCount ?? 0),
    boxes: Array.isArray(item.boxes) ? item.boxes : [],
    message: item.message != null ? String(item.message) : '',
  }
}

export async function detectCameraPlate(imageBlob, options = {}) {
  const formData = new FormData()
  formData.append('image', imageBlob, 'capture.jpg')

  const data = await cameraRequest('/api/lpr/detect-plate', {
    method: 'POST',
    body: formData,
    timeoutMs: 30_000,
    ...options,
  })

  const root = data && typeof data === 'object' ? data : {}
  const payload =
    root.data && typeof root.data === 'object'
      ? root.data
      : root
  const plateTexts = [
    ...new Set(
      (Array.isArray(payload.plateTexts) ? payload.plateTexts : [payload.plateText])
        .map(normalizeVietnameseLicensePlate)
        .filter(Boolean),
    ),
  ].slice(0, 3)
  const plateText = plateTexts[0] ?? ''

  if (!plateText) {
    throw new ApiError('Không phát hiện được biển số Việt Nam hợp lệ.', 404, data)
  }

  return {
    plateText,
    plateTexts,
    confidence: payload.confidence != null ? Number(payload.confidence) : undefined,
  }
}

/**
 * Nhận diện loại xe sau khi đã có biển số để backend có thể ưu tiên hồ sơ xe cũ.
 */
export async function recognizeCameraVehicle(imageBlob, licensePlate, options = {}) {
  const formData = new FormData()
  formData.append('image', imageBlob, 'vehicle.jpg')
  const normalizedPlate = String(licensePlate ?? '').trim().toUpperCase()
  if (normalizedPlate) formData.append('licensePlate', normalizedPlate)

  const data = await cameraRequest('/api/lpr/car-recognize', {
    method: 'POST',
    body: formData,
    timeoutMs: 45_000,
    ...options,
  })

  const root = data && typeof data === 'object' ? data : {}
  const rawResults = Array.isArray(root.data) ? root.data : []
  const results = rawResults.map((item) => ({
    vehicleType: String(item?.vehicleType ?? '').trim(),
    predictedBrand: String(item?.predictedBrand ?? '').trim() || null,
    predictedModel: String(item?.predictedModel ?? '').trim() || null,
    confidence: item?.confidence != null ? Number(item.confidence) : undefined,
    box: item?.box && typeof item.box === 'object' ? item.box : null,
  }))

  return {
    isOverriddenByHistory: Boolean(
      root.isOverriddenByHistory ?? root.IsOverriddenByHistory,
    ),
    results,
    primaryResult: results[0] ?? null,
  }
}

/**
 * Gửi loại xe do Staff sửa để backend lưu dữ liệu huấn luyện AI.
 */
export async function submitVehicleVisionFeedback(
  {
    imageBlob,
    licensePlate,
    predictedVehicleTypeId,
    actualVehicleTypeId,
    actualBrand,
    actualModel,
  },
  options = {},
) {
  const formData = new FormData()
  formData.append('image', imageBlob, 'vehicle-feedback.jpg')
  formData.append('licensePlate', String(licensePlate ?? '').trim().toUpperCase())
  if (Number(predictedVehicleTypeId) > 0) {
    formData.append('predictedVehicleTypeId', String(Number(predictedVehicleTypeId)))
  }
  formData.append('actualVehicleTypeId', String(Number(actualVehicleTypeId)))
  if (String(actualBrand ?? '').trim()) {
    formData.append('actualBrand', String(actualBrand).trim())
  }
  if (String(actualModel ?? '').trim()) {
    formData.append('actualModel', String(actualModel).trim())
  }

  const data = await cameraRequest('/api/lpr/feedback', {
    method: 'POST',
    body: formData,
    timeoutMs: 60_000,
    ...options,
  })
  const root = data && typeof data === 'object' ? data : {}
  const payload = root.data && typeof root.data === 'object' ? root.data : root

  return {
    feedbackId: payload.feedbackId != null ? Number(payload.feedbackId) : null,
    imageUrl: String(payload.imageUrl ?? '').trim() || null,
  }
}

export async function cameraCheckInByPlate(licensePlate, options = {}) {
  const {
    checkInImage,
    allowOutsideScheduledTime = false,
    ...requestOptions
  } = options
  if (!(checkInImage instanceof Blob)) {
    throw new ApiError('Cần ảnh camera cổng vào để check-in.', 400)
  }

  const params = new URLSearchParams({ plate: String(licensePlate ?? '').trim() })
  const formData = new FormData()
  formData.append(
    'checkInImage',
    checkInImage,
    checkInImage.name || `checkin-${Date.now()}.jpg`,
  )
  formData.append(
    'AllowOutsideScheduledTime',
    String(allowOutsideScheduledTime === true),
  )
  const data = await apiRequest(buildCameraUrl(`/api/v1/camera/check-in?${params}`), {
    method: 'POST',
    body: formData,
    timeoutMs: 30_000,
    ...requestOptions,
  })
  const root = data && typeof data === 'object' ? data : {}
  const payload = root.data && typeof root.data === 'object' ? root.data : root
  return normalizeStaffTask(payload)
}

/**
 * POST /api/v1/camera/check-out?plate=
 * Hoàn tất lượt rửa và chỉ cho phép mở barie khi booking đã thanh toán.
 */
export async function cameraCheckOutByPlate(licensePlate, options = {}) {
  const { checkOutImage, ...requestOptions } = options
  if (!(checkOutImage instanceof Blob)) {
    throw new ApiError('Cần ảnh camera cổng ra để hoàn tất lượt rửa.', 400)
  }

  const params = new URLSearchParams({ plate: String(licensePlate ?? '').trim() })
  const formData = new FormData()
  formData.append(
    'checkOutImage',
    checkOutImage,
    checkOutImage.name || `checkout-${Date.now()}.jpg`,
  )
  const data = await apiRequest(buildCameraUrl(`/api/v1/camera/check-out?${params}`), {
    method: 'POST',
    body: formData,
    timeoutMs: 30_000,
    ...requestOptions,
  })
  const root = data && typeof data === 'object' ? data : {}
  const payload = root.data && typeof root.data === 'object' ? root.data : root
  return normalizeStaffTask(payload)
}

export async function automatedWashCheckIn(
  { licensePlate, branchId = 1, autoStart = true },
  options = {},
) {
  const params = new URLSearchParams({
    plate: String(licensePlate ?? '').trim(),
    branchId: String(branchId ?? 1),
    autoStart: String(autoStart !== false),
  })
  const data = await apiRequest(buildCameraUrl(`/api/v1/automated-wash/check-in?${params}`), {
    method: 'POST',
    timeoutMs: 30_000,
    ...options,
  })
  const root = data && typeof data === 'object' ? data : {}
  const payload = root.data && typeof root.data === 'object' ? root.data : root
  return normalizeStaffTask(payload)
}

export { CAMERA_AI_BASE_URL }
