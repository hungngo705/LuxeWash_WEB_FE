import { useState } from 'react'
import { BARRIER_GATES, getBarrierGateLabel } from '../../services/barrierDevice'

function GateStatus({ label, gate, onOpen, onClose, busy, online, servoDriverReady }) {
  const hasStatus = gate && typeof gate === 'object'
  const isOpen = gate?.isOpen === true || String(gate?.state ?? '').toLowerCase().includes('open')
  const sensorBlocked = gate?.sensorBlocked === true
  const controlsUnavailable = !online || !servoDriverReady
  const unavailableTitle = !online
    ? 'ESP32 đang offline'
    : !servoDriverReady
      ? 'ESP32 không nhận diện được PCA9685'
      : undefined
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase text-on-surface">{label}</p>
        <p className={`truncate text-xs ${!servoDriverReady ? 'text-error' : sensorBlocked ? 'text-amber-700' : 'text-on-surface-variant'}`}>
          {!online
            ? 'Thiết bị đang offline'
            : !servoDriverReady
              ? 'Không nhận diện được PCA9685'
            : !hasStatus
              ? 'Chưa có dữ liệu từ thiết bị'
              : `${isOpen ? 'Đang mở' : 'Đã đóng'} · ${sensorBlocked ? 'Có xe tại cảm biến' : 'Cảm biến trống'}`}
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
          disabled={busy || controlsUnavailable}
          onClick={onOpen}
          title={unavailableTitle}
        >
          Mở
        </button>
        <button
          type="button"
          className="rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container disabled:opacity-50"
          disabled={busy || controlsUnavailable || sensorBlocked || !hasStatus}
          onClick={onClose}
          title={sensorBlocked ? 'Không thể đóng khi cảm biến đang phát hiện xe' : unavailableTitle}
        >
          Đóng
        </button>
      </div>
    </div>
  )
}

export default function BarrierDevicePanel({ controller }) {
  const {
    deviceStatus,
    connectionState,
    refreshStatus,
    executeCommand,
    closeGate,
  } = controller
  const [busyGate, setBusyGate] = useState(null)

  const gates = deviceStatus?.gates ?? {}
  const online = deviceStatus?.online === true
  const rawServoDriverReady = deviceStatus?.servoDriverReady ?? deviceStatus?.ServoDriverReady
  // Backward compatibility: backend builds that do not expose this field are
  // treated as ready. Once present, an explicit false disables all controls.
  const servoDriverReady = rawServoDriverReady !== false
  const entryRegularGate = gates.entryRegular ?? gates.entry_regular ?? gates['entry-regular'] ?? gates.entry
  const entryVipGate = gates.entryVip ?? gates.entry_vip ?? gates['entry-vip']
  const hardwareReady = online && servoDriverReady
  const stateLabel = online && !servoDriverReady
    ? 'ESP32 online · PCA9685 lỗi'
    : {
        connected: 'ESP32 đã kết nối',
        connecting: 'Đang kiểm tra ESP32',
        error: 'ESP32 đang offline',
        idle: 'Chưa kiểm tra ESP32',
      }[connectionState]

  const runManual = async (gate, action) => {
    if (!hardwareReady) return
    const gateLabel = getBarrierGateLabel(gate)
    if (!window.confirm(`${action === 'open' ? 'Mở' : 'Đóng'} barie ${gateLabel} bằng tay?`)) return
    setBusyGate(gate)
    try {
      if (action === 'open') {
        await executeCommand({ gate, source: 'staff-manual' })
      } else {
        await closeGate(gate)
      }
    } catch {
      // The controller reports the actionable error using the Staff toast.
    } finally {
      setBusyGate(null)
    }
  }

  return (
    <details className="mb-4 rounded-2xl border border-outline-variant bg-surface-container-low">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
          <span className="material-symbols-outlined text-[20px]">garage_door</span>
          Điều khiển barie ESP32
        </span>
        <span className={`flex items-center gap-2 text-xs font-semibold ${hardwareReady ? 'text-emerald-700' : online && !servoDriverReady ? 'text-amber-700' : connectionState === 'error' ? 'text-error' : 'text-on-surface-variant'}`}>
          <span className={`h-2 w-2 rounded-full ${hardwareReady ? 'bg-emerald-500' : online && !servoDriverReady ? 'bg-amber-500' : connectionState === 'error' ? 'bg-error' : 'bg-outline'}`} />
          {stateLabel}
        </span>
      </summary>

      <div className="grid gap-3 border-t border-outline-variant p-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <GateStatus
          label="Cổng vào thường · Sensor GPIO26 · PCA CH0"
          gate={entryRegularGate}
          online={online}
          servoDriverReady={servoDriverReady}
          busy={busyGate === BARRIER_GATES.ENTRY_REGULAR}
          onOpen={() => void runManual(BARRIER_GATES.ENTRY_REGULAR, 'open')}
          onClose={() => void runManual(BARRIER_GATES.ENTRY_REGULAR, 'close')}
        />
        <GateStatus
          label="Cổng vào VIP · Sensor GPIO25 · PCA CH1"
          gate={entryVipGate}
          online={online}
          servoDriverReady={servoDriverReady}
          busy={busyGate === BARRIER_GATES.ENTRY_VIP}
          onOpen={() => void runManual(BARRIER_GATES.ENTRY_VIP, 'open')}
          onClose={() => void runManual(BARRIER_GATES.ENTRY_VIP, 'close')}
        />
        <GateStatus
          label="Cổng ra · Sensor GPIO27 · PCA CH2"
          gate={gates.exit}
          online={online}
          servoDriverReady={servoDriverReady}
          busy={busyGate === BARRIER_GATES.EXIT}
          onOpen={() => void runManual(BARRIER_GATES.EXIT, 'open')}
          onClose={() => void runManual(BARRIER_GATES.EXIT, 'close')}
        />
        <button
          type="button"
          className="rounded-xl border border-outline-variant px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container"
          onClick={() => void refreshStatus()}
        >
          Kiểm tra kết nối
        </button>
      </div>

      <div className="border-t border-outline-variant px-4 py-3 text-xs text-on-surface-variant">
        Lệnh được chuyển qua backend HTTPS. Cập nhật gần nhất:{' '}
        {deviceStatus?.lastSeenAt
          ? new Date(deviceStatus.lastSeenAt).toLocaleString('vi-VN')
          : 'chưa có heartbeat'}.
      </div>
    </details>
  )
}
