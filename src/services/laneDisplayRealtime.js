import {
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
} from '@microsoft/signalr'
import { LANE_DISPLAY_HUB_URL } from '../api/config'
import { getAccessToken } from '../api/session'
import {
  normalizeLaneDisplayEvent,
  normalizeLaneDisplayState,
} from '../api/laneDisplay.api'

const START_RETRY_MS = 5_000

export function subscribeLaneDisplayRealtime({
  onEvent,
  onInitialState,
  onStatusChange,
} = {}) {
  let stopped = false
  let retryTimer = null
  let startPromise = null

  const connection = new HubConnectionBuilder()
    .withUrl(LANE_DISPLAY_HUB_URL, {
      accessTokenFactory: () => getAccessToken() ?? '',
      withCredentials: false,
      transport:
        HttpTransportType.WebSockets |
        HttpTransportType.ServerSentEvents |
        HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
    .configureLogging(LogLevel.Warning)
    .build()

  const emitStatus = (status, error = null) => {
    if (!stopped) onStatusChange?.({ status, error })
  }

  connection.on('ReceiveLaneUpdate', (rawEvent) => {
    const event = normalizeLaneDisplayEvent(rawEvent, 'signalr')
    if (event) onEvent?.(event)
  })

  connection.on('ReceiveInitialState', (rawState) => {
    onInitialState?.(normalizeLaneDisplayState(rawState))
  })

  connection.onreconnecting((error) => emitStatus('reconnecting', error))
  connection.onreconnected(() => emitStatus('connected'))
  connection.onclose((error) => {
    if (stopped) return
    emitStatus('disconnected', error)
    scheduleStart()
  })

  const scheduleStart = () => {
    if (stopped || retryTimer) return
    retryTimer = window.setTimeout(() => {
      retryTimer = null
      void start()
    }, START_RETRY_MS)
  }

  const start = async () => {
    if (stopped || startPromise) return startPromise
    emitStatus('connecting')
    startPromise = connection
      .start()
      .then(() => emitStatus('connected'))
      .catch((error) => {
        emitStatus('disconnected', error)
        scheduleStart()
      })
      .finally(() => {
        startPromise = null
      })
    return startPromise
  }

  void start()

  return () => {
    stopped = true
    if (retryTimer) window.clearTimeout(retryTimer)
    connection.off('ReceiveLaneUpdate')
    connection.off('ReceiveInitialState')
    void connection.stop()
  }
}
