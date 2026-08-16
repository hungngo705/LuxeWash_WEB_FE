export const BARRIER_GATES = Object.freeze({
  ENTRY_REGULAR: 'entryRegular',
  ENTRY_VIP: 'entryVip',
  EXIT: 'exit',
})

export const BARRIER_IDS = Object.freeze({
  [BARRIER_GATES.ENTRY_REGULAR]: 'ENTRY_REGULAR_GATE',
  [BARRIER_GATES.ENTRY_VIP]: 'ENTRY_VIP_GATE',
  [BARRIER_GATES.EXIT]: 'EXIT_GATE',
})

export function gateFromBarrierId(barrierId) {
  switch (String(barrierId ?? '').trim().toUpperCase()) {
    case 'ENTRY_VIP_GATE':
      return BARRIER_GATES.ENTRY_VIP
    case 'ENTRY_REGULAR_GATE':
    case 'ENTRY_GATE':
      return BARRIER_GATES.ENTRY_REGULAR
    case 'EXIT_GATE':
      return BARRIER_GATES.EXIT
    default:
      return null
  }
}

export function gateFromQueueLaneType(queueLaneType) {
  return String(queueLaneType ?? '').trim().toLowerCase() === 'vip'
    ? BARRIER_GATES.ENTRY_VIP
    : BARRIER_GATES.ENTRY_REGULAR
}

export function getBarrierGateLabel(gate) {
  return {
    [BARRIER_GATES.ENTRY_REGULAR]: 'cổng vào làn thường',
    [BARRIER_GATES.ENTRY_VIP]: 'cổng vào làn VIP',
    [BARRIER_GATES.EXIT]: 'cổng ra',
  }[gate] ?? 'không xác định'
}

export function getBarrierId(gate) {
  const barrierId = BARRIER_IDS[gate === 'entry' ? BARRIER_GATES.ENTRY_REGULAR : gate]
  if (!barrierId) throw new Error('Không xác định được barie cần điều khiển.')
  return barrierId
}
