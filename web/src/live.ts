// Live handoff chat between the customer site and the console, over Supabase Realtime Broadcast.
// No tables: the customer's browser holds the history and sends it when a person joins.
import { createClient, type RealtimeChannel } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase = url && key ? createClient(url, key) : null

/** One chat line as both sites see it. `customer` is the person asking for help. */
export type LiveLine = { from: 'customer' | 'ai' | 'agent' | 'system'; text: string; at: string; name?: string }

/** Sent to the lobby when the AI passes a customer to a person. */
export type Handoff = { ticketId: string; name: string; email: string; reason: string; at: string; history: LiveLine[] }

const LOBBY = 'countersign-lobby'
const now = () => new Date().toISOString()

function channel(name: string): RealtimeChannel | null {
  return supabase ? supabase.channel(name, { config: { broadcast: { self: false } } }) : null
}

function ready(ch: RealtimeChannel): Promise<void> {
  return new Promise((resolve) => ch.subscribe((s) => s === 'SUBSCRIBED' && resolve()))
}

/** Console side: hears every handoff, and asks waiting customers to say so again on join. */
export function watchLobby(onHandoff: (h: Handoff) => void): () => void {
  const ch = channel(LOBBY)
  if (!ch) return () => {}
  ch.on('broadcast', { event: 'handoff' }, ({ payload }) => onHandoff(payload as Handoff))
  void ready(ch).then(() => ch.send({ type: 'broadcast', event: 'who_waits', payload: {} }))
  return () => void supabase?.removeChannel(ch)
}

/** Customer side: tells the console it needs a person, and repeats it when a console comes online. */
export function announce(handoff: () => Handoff): () => void {
  const ch = channel(LOBBY)
  if (!ch) return () => {}
  const send = () => ch.send({ type: 'broadcast', event: 'handoff', payload: handoff() })
  ch.on('broadcast', { event: 'who_waits' }, send)
  void ready(ch).then(send)
  return () => void supabase?.removeChannel(ch)
}

export type TicketRoom = {
  say: (line: Omit<LiveLine, 'at'>) => void
  leave: () => void
}

type RoomEvents = {
  onLine: (line: LiveLine) => void
  /** Customer: a person opened the chat and wants the history. */
  onHistoryAsked?: () => LiveLine[]
  /** Console: the customer's full history. */
  onHistory?: (lines: LiveLine[]) => void
}

/** One ticket's room. The console asks for the history once it is in. */
export function joinRoom(ticketId: string, ev: RoomEvents, asAgent?: string): TicketRoom {
  const ch = channel(`ticket-${ticketId}`)
  if (!ch) return { say: () => {}, leave: () => {} }
  ch.on('broadcast', { event: 'line' }, ({ payload }) => ev.onLine(payload as LiveLine))
  ch.on('broadcast', { event: 'history_ask' }, () => {
    const lines = ev.onHistoryAsked?.()
    if (lines) void ch.send({ type: 'broadcast', event: 'history', payload: { lines } })
  })
  ch.on('broadcast', { event: 'history' }, ({ payload }) => ev.onHistory?.((payload as { lines: LiveLine[] }).lines))
  const joined = ready(ch).then(() => {
    if (asAgent) void ch.send({ type: 'broadcast', event: 'history_ask', payload: {} })
  })
  return {
    say: (line) => void joined.then(() => ch.send({ type: 'broadcast', event: 'line', payload: { ...line, at: now() } })),
    leave: () => void supabase?.removeChannel(ch),
  }
}

export { now }
