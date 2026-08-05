import { useCallback, useEffect, useRef, useState } from 'react'
import { ackBarrierCommand } from '../api'
import { isLaneDisplayEventExpired } from '../api/laneDisplay.api'
import {
  BARRIER_GATES,
  closeBarrierDevice,
  fetchBarrierDeviceStatus,
  gateFromBarrierId,
  getBarrierGateLabel,
  loadBarrierDeviceSettings,
  openBarrierDevice,
  saveBarrierDeviceSettings,
} from '../services/barrierDevice'
import { subscribeLaneDisplayRealtime } from '../services/laneDisplayRealtime'

const PROCESSED_STORAGE_KEY = 'luxewash:barrier-device:processed-commands'
const PROCESSED_TTL_MS = 24 * 60 * 60 * 1000
const DEVICE_STATUS_POLL_MS = 500

function loadProcessedCommands() {
  if (typeof window === 'undefined') return new Map()
  try {
    const cutoff = Date.now() - PROCESSED_TTL_MS
    const values = JSON.parse(window.localStorage.getItem(PROCESSED_STORAGE_KEY) || '[]')
    return new Map(
      (Array.isArray(values) ? values : [])
        .filter((item) => item?.commandId && Number(item.processedAt) >= cutoff)
        .map((item) => [String(item.commandId), Number(item.processedAt)]),
    )
  } catch {
    return new Map()
  }
}

function persistProcessedCommands(commands) {
  if (typeof window === 'undefined') return
  const values = [...commands.entries()]
    .map(([commandId, processedAt]) => ({ commandId, processedAt }))
    .slice(-100)
  window.localStorage.setItem(PROCESSED_STORAGE_KEY, JSON.stringify(values))
}

