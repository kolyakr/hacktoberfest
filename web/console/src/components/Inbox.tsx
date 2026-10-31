import { useEffect, useState } from 'react'
import { decide, getTicket, getTickets, who, type ActionReceipt, type TicketDetail, type TicketSummary, type Verdict } from '../api/tickets'
import { StatusChip } from './StatusChip'

const POLL_MS = 2000
const ICON = { pending: '🟡', confirmed: '🟢', failed: '🔴' } as const
const WHO = { customer: 'Customer', yurko: 'Yurko · AI', human: 'Support', system: 'System' } as const
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const money = (n?: number | null, cur?: string | null) => (n == null ? '' : ` · ${n} ${cur ?? ''}`)

/** Calls `load` now and every 2 s; keeps the last good value when a poll fails. */
function usePoll<T>(load: (() => Promise<T>) | null, deps: unknown[]) {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<string>()
  useEffect(() => {
    if (!load) return
    let alive = true
    const tick = () =>
      load()
        .then((d) => alive && (setData(d), setError(undefined)))
        .catch((e: Error) => alive && setError(e.message))
    void tick()
    const t = setInterval(tick, POLL_MS)
    return () => { alive = false; clearInterval(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, error }
}

export function Inbox({ initial, agent }: { initial?: string; agent: string }) {
  const list = usePoll(getTickets, [])
  const tickets = list.data ?? []
  const [picked, setPicked] = useState(initial)
  const selected = picked ?? tickets[0]?.id
  const detail = usePoll(selected ? () => getTicket(selected) : null, [selected])

  if (!list.data && list.error) {
    return (
      <main className="inbox">
        <div className="ov-state" role="alert">
          <b>Couldn't load tickets.</b>
          <span className="muted">{list.error}. Start the API with <code>make dev</code> (port 8000).</span>
        </div>
      </main>
    )
  }
  if (!list.data) return <main className="inbox"><div className="ov-state">Loading tickets…</div></main>
  if (!tickets.length) {
    return (
      <main className="inbox">
        <div className="ov-state">
          <b>No tickets yet.</b>
          <span className="muted">Write to Yurko in the customer chat. The ticket shows up here in 2 seconds.</span>
        </div>
      </main>
    )
  }

  const t = detail.data?.id === selected ? detail.data : undefined
  return (
    <main className="inbox">
      <Queue tickets={tickets} selected={selected} onSelect={setPicked} />
      {t ? (
        <>
          <Conversation t={t} />
          <aside className="side">
            <Receipts t={t} agent={agent} />
            <Checks verdicts={t.verdicts} />
          </aside>
          <Events t={t} />
        </>
      ) : (
        <section className="card convo"><div className="ov-state">{detail.error ? `Couldn't load ${selected}: ${detail.error}` : 'Loading ticket…'}</div></section>
      )}
    </main>
  )
}

function Queue({ tickets, selected, onSelect }: { tickets: TicketSummary[]; selected?: string; onSelect: (id: string) => void }) {
  const sorted = [...tickets].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  return (
    <section className="card queue" aria-label="Ticket queue">
      <div className="queue-head">
        <h2>Queue</h2>
        <span className="muted" style={{ fontSize: 12 }}>live · every 2 s</span>
      </div>
      {sorted.map((t) => (
        <button key={t.id} type="button" className="queue-row" aria-pressed={t.id === selected} onClick={() => onSelect(t.id)}>
          <div className="row-between">
            <span style={{ fontWeight: 700 }}>{who(t)}</span>
            <span className="mono muted" style={{ fontSize: 11 }}>{t.id}</span>
          </div>
          <div className="snippet">{t.subject}</div>
          <div className="row-tags">
            {t.chargeback_threat && <span className="prio p1">bank threat</span>}
            {t.last_decision && <span className={`verdict ${t.last_decision}`}>{t.last_decision}</span>}
            <StatusChip value={t.status} />
          </div>
        </button>
      ))}
    </section>
  )
}

function Conversation({ t }: { t: TicketDetail }) {
  const c = t.classification
  // Drafts Zavuch sent back, each with the FIX reason it got (same order).
  const fixes = t.verdicts.filter((v) => v.hook === 'before_reply' && v.decision === 'FIX')
  return (
    <section className="card convo" aria-label="Conversation">
      <div className="convo-head">
        <div>
          <div className="name">
            {t.customer?.name ?? 'Past ticket'} <span className="mono muted" style={{ fontSize: 12, fontWeight: 500 }}>#{t.id}</span>
          </div>
          {t.customer && (
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              <span className="mono">{t.customer.email}</span> · {t.customer.country} · {t.customer.subscription?.platform ?? 'no plan'}
              {t.customer.subscription && ` · ${t.customer.subscription.plan} ${t.customer.subscription.price} ${t.customer.subscription.currency}`}
            </div>
          )}
        </div>
        <span style={{ marginLeft: 'auto' }}><StatusChip value={t.status} /></span>
      </div>
      {c && (
        <div className="understood">
          <strong>Yurko understood:</strong> {c.true_goal}
          <span className="muted"> · {c.intents.join(' + ')} · {c.sentiment}{c.chargeback_threat ? ' · bank threat' : ''}{c.injection_suspected ? ' · injection!' : ''}</span>
        </div>
      )}
      <div className="messages">
        {t.messages.map((m) => (
          <div key={m.id} className={m.role === 'customer' ? 'msg' : 'msg ai'}>
            <div className="who">{WHO[m.role]} · {time(m.at)}{m.model ? ` · ${m.model}` : ''}</div>
            <div className="bubble">{m.text}</div>
          </div>
        ))}
      </div>
      {t.rejected_drafts.length > 0 && (
        <div className="draft">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="label">Drafts Zavuch stopped</span>
            <span className="verdict FIX" style={{ padding: '2px 8px' }}>FIX × {t.rejected_drafts.length}</span>
          </div>
          {t.rejected_drafts.map((d, i) => (
            <div key={i}>
              <div className="struck">{d}</div>
              {fixes[i] && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Why: {fixes[i].reason}</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Receipts({ t, agent }: { t: TicketDetail; agent: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const p = t.pending_action
  const send = (approve: boolean) => {
    setBusy(true)
    setError(undefined)
    decide(t.id, approve, agent)
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false))
  }
  return (
    <section className="card pad" aria-label="Actions">
      <h2>Actions in billing</h2>
      {t.receipts.length === 0 && !p && <p className="sub">No action taken.</p>}
      {t.receipts.map((r: ActionReceipt) => (
        <div key={r.id} className="action">
          <div className="row-between">
            <span className="tool">{ICON[r.status]} {r.action}{money(r.amount, r.currency)}</span>
            <StatusChip value={r.status} />
          </div>
          <div className="args">{r.target_id} · key {r.idempotency_key}</div>
          <div className="meta">
            {r.billing_ref && <span className="ref-ok">✓ {r.billing_ref}</span>}
            {r.evidence.map((e) => <span key={e} className="tag mono">{e}</span>)}
            {r.failure_reason && <span className="tag">{r.failure_reason}</span>}
          </div>
        </div>
      ))}
      {p && (
        <div className="action">
          <div className="row-between">
            <span className="tool">{p.tool}{money(p.amount, null)}</span>
            <StatusChip value="awaiting_human" />
          </div>
          <div className="args">{p.reason}</div>
          <div className="meta"><span className="tag mono">{p.policy_clause}</span></div>
          {t.status === 'awaiting_human' && (
            <div className="decide">
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => send(true)}>{busy ? 'Sending…' : 'Allow'}</button>
              <button type="button" className="btn" disabled={busy} onClick={() => send(false)}>Deny</button>
            </div>
          )}
          {error && <p className="login-error" role="alert">{error}</p>}
        </div>
      )}
    </section>
  )
}

function Checks({ verdicts }: { verdicts: Verdict[] }) {
  return (
    <section className="card pad" aria-label="Zavuch checks">
      <h2>Zavuch checks</h2>
      <p className="sub">Rules in code around every action and every reply.</p>
      {verdicts.length === 0 && <p className="sub">No checks yet.</p>}
      {verdicts.map((v, i) => (
        <div key={i} className="check">
          <span className={`verdict ${v.decision}`}>{v.decision}</span>
          <div>
            <div className="hook">{v.hook} · <span className="mono">{v.rule}</span>{v.action ? ` · ${v.action.tool}` : ''}</div>
            <div className="text">{v.reason}</div>
          </div>
        </div>
      ))}
    </section>
  )
}

function Events({ t }: { t: TicketDetail }) {
  return (
    <section className="card audit" aria-label="Audit log">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <h2>Audit log</h2>
        <span className="muted" style={{ fontSize: 12 }}>ticket #{t.id} · append-only</span>
      </div>
      {t.events.length === 0 ? <p className="sub">No events yet.</p> : (
        <div className="table-wrap">
          <table style={{ minWidth: 640, fontSize: 13 }}>
            <thead><tr><th style={{ width: 90 }}>Time</th><th style={{ width: 180 }}>Event</th><th>Detail</th></tr></thead>
            <tbody>
              {t.events.map((e) => (
                <tr key={e.id}>
                  <td className="mono muted">{time(e.at)}</td>
                  <td style={{ fontWeight: 700 }}>{e.type}</td>
                  <td style={{ color: 'var(--ink-2)' }}>{Object.entries(e.data).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
