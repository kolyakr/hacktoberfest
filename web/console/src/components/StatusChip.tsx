import type { ActionMode, ActionStatus, TicketStatus } from '../types'

const COLORS: Record<TicketStatus | ActionStatus | ActionMode, [string, string]> = {
  open: ['#f1f1ef', '#444547'],
  proposed: ['#ffe0e0', '#b3261e'],
  approved: ['#fff4d6', '#8a5a00'],
  resolved: ['#e3f3e5', '#2f8f3a'],
  escalated: ['#dff1fa', '#0f6f99'],
  executed: ['#fff4d6', '#8a5a00'],
  confirmed: ['#e3f3e5', '#2f8f3a'],
  failed: ['#fde2e2', '#c62828'],
  blocked: ['#fde2e2', '#c62828'],
  auto: ['#e3f3e5', '#2f8f3a'],
  ask: ['#fff4d6', '#8a5a00'],
  never: ['#16191e', '#ffffff'],
}

export function StatusChip({ value, prefix = '' }: { value: keyof typeof COLORS; prefix?: string }) {
  const [background, color] = COLORS[value]
  return (
    <span className="chip" style={{ background, color }}>
      {prefix}
      {value}
    </span>
  )
}