export default function useBarrierController({ onNotice } = {}) {
  const [settings, setSettingsState] = useState(loadBarrierDeviceSettings)
  const settingsRef = useRef(settings)
  const [deviceStatus, setDeviceStatus] = useState(null)
  const [connectionState, setConnectionState] = useState('idle')
  const [lastAction, setLastAction] = useState(null)
  const processedRef = useRef(loadProcessedCommands())
  const inFlightRef = useRef(new Map())

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const updateSettings = useCallback((next) => {
    const saved = saveBarrierDeviceSettings(next)
    settingsRef.current = saved
    setSettingsState(saved)
    setDeviceStatus(null)
    setConnectionState(saved.enabled ? 'idle' : 'disabled')
  }, [])

  const refreshStatus = useCallback(async ({ silent = false } = {}) => {
    const current = settingsRef.current
    if (!current.enabled) {
      setConnectionState('disabled')
      return null
    }
    if (!silent) setConnectionState('connecting')
    try {
      const status = await fetchBarrierDeviceStatus(current)
      setDeviceStatus(status)
      setConnectionState('connected')
      return status
    } catch (error) {
      setConnectionState('error')
      if (!silent) {
        onNotice?.(error instanceof Error ? error.message : 'Không kết nối được ESP32.', 'error')
      }
      return null
    }
  }, [onNotice])

  const executeCommand = useCallback(async ({
    gate = BARRIER_GATES.ENTRY_REGULAR,
    commandId,
    licensePlate,
    expiresAt,
    source = 'frontend',
    acknowledgeBackend = true,
  } = {}) => {
    const current = settingsRef.current
    const normalizedId = String(commandId ?? '').trim()
    if (!current.enabled) return { skipped: true, reason: 'disabled' }

    const expiresAtMs = Date.parse(String(expiresAt ?? ''))
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) {
      return { skipped: true, reason: 'expired' }
    }
    if (normalizedId && processedRef.current.has(normalizedId)) {
      return { skipped: true, reason: 'duplicate' }
    }
    if (normalizedId && inFlightRef.current.has(normalizedId)) {
      return inFlightRef.current.get(normalizedId)
    }

    const actionPromise = (async () => {
      try {
        const response = await openBarrierDevice(current, gate, {
          commandId: normalizedId,
          licensePlate,
          source,
        })
        if (normalizedId) {
          processedRef.current.set(normalizedId, Date.now())
          persistProcessedCommands(processedRef.current)
        }
        setConnectionState('connected')
        setDeviceStatus(response?.status ?? response)
        setLastAction({ gate, commandId: normalizedId || null, ok: true, at: Date.now() })

        if (String(source).startsWith('signalr')) {
          onNotice?.(
            `ESP32 đã nhận lệnh mở barie ${getBarrierGateLabel(gate)}${licensePlate ? ` cho xe ${licensePlate}` : ''}.`,
            'success',
          )
        }

        if (normalizedId && acknowledgeBackend) {
          try {
            await ackBarrierCommand(normalizedId, 'Completed', `ESP32 ${gate} accepted OPEN command.`)
          } catch (ackError) {
            onNotice?.(
              `ESP32 đã mở barie nhưng ACK backend thất bại: ${ackError instanceof Error ? ackError.message : 'không rõ lỗi'}`,
              'error',
            )
          }
        }
        return response
      } catch (error) {
        setConnectionState('error')
        setLastAction({
          gate,
          commandId: normalizedId || null,
          ok: false,
          message: error instanceof Error ? error.message : 'Không mở được barie.',
          at: Date.now(),
        })
        onNotice?.(
          `Không mở được barie ${getBarrierGateLabel(gate)}: ${error instanceof Error ? error.message : 'không rõ lỗi'}`,
          'error',
        )
        throw error
      } finally {
        if (normalizedId) inFlightRef.current.delete(normalizedId)
      }
    })()

    if (normalizedId) inFlightRef.current.set(normalizedId, actionPromise)
    return actionPromise
  }, [onNotice])

  const closeGate = useCallback(async (gate) => {
    const response = await closeBarrierDevice(settingsRef.current, gate)
    setDeviceStatus(response?.status ?? response)
    setConnectionState('connected')
    return response
  }, [])

  useEffect(() => {
    if (!settings.enabled) return undefined
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
  }, [settings.enabled, settings.baseUrl, settings.deviceKey, refreshStatus])

  useEffect(() => subscribeLaneDisplayRealtime({
    onEvent: (event) => {
      if (
        !event?.barrierCommandId ||
        (event.type !== 'cleared' && isLaneDisplayEventExpired(event)) ||
        (event.displayUntil && Date.parse(event.displayUntil) <= Date.now())
      ) return
      if (event.type === 'assigned') {
        const gate = gateFromBarrierId(event.barrierId)
        if (!gate || gate === BARRIER_GATES.EXIT) {
          onNotice?.('Backend chưa gửi đúng barrierId cho lệnh mở cổng vào.', 'error')
          return
        }
        void executeCommand({
          gate,
          commandId: event.barrierCommandId,
          licensePlate: event.plate,
          expiresAt: event.displayUntil,
          source: 'signalr-lane-assigned',
        }).catch(() => {})
      } else if (event.type === 'cleared') {
        void executeCommand({
          gate: BARRIER_GATES.EXIT,
          commandId: event.barrierCommandId,
          licensePlate: event.plate,
          expiresAt: event.displayUntil,
          source: 'signalr-lane-cleared',
        }).catch(() => {})
      }
    },
    onBarrierCommand: (command) => {
      if (!command?.commandId || String(command.action ?? 'OPEN').toUpperCase() !== 'OPEN') return
      const gate = gateFromBarrierId(command.barrierId)
      if (!gate) {
        onNotice?.(`Không xác định được barie từ barrierId "${command.barrierId || ''}".`, 'error')
        return
      }
      void executeCommand({
        gate,
        commandId: command.commandId,
        licensePlate: command.licensePlate,
        expiresAt: command.expiresAt,
        source: 'signalr-barrier-command',
      }).catch(() => {})
    },
  }), [executeCommand, onNotice])

  return {
    settings,
    updateSettings,
    deviceStatus,
    connectionState,
    lastAction,
    refreshStatus,
    executeCommand,
    closeGate,
  }
}
