import type { components } from '../../../src/api/schema.gen'

export type ChatRequest = components['schemas']['ChatRequest']
export type AgentOutput = components['schemas']['AgentOutput']
export type ActionReceipt = components['schemas']['ActionReceipt']

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8001'
// `?mock=<case>` on the page is passed on, so the mock API serves that fixture.
const mock = new URLSearchParams(window.location.search).get('mock')

export async function postChat(req: ChatRequest): Promise<AgentOutput> {
  const res = await fetch(`${API}/api/chat${mock ? `?mock=${encodeURIComponent(mock)}` : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}
