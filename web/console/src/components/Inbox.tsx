import { useState } from 'react'
import { TICKETS, type DemoAudit, type DemoTicket } from '../data/demo'
import type { TicketStatus } from '../types'
import { ActionsPanel, type Decision } from './ActionsPanel'
import { AuditLog } from './AuditLog'
import { ChecksPanel } from './ChecksPanel'
import { Conversation } from './Conversation'
import { Queue } from './Queue'

const REJECTED_ROW: DemoAudit = { time: '10:42:30', actor: 'agent:Mykhailo', event: 'rejected', detail: { note: 'sent back to Yurko with a note' } }

export function Inbox() {
  const [selected, setSelected] = useState(TICKETS[0].id)
  const [decisions, setDecisions] = useState<Record<string, Decision | undefined>>({})

  const statusOf = (t: DemoTicket): TicketStatus => {
    if (t.status !== 'proposed') return t.status
    if (decisions[t.id] === 'approved') return 'resolved'
    if (decisions[t.id] === 'rejected') return 'open'
    return 'proposed'
  }

  const ticket = TICKETS.find((t) => t.id === selected) ?? TICKETS[0]
  const decision = decisions[ticket.id]
  const approved = decision === 'approved'
  const status = statusOf(ticket)
  const checks = approved && ticket.checksAfter ? ticket.checksAfter : ticket.checksBefore
  const audit = [
    ...ticket.auditBefore,
    ...(approved && ticket.auditAfter ? ticket.auditAfter : []),
    ...(decision === 'rejected' ? [REJECTED_ROW] : []),
  ]

  return (
    <main className="inbox">
      <Queue tickets={TICKETS} selected={ticket.id} statusOf={statusOf} onSelect={setSelected} />
      <Conversation ticket={ticket} status={status} approved={approved} />
      <aside className="side">
        <ActionsPanel
          actions={ticket.actions}
          decision={decision}
          canDecide={status === 'proposed'}
          onDecide={(d) => setDecisions({ ...decisions, [ticket.id]: d })}
        />
        <ChecksPanel checks={checks} />
      </aside>
      <AuditLog ticketNumber={ticket.number} rows={audit} />
    </main>
  )
}
