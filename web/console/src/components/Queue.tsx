import { CHANNEL_LABEL, type DemoTicket } from '../data/demo'
import type { TicketStatus } from '../types'
import { StatusChip } from './StatusChip'

interface Props {
  tickets: DemoTicket[]
  selected: string
  statusOf: (t: DemoTicket) => TicketStatus
  onSelect: (id: string) => void
}

export function Queue({ tickets, selected, statusOf, onSelect }: Props) {
  return (
    <section className="card queue" aria-label="Ticket queue">
      <div className="queue-head">
        <h2>Queue</h2>
        <span className="muted" style={{ fontSize: 12 }}>by priority</span>
      </div>
      {tickets.map((t) => (
        <button key={t.id} type="button" className="queue-row" aria-pressed={t.id === selected} onClick={() => onSelect(t.id)}>
          <div className="row-between">
            <span style={{ fontWeight: 700 }}>{t.name}</span>
            <span className="mono muted" style={{ fontSize: 11 }}>{t.age}</span>
          </div>
          <div className="snippet">{t.body}</div>
          <div className="row-tags">
            <span className={t.priority === 1 ? 'prio p1' : 'prio'}>P{t.priority}</span>
            <span className="tag">{t.intent}</span>
            <span className="muted" style={{ fontSize: 11 }}>{CHANNEL_LABEL[t.channel]}</span>
            <StatusChip value={statusOf(t)} />
          </div>
        </button>
      ))}
    </section>
  )
}
