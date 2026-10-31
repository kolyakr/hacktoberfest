// Mirrors supabase/migrations/20261031120000_init.sql.

export type TicketStatus = 'open' | 'proposed' | 'approved' | 'resolved' | 'escalated'
export type ActionMode = 'auto' | 'ask' | 'never'
export type ActionStatus = 'proposed' | 'approved' | 'executed' | 'confirmed' | 'failed' | 'blocked'
export type Channel = 'telegram' | 'web' | 'email'

export interface TicketRow {
  id: string
  channel: Channel
  customer_ref: string
  subject: string | null
  body: string
  intent: string | null
  priority: number
  status: TicketStatus
  created_at: string
  updated_at: string
}

export interface ActionRow {
  id: string
  ticket_id: string
  tool: string
  args: Record<string, unknown>
  policy_ref: string | null
  mode: ActionMode
  status: ActionStatus
  external_ref: string | null
  approved_by: string | null
  created_at: string
  executed_at: string | null
}

export interface AuditRow {
  id: number
  ticket_id: string | null
  action_id: string | null
  actor: string
  event: string
  detail: Record<string, unknown>
  created_at: string
}

// UI-only shapes (not tables yet).
export type Verdict = 'PASS' | 'FIX' | 'BLOCK' | 'ESCALATE' | 'WAIT'

export interface Check {
  hook: string
  verdict: Verdict
  text: string
}

export interface Message {
  who: string
  time: string
  text: string
  fromAi: boolean
}
