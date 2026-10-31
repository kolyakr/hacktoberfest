import type { ActionReceipt } from './api/client.ts'

export type Line = { role: 'me' | 'bot'; text: string; model?: string }

export type ChatState = {
  ticketId: string | null
  lines: Line[]
  actions: ActionReceipt[]
  busy: boolean
  error: string | null
}

export const initialChat: ChatState = { ticketId: null, lines: [], actions: [], busy: false, error: null }

// Demo presets (synthetic customers from contracts/fixtures/ChatRequest.*.json), picked by `?mock=`.
const presets: Record<string, { email: string; text: string }> = {
  marta: { email: 'marta.k@example.com', text: "Hi, you charged me €38.99 and I had no idea this was a subscription. I only wanted the trial. Cancel everything and give my money back or I'm calling my bank." },
  alex: { email: 'alex.p@example.com', text: "I subscribed on my iPhone and want a refund for this week's $9.99. Also cancel it please." },
}
const mock = new URLSearchParams(window.location.search).get('mock') ?? ''
export const preset = presets[mock.split('_')[0]] ?? presets.marta

export const receiptIcon = { pending: '🟡', confirmed: '🟢', failed: '🔴' } as const
