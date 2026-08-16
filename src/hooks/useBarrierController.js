import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createBarrierCommand,
  fetchBarrierCommand,
  fetchBarrierDeviceStatus,
} from '../api'
import {
  BARRIER_GATES,
  getBarrierGateLabel,
  getBarrierId,
} from '../services/barrierDevice'

const DEVICE_STATUS_POLL_MS = 5_000
const COMMAND_RESULT_POLL_MS = 500
const COMMAND_RESULT_TIMEOUT_MS = 10_000

async function waitForCommandResult(commandId) {
  const deadline = Date.now() + COMMAND_RESULT_TIMEOUT_MS
  while (Date.now() < deadline) {
    const command = await fetchBarrierCommand(commandId)
    const status = String(command?.status ?? '').trim().toLowerCase()
    if (status === 'completed' || status === 'acknowledged') return command
    if (status === 'failed' || status === 'expired') {
      throw new Error(`Lệnh barie ${status === 'expired' ? 'đã hết hạn' : 'thực thi thất bại'}.`)
    }
    await new Promise((resolve) => window.setTimeout(resolve, COMMAND_RESULT_POLL_MS))
  }
  throw new Error('ESP32 chưa xác nhận lệnh trong thời gian cho phép.')
}

export default function useBarrierController({ onNotice } = {}) {
  const [deviceStatus, setDeviceStatus] = useState(null)
  const [connectionState, setConnectionState] = useState('idle')
  const [lastAction, setLastAction] = useState(null)
  const inFlightRef = useRef(new Map())

  const refreshStatus = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setConnectionState('connecting')
    try {
      const status = await fetchBarrierDeviceStatus()
      setDeviceStatus(status)
      setConnectionState(status?.online ? 'connected' : 'error')
      return status
    } catch (error) {
      setConnectionState('error')
      if (!silent) {
        onNotice?.(
          error instanceof Error ? error.message : 'Không lấy được trạng thái ESP32 từ backend.',
          'error',
        )
      }
      return null
    }
  }, [onNotice])

  const executeCommand = useCallback(async ({
    gate = BARRIER_GATES.ENTRY_REGULAR,
    commandId,
    expiresAt,
    action = 'OPEN',
    source = 'frontend',
  } = {}) => {
    const normalizedId = String(commandId ?? '').trim()
    const expiresAtMs = Date.parse(String(expiresAt ?? ''))
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) {
      return { skipped: true, reason: 'expired' }
    }

    if (normalizedId && inFlightRef.current.has(normalizedId)) {
      return inFlightRef.current.get(normalizedId)
    }

    const actionPromise = (async () => {
      try {
        // Automatic check-in/out commands are already created by backend.
        const queuedCommand = normalizedId
          ? await fetchBarrierCommand(normalizedId)
          : await createBarrierCommand(getBarrierId(gate), action)
        const queuedCommandId = queuedCommand?.commandId ?? normalizedId
        if (!queuedCommandId) throw new Error('Backend không trả về commandId của barie.')
        const command = await waitForCommandResult(queuedCommandId)
        setLastAction({
          gate,
          commandId: command?.commandId ?? (normalizedId || null),
          status: command?.status ?? 'Pending',
          ok: true,
          at: Date.now(),
        })
        if (source === 'staff-manual') {
          onNotice?.(
            `ESP32 đã thực thi lệnh ${action === 'CLOSE' ? 'đóng' : 'mở'} ${getBarrierGateLabel(gate)}.`,
            'success',
          )
        }
        void refreshStatus({ silent: true })
        return { ...command, queued: false }
      } catch (error) {
        setLastAction({
          gate,
          commandId: normalizedId || null,
          ok: false,
          message: error instanceof Error ? error.message : 'Không gửi được lệnh barie.',
          at: Date.now(),
        })
        onNotice?.(
          `Không gửi được lệnh ${getBarrierGateLabel(gate)}: ${error instanceof Error ? error.message : 'không rõ lỗi'}`,
          'error',
        )
        throw error
      } finally {
        if (normalizedId) inFlightRef.current.delete(normalizedId)
      }
    })()

    if (normalizedId) inFlightRef.current.set(normalizedId, actionPromise)
    return actionPromise
  }, [onNotice, refreshStatus])

  const closeGate = useCallback((gate) => executeCommand({
    gate,
    action: 'CLOSE',
    source: 'staff-manual',
  }), [executeCommand])

  useEffect(() => {
    let stopped = false
    let timer = null
    const poll = async () => {
      await refreshStatus({ silent: true })
      if (!stopped) timer = window.setTimeout(poll, DEVICE_STATUS_POLL_MS)
    }
    timer = window.setTimeout(poll, 0)
    return () => {
      stopped = true
      if (timer) window.clearTimeout(timer)
    }
  }, [refreshStatus])

  return {
    deviceStatus,
    connectionState,
    lastAction,
    refreshStatus,
    executeCommand,
    closeGate,
  }
}
