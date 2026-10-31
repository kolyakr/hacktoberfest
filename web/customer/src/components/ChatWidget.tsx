import { useEffect, useRef, useState, type FormEvent } from 'react'
import { announce, joinRoom, now, supabase, type LiveLine, type TicketRoom } from '../../../src/live'
import { brand } from '../brand.ts'
import { getTicket, postChat } from '../api/client.ts'
import { initialChat, nameFrom, pickReaction, presetFor, reactionEmoji, receiptIcon, type ChatState, type Line } from '../chat.ts'

const toLive = (l: Line): LiveLine => ({
  from: l.role === 'me' ? 'customer' : l.role === 'bot' ? 'ai' : l.role === 'human' ? 'agent' : 'system',
  text: l.text,
  at: now(),
  name: l.name,
})

type Props = { open: boolean; onClose: () => void }

// One paw print; three of them "walk" across the typing bubble.
function Paw() {
  return (
    <svg className="paw" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="currentColor">
        <ellipse cx="12" cy="16" rx="5" ry="4.2" />
        <circle cx="5.5" cy="10.5" r="2.2" />
        <circle cx="9.5" cy="6.5" r="2.2" />
        <circle cx="14.5" cy="6.5" r="2.2" />
        <circle cx="18.5" cy="10.5" r="2.2" />
      </g>
    </svg>
  )
}

// Puts the reaction on the newest customer message.
function react(lines: Line[], reaction: Line['reaction']): Line[] {
  const i = lines.map((l) => l.role).lastIndexOf('me')
  return i < 0 ? lines : lines.map((l, j) => (j === i ? { ...l, reaction } : l))
}

