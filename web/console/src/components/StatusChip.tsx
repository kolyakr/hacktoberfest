import type { ActionMode, ActionStatus, TicketStatus } from '../types'

const COLORS: Record<TicketStatus | ActionStatus | ActionMode | 'awaiting_human' | 'waiting_billing' | 'pending', [string, string]> = {
  open: ['rgb(30 36 80 / .07)', '#454b68'],
  awaiting_human: ['rgb(226 61 98 / .12)', '#b51d43'],
  waiting_billing: ['rgb(240 169 46 / .18)', '#8a5a00'],
  pending: ['rgb(240 169 46 / .18)', '#8a5a00'],
  proposed: ['rgb(226 61 98 / .12)', '#b51d43'],
  approved: ['rgb(240 169 46 / .18)', '#8a5a00'],
  resolved: ['rgb(15 159 110 / .13)', '#0b7a55'],
  escalated: ['rgb(61 111 240 / .13)', '#2450c4'],
  executed: ['rgb(240 169 46 / .18)', '#8a5a00'],
  confirmed: ['rgb(15 159 110 / .13)', '#0b7a55'],
  failed: ['rgb(226 61 98 / .12)', '#b51d43'],
  blocked: ['rgb(226 61 98 / .12)', '#b51d43'],
  auto: ['rgb(15 159 110 / .13)', '#0b7a55'],
  ask: ['rgb(240 169 46 / .18)', '#8a5a00'],
  never: ['#14172b', '#ffffff'],
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
