import type { components } from '../../../src/api/schema.gen'

type S = components['schemas']
export type TicketSummary = S['TicketSummary']
export type TicketDetail = S['TicketDetail']
export type ActionReceipt = S['ActionReceipt']
export type Verdict = S['Verdict']
export type AgentOutput = S['AgentOutput']

const mock = new URLSearchParams(window.location.search).get('mock')
// `?mock=<case>` uses the mock API (:8001); otherwise the real one (make dev, :8000).
export const API = mock ? 'http://localhost:8001' : (import.meta.env.VITE_API_URL ?? 'http://localhost:8000')
const q = mock ? `?mock=${encodeURIComponent(mock)}` : ''

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}${q}`, init)
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

export const getTickets = () => call<{ tickets: TicketSummary[] }>('/api/tickets').then((r) => r.tickets)
export const getTicket = (id: string) => call<TicketDetail>(`/api/tickets/${encodeURIComponent(id)}`)
export const decide = (id: string, approve: boolean, agent_name: string) =>
  call<AgentOutput>(`/api/tickets/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approve, agent_name, note: '' }),
  })

/** customer_name, or "leo.21@example.com" -> "Leo" for customers billing doesn't know. */
export const who = (t: { customer_name?: string | null; customer_email: string }) =>
  t.customer_name ?? t.customer_email.split(/[.@]/)[0].replace(/^./, (c) => c.toUpperCase())