export function ChatWidget({ open, onClose }: Props) {
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ChatState>(initialChat)
  const [email, setEmail] = useState(presetFor(0).email)
  const [text, setText] = useState(presetFor(0).text)
  const { lines, actions, busy, error, handoff, agent } = state
  const linesRef = useRef(lines)
  linesRef.current = lines
  const roomRef = useRef<TicketRoom | null>(null)

  // Handed to a person: open the ticket room, and ring the console until someone joins.
  useEffect(() => {
    const id = state.ticketId
    if (!handoff || !id) return
    const room = joinRoom(id, {
      onLine: (l) => {
        if (l.from === 'agent') setState((s) => ({ ...s, lines: [...s.lines, { role: 'human', text: l.text, name: l.name }] }))
        if (l.from === 'system') setState((s) => ({ ...s, agent: l.name ?? 'Support', lines: [...s.lines, { role: 'system', text: l.text }] }))
      },
      onHistoryAsked: () => linesRef.current.map(toLive),
    })
    roomRef.current = room
    return () => { room.leave(); roomRef.current = null }
  }, [handoff, state.ticketId])

  useEffect(() => {
    const id = state.ticketId
    if (!handoff || agent || !id) return
    const last = [...linesRef.current].reverse().find((l) => l.role === 'me')
    return announce(() => ({
      ticketId: id,
      name: nameFrom(email),
      email,
      reason: last?.text ?? '',
      at: now(),
      history: linesRef.current.map(toLive),
    }))
  }, [handoff, agent, state.ticketId, email])

  // After Yurko answers, watch the ticket every 2 s until it is resolved or escalated:
  // receipts go 🟡 → 🟢 and Yurko's follow-up ("refund confirmed") shows up without a reload.
  const done = state.status === 'resolved' || state.status === 'escalated'
  useEffect(() => {
    const id = state.ticketId
    if (!id || busy || done) return
    const t = setInterval(() => {
      getTicket(id).then((d) => setState((s) => {
        if (s.ticketId !== d.id) return s
        const fresh = d.messages.filter((m) => (m.role === 'yurko' || m.role === 'human') && !s.seen.includes(m.id))
        return {
          ...s,
          status: d.status,
          actions: d.receipts,
          seen: [...s.seen, ...fresh.map((m) => m.id)],
          lines: [...s.lines, ...fresh.map((m) => ({ role: m.role === 'yurko' ? 'bot' as const : 'human' as const, text: m.text, model: m.model ?? undefined, name: m.role === 'human' ? 'Support' : undefined }))],
        }
      })).catch(() => {})
    }, 2000)
    return () => clearInterval(t)
  }, [state.ticketId, busy, done])

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [state, open])

  // Open: focus the message box. Esc closes the panel.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 350)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  async function send(e: FormEvent) {
    e.preventDefault()
    const msg = text.trim()
    if (!msg || !email.trim() || busy) return
    setText('')
    if (handoff) {
      setState((s) => ({ ...s, lines: [...s.lines, { role: 'me', text: msg }] }))
      roomRef.current?.say({ from: 'customer', text: msg, name: nameFrom(email) })
      return
    }
    setState((s) => ({ ...s, busy: true, error: null, lines: [...s.lines, { role: 'me', text: msg, reaction: 'seen' }] }))
    try {
      const sent = state.lines.filter((l) => l.role === 'me').length
      const out = await postChat({ ticket_id: state.ticketId, email: email.trim(), text: msg }, sent)
      const toHuman = out.status === 'awaiting_human' || out.status === 'escalated'
      setText(toHuman ? '' : presetFor(sent + 1).text)
      setState((s) => ({
        ...s,
        busy: false,
        ticketId: out.ticket_id,
        status: out.status,
        actions: out.actions.length ? out.actions : s.actions,
        seen: out.reply ? [...s.seen, out.reply.id] : s.seen,
        handoff: s.handoff || toHuman,
        lines: [
          ...react(s.lines, pickReaction(out) ?? undefined),
          ...(out.reply ? [{ role: 'bot' as const, text: out.reply.text, model: out.reply.model ?? out.model }] : []),
          ...(toHuman && !s.handoff
            ? [{ role: 'system' as const, text: supabase ? 'Passing you to a person on our team. Stay in this chat.' : 'A person on our team will reply here.' }]
            : []),
        ],
      }))
    } catch {
      setState((s) => ({ ...s, busy: false, lines: react(s.lines, undefined), error: "Couldn't reach support. Please try again." }))
      setText(msg)
    }
  }

  return (
    <section className={open ? 'chat open' : 'chat'} id="chat" aria-label={`Chat with ${brand.assistant}`} inert={!open}>
      <div className="head">
        <span className="ava"><img src={brand.mascot} alt="" /><i className="online" aria-hidden="true" /></span>
        <div>
          <div className="n">{brand.assistant} <span className="demo" style={{ background: 'rgba(255,255,255,.25)', color: '#fff' }}>Demo</span></div>
          <div className="s">{busy ? 'typing…' : agent ? `${agent} · ${brand.name} support team` : handoff ? 'Waiting for a person…' : `${brand.name} support · AI assistant`}</div>
        </div>
        <button type="button" onClick={() => { setState(initialChat); setText(presetFor(0).text) }}>Restart</button>
        <button type="button" className="x" onClick={onClose} aria-label="Close chat">✕</button>
      </div>

      <div className="log" ref={logRef} aria-live="polite">
        {lines.length === 0 && !busy && (
          <div className="bot">Hi! I'm {brand.assistant}. Tell me what happened with your subscription, and I'll sort it out.</div>
        )}
        {lines.map((l, i) => (
          <div key={i} className={l.reaction ? `${l.role} reacted` : l.role}>
            {l.reaction && (
              <span key={l.reaction} className={`react ${l.reaction}`} role="img" aria-label={reactionEmoji[l.reaction][1]} title={reactionEmoji[l.reaction][1]}>
                {reactionEmoji[l.reaction][0]}
              </span>
            )}
            {l.role === 'human' && <div className="who">{l.name} · support team</div>}
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
                  <dd key={a.status} className={a.status}>{receiptIcon[a.status]} {a.status}</dd>
                </div>
              ))}
            </dl>
            {state.ticketId && <div className="ref">Ticket {state.ticketId}</div>}
          </div>
        )}
        {busy && (
          <div className="bot typing" role="status" aria-label={`${brand.assistant} is checking your account`}>
            <Paw /><Paw /><Paw /><Paw />
            <span className="thinking">{brand.assistant} is checking your account and billing. This can take up to a minute.</span>
          </div>
        )}
        {error && <div className="pill err" role="alert">{error}</div>}
      </div>

      <form className="composer" onSubmit={send}>
        <input className="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" aria-label="Email" required />
        <input ref={inputRef} type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" aria-label="Message" />
        <button type="submit" aria-label="Send" disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M9.5 4.5L14 9l-4.5 4.5" fill="none" stroke="#fff" strokeWidth="2.2" /></svg>
        </button>
      </form>
    </section>
  )
}
