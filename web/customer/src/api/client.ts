import type { components } from '../../../src/api/schema.gen'

export type ChatRequest = components['schemas']['ChatRequest']
// Yurko's reaction to the customer's message. Not in contracts/ yet (proposal sent to yurko + backend),
// so it is optional here; drop the `&` once schema.gen.ts has it.
export type Reaction = 'on_it' | 'sorry' | 'done' | 'shield'
export type AgentOutput = components['schemas']['AgentOutput'] & { reaction?: Reaction | null }
export type ActionReceipt = components['schemas']['ActionReceipt']
export type TicketDetail = components['schemas']['TicketDetail']

// `?mock=<case>` on the page is passed on, so the mock API (:8001) serves that fixture.
// `?mock=a,b` is a flow: the 1st message gets case a, the 2nd and later get b.
// No `?mock`: the real API (make dev, :8000).
const params = new URLSearchParams(window.location.search)
const mocks = (params.get('mock') ?? '').split(',').filter(Boolean)
const API = mocks.length ? 'http://localhost:8001' : (import.meta.env.VITE_API_URL ?? 'http://localhost:8000')
// `?delay=3000`: wait before each request, to see the typing paws (the mock answers instantly).
const delay = Number(params.get('delay')) || 0
// The deployed API runs behind an ngrok tunnel; without this header ngrok answers with its warning page.
const HEADERS = { 'ngrok-skip-browser-warning': '1' }
export const mockCase = (n: number): string | undefined => mocks[Math.min(n, mocks.length - 1)]

export async function postChat(req: ChatRequest, n = 0): Promise<AgentOutput> {
  const mock = mockCase(n)
  if (delay) await new Promise((r) => setTimeout(r, delay))
  const res = await fetch(`${API}/api/chat${mock ? `?mock=${encodeURIComponent(mock)}` : ''}`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

export async function getTicket(id: string): Promise<TicketDetail> {
  const mock = mockCase(0)
  const res = await fetch(`${API}/api/tickets/${encodeURIComponent(id)}${mock ? `?mock=${encodeURIComponent(mock)}` : ''}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}
