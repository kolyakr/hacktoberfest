import { useEffect, useRef, useState, type FormEvent } from 'react'
import { joinRoom, supabase, type Handoff, type LiveLine, type TicketRoom } from '../../../src/live'

const WHO: Record<LiveLine['from'], string> = { customer: 'Customer', ai: 'Yurko · AI', agent: 'You', system: '' }
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

export function Live({ handoffs, active, onPick, agent }: { handoffs: Handoff[]; active?: string; onPick: (id: string) => void; agent: string }) {
  const current = handoffs.find((h) => h.ticketId === active) ?? handoffs[0]

  if (!supabase) {
    return (
      <main className="live live-off">
        <div className="ov-state glass">
          <span className="radar off" aria-hidden="true" />
          <b>Live chat is off.</b>
          <span className="muted">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to web/.env.local, then reload.</span>
        </div>
      </main>
    )
  }

  return (
    <main className="live">
      <aside className="live-list glass rise">
        <div className="queue-head">
          <h2>Waiting for a person</h2>
          <span className="count">{handoffs.length}</span>
        </div>
        {handoffs.length === 0 && (
          <p className="live-empty">
            <span className="radar" aria-hidden="true" />
            Listening. When Yurko passes a chat to the team, it shows up here with a sound.
          </p>
        )}
        {handoffs.map((h) => (
          <button key={h.ticketId} type="button" className="live-row" aria-pressed={h.ticketId === current?.ticketId} onClick={() => onPick(h.ticketId)}>
            <span className="avatar">{h.name[0]}</span>
            <span className="lr-main">
              <b>{h.name}</b>
              <span>{h.reason}</span>
            </span>
            <span className="lr-time">{time(h.at)}</span>
          </button>
        ))}
      </aside>
      {current ? <Room key={current.ticketId} h={current} agent={agent} /> : <div className="live-room glass placeholder rise" style={{ '--i': 1 } as React.CSSProperties}>Pick a chat on the left.</div>}
    </main>
  )
}

function Room({ h, agent }: { h: Handoff; agent: string }) {
  const [lines, setLines] = useState<LiveLine[]>(h.history)
  const [text, setText] = useState('')
  const room = useRef<TicketRoom | null>(null)
  const log = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const r = joinRoom(h.ticketId, {
      onLine: (l) => setLines((x) => [...x, l]),
      onHistory: (all) => setLines(all),
    }, agent)
    r.say({ from: 'system', text: `${agent} from the support team joined the chat.`, name: agent })
    room.current = r
    return () => r.leave()
  }, [h.ticketId, agent])

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' })
  }, [lines])

  function send(e: FormEvent) {
    e.preventDefault()
    const msg = text.trim()
    if (!msg) return
    setText('')
    const line = { from: 'agent' as const, text: msg, name: agent }
    setLines((x) => [...x, { ...line, at: new Date().toISOString() }])
    room.current?.say(line)
  }

  return (
    <section className="live-room glass rise" style={{ '--i': 1 } as React.CSSProperties} aria-label={`Chat with ${h.name}`}>
      <header className="convo-head">
        <span className="avatar big">{h.name[0]}</span>
        <div>
          <div className="name">{h.name}</div>
          <div className="muted mono small">{h.email} · {h.ticketId}</div>
        </div>
        <span className="live-badge"><span className="dot" />Live</span>
      </header>
      <div className="messages" ref={log}>
        {lines.map((l, i) =>
          l.from === 'system' ? (
            <div key={i} className="sys-line">{l.text}</div>
          ) : (
            <div key={i} className={`msg ${l.from}`}>
              <div className="who">{l.from === 'agent' ? (l.name ?? WHO.agent) : WHO[l.from]} · {time(l.at)}</div>
              <div className="bubble">{l.text}</div>
            </div>
          ),
        )}
      </div>
      <form className="composer" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Reply to ${h.name.split(' ')[0]}…`} aria-label="Message" autoFocus />
        <button type="submit" className="btn btn-primary" disabled={!text.trim()}>Send</button>
      </form>
    </section>
  )
}
