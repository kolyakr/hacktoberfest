import { CHANNEL_LABEL, type DemoTicket } from '../data/demo'
import type { TicketStatus } from '../types'
import { StatusChip } from './StatusChip'

interface Props {
  ticket: DemoTicket
  status: TicketStatus
  approved: boolean
}

export function Conversation({ ticket, status, approved }: Props) {
  // Zavuch's pre-send hook rewrote a false promise; show it until billing confirms.
  const fixed = Boolean(ticket.badDraft) && !approved
  return (
    <section className="card convo" aria-label="Conversation">
      <div className="convo-head">
        <div>
          <div className="name">
            {ticket.name} <span className="mono muted" style={{ fontSize: 12, fontWeight: 500 }}>#{ticket.number}</span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            {CHANNEL_LABEL[ticket.channel]} · <span className="mono">{ticket.customer_ref}</span> · {ticket.plan}
          </div>
        </div>
        <span style={{ marginLeft: 'auto' }}>
          <StatusChip value={status} />
        </span>
      </div>
      <div className="understood">
        <strong>Yurko understood:</strong> {ticket.understood}
      </div>
      <div className="messages">
        {ticket.messages.map((m, i) => (
          <div key={i} className={m.fromAi ? 'msg ai' : 'msg'}>
            <div className="who">
              {m.who} · {m.time}
            </div>
            <div className="bubble">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="draft">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="label">Yurko's draft reply</span>
          <span className={fixed ? 'verdict FIX' : 'verdict PASS'} style={{ padding: '2px 8px' }}>
            {fixed ? 'FIX by Zavuch' : approved ? 'PASS · sent' : 'PASS'}
          </span>
        </div>
        {fixed && <div className="struck">{ticket.badDraft}</div>}
        <div className="draft-box">{approved ? ticket.draftAfter : ticket.draftBefore}</div>
      </div>
    </section>
  )
}
