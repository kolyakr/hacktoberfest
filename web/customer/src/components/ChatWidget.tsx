import { useEffect, useRef, useState, type FormEvent } from 'react'
import { brand } from '../brand.ts'
import { postChat } from '../api/client.ts'
import { initialChat, preset, receiptIcon, type ChatState } from '../chat.ts'

type Props = { open: boolean }

export function ChatWidget({ open }: Props) {
  const logRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<ChatState>(initialChat)
  const [email, setEmail] = useState(preset.email)
  const [text, setText] = useState(preset.text)
  const { lines, actions, busy, error } = state

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [state, open])

  async function send(e: FormEvent) {
    e.preventDefault()
    const msg = text.trim()
    if (!msg || !email.trim() || busy) return
    setText('')
    setState((s) => ({ ...s, busy: true, error: null, lines: [...s.lines, { role: 'me', text: msg }] }))
    try {
      const out = await postChat({ ticket_id: state.ticketId, email: email.trim(), text: msg })
      setState((s) => ({
        ...s,
        busy: false,
        ticketId: out.ticket_id,
        actions: out.actions,
        lines: out.reply ? [...s.lines, { role: 'bot', text: out.reply.text, model: out.reply.model ?? out.model }] : s.lines,
      }))
    } catch {
      setState((s) => ({ ...s, busy: false, error: "Couldn't reach support. Please try again." }))
      setText(msg)
    }
  }

  return (
    <section className={open ? 'chat open' : 'chat'} id="chat" aria-label={`Chat with ${brand.assistant}`}>
      <div className="head">
        <img src={brand.mascot} alt="" />
        <div>
          <div className="n">{brand.assistant} <span className="demo" style={{ background: 'rgba(255,255,255,.25)', color: '#fff' }}>Demo</span></div>
          <div className="s">{brand.name} support · AI assistant</div>
        </div>
        <button type="button" onClick={() => { setState(initialChat); setText(preset.text) }}>Restart</button>
      </div>

      <div className="log" ref={logRef} aria-live="polite">
        {lines.length === 0 && !busy && (
          <div className="bot">Hi! I'm {brand.assistant}. Tell me what happened with your subscription, and I'll sort it out.</div>
        )}
        {lines.map((l, i) => (
          <div key={i} className={l.role}>
            {l.text}
            {l.model && <div className="model">{l.model}</div>}
          </div>
        ))}
        {actions.length > 0 && (
          <div className="receipt">
            <div className="h">Your requests</div>
            <dl>
              {actions.map((a) => (
                <div key={a.id} style={{ display: 'contents' }}>
                  <dt>{a.action.replace(/_/g, ' ')}{a.amount != null ? ` · ${a.amount} ${a.currency ?? ''}` : ''}</dt>
                  <dd>{receiptIcon[a.status]} {a.status}</dd>
                </div>
              ))}
            </dl>
            {state.ticketId && <div className="ref">Ticket {state.ticketId}</div>}
          </div>
        )}
        {busy && <div className="pill wait">{brand.assistant} is checking your account…</div>}
        {error && <div className="pill err" role="alert">{error}</div>}
      </div>

      <form className="composer" onSubmit={send}>
        <input className="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" aria-label="Email" required />
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" aria-label="Message" />
        <button type="submit" aria-label="Send" disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M9.5 4.5L14 9l-4.5 4.5" fill="none" stroke="#fff" strokeWidth="2.2" /></svg>
        </button>
      </form>
    </section>
  )
}
