import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import type { Handoff } from '../../../src/live'
import { getReport, type OlyaReport } from '../api/report'
import { getTickets, who, type TicketSummary } from '../api/tickets'
import { COUNTRIES, DAILY, PRODUCT_TICKET } from '../data/demo'
import { DailyChart } from './charts/DailyChart'
import { useCountUp } from './charts/hooks'
import { STEPS, WorldMap } from './charts/WorldMap'

type Load = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ok'; report: OlyaReport }

const TOP = [...COUNTRIES].sort((a, b) => b.tickets - a.tickets).slice(0, 5)
const at = (i: number) => ({ '--i': i }) as CSSProperties
const SYMBOL: Record<string, string> = { EUR: '€', USD: '$', GBP: '£' }
const money = (cur: string, n: number) =>
  `${SYMBOL[cur] ?? `${cur} `}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function Overview({ onOpen, handoffs = [], onLive }: { onOpen: (id: string) => void; handoffs?: Handoff[]; onLive: (id: string) => void }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const fetchReport = useCallback(() => {
    setLoad({ state: 'loading' })
    getReport()
      .then((report) => setLoad({ state: 'ok', report }))
      .catch((e: Error) => setLoad({ state: 'error', message: e.message }))
  }, [])
  useEffect(fetchReport, [fetchReport])

  return (
    <main className="ov">
      <header className="ov-head rise">
        <div>
          <p className="ov-kicker">Last 7 days · 25–31 Oct</p>
          <h1>Support <em>this week</em></h1>
        </div>
        <div className="hero-side">
          <figure className="frost">
            <figcaption>Zavuch stopped a false promise</figcaption>
            <p className="was"><span>Yurko wrote</span><s>Your money is already back on your card.</s></p>
            <p className="now"><span>Customer got</span>Your refund is on its way. It can take up to 15 business days.</p>
            <span className="chip-fix">Why: billing has not confirmed it yet</span>
          </figure>
          {load.state === 'ok' && load.report.model && (
            <span className="model">Numbers from code · words by <b>{load.report.model}</b></span>
          )}
          <button type="button" className="btn small" onClick={fetchReport} disabled={load.state === 'loading'}>
            {load.state === 'loading' ? 'Olya is reading…' : 'Refresh'}
          </button>
        </div>
      </header>

      <NeedsYou onOpen={onOpen} handoffs={handoffs} onLive={onLive} />

      {load.state === 'loading' && (
        <>
          <p className="muted" role="status" style={{ margin: '0 4px' }}>Olya is reading this week's tickets. The summary comes from gpt-5, so it takes about 15 seconds.</p>
          <Skeleton />
        </>
      )}
      {load.state === 'error' && (
        <div className="ov-state rise" role="alert">
          <b>Couldn't load this week's numbers.</b>
          <span className="muted">{load.message}. Check that the API is running, then try again.</span>
          <button type="button" className="btn" onClick={fetchReport}>Try again</button>
        </div>
      )}
      {load.state === 'ok' && load.report.tickets_total === 0 && (
        <div className="ov-state rise">
          <b>No tickets yet this week.</b>
          <span className="muted">When customers write to Yurko, Olya counts them here.</span>
        </div>
      )}
      {load.state === 'ok' && load.report.tickets_total > 0 && <Report r={load.report} />}
    </main>
  )
}

function NeedsYou({ onOpen, handoffs, onLive }: { onOpen: (id: string) => void; handoffs: Handoff[]; onLive: (id: string) => void }) {
  // Real tickets that wait for a person; polled, it's a cheap call.
  const [waiting, setWaiting] = useState<TicketSummary[]>([])
  useEffect(() => {
    const tick = () => getTickets().then((ts) => setWaiting(ts.filter((t) => t.status === 'awaiting_human' || t.status === 'escalated'))).catch(() => {})
    void tick()
    const t = setInterval(tick, 2000)
    return () => clearInterval(t)
  }, [])
  const total = waiting.length + handoffs.length
  if (!total) {
    return <section className="needs calm rise" style={at(1)}>Nothing waits for you. Yurko has it.</section>
  }
  return (
    <section className="needs rise" style={at(1)} aria-label="Waiting for you">
      <h2>
        <span className="pulse" aria-hidden="true" />
        {total} {total === 1 ? 'ticket waits' : 'tickets wait'} for you
      </h2>
      <ul>
        {handoffs.map((h) => (
          <li key={h.ticketId} className="hot">
            <button type="button" onClick={() => onLive(h.ticketId)}>
              <span className="who">{h.name}</span>
              <span className="what">{h.reason}</span>
              <span className="why live">● Live · reply now</span>
              <span className="go" aria-hidden="true">→</span>
            </button>
          </li>
        ))}
        {waiting.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => onOpen(t.id)}>
              <span className="who">{who(t)}</span>
              <span className="what">{t.subject}</span>
              <span className="why">{t.status === 'awaiting_human' ? 'Allow or deny' : 'Escalated · check it'}</span>
              <span className="go" aria-hidden="true">→</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Report({ r }: { r: OlyaReport }) {
  const [created, setCreated] = useState(false)
  const pct = useCountUp(r.resolved_without_human_pct)
  const first = useCountUp(r.avg_first_response_s)
  const caught = useCountUp(r.false_done_caught)
  const refunds = Object.entries(r.refunded_by_currency).sort((a, b) => b[1] - a[1])
  const lead = useCountUp(refunds[0]?.[1] ?? 0)

  return (
    <>
      <section className="stats rise" style={at(2)} aria-label="Key numbers">
        <div className="stat">
          <span className="s-label">Solved by AI alone</span>
          <span className="s-value">{pct.toFixed(0)}<small>%</small></span>
          <span className="meter"><span style={{ width: `${pct}%` }} /></span>
          <span className="s-note">{r.resolved_without_human} of {r.tickets_total} tickets, no person needed</span>
        </div>
        <div className="stat">
          <span className="s-label">First reply</span>
          <span className="s-value">{first.toFixed(0)}<small> s</small></span>
          <span className="s-note">average wait before the customer gets an answer</span>
        </div>
        <div className="stat">
          <span className="s-label">Fake “done” stopped</span>
          <span className="s-value">{caught.toFixed(0)}</span>
          <span className="s-note">replies Zavuch held back · {r.zavuch_caught} catches in total</span>
        </div>
        <div className="stat">
          <span className="s-label">Refunded, confirmed by billing</span>
          <span className="s-value">{refunds[0] ? money(refunds[0][0], lead) : '—'}</span>
          <span className="s-note">{refunds.slice(1).map(([c, n]) => `+ ${money(c, n)}`).join(' ') || 'one currency'}</span>
        </div>
      </section>

      <div className="ov-grid">
        <section className="panel rise" style={at(3)} aria-label="Tickets per day">
          <div className="p-head">
            <div>
              <h2>Tickets per day</h2>
              <p>Pink is where a person had to step in. Sample history, not live data.</p>
            </div>
            <div className="key">
              <span><i style={{ background: 'var(--s-ai)' }} />AI solved</span>
              <span><i style={{ background: 'var(--s-human)' }} />Human needed</span>
            </div>
          </div>
          <DailyChart days={DAILY} />
        </section>

        <section className="panel rise" style={at(4)} aria-label="Where tickets come from">
          <div className="p-head">
            <div>
              <h2>Where tickets come from</h2>
              <p>The country decides the refund rule. Sample history, not live data.</p>
            </div>
          </div>
          <div className="geo">
            <WorldMap countries={COUNTRIES} />
            <ol className="rank">
              {TOP.map((c) => (
                <li key={c.id}>
                  <span>{c.name}</span>
                  <b>{c.tickets}</b>
                  <span className="t-bar"><span style={{ width: `${(c.tickets / TOP[0].tickets) * 100}%` }} /></span>
                </li>
              ))}
            </ol>
          </div>
          <div className="key steps">
            {STEPS.map((s) => <span key={s.label}><i style={{ background: s.fill }} />{s.label}</span>)}
          </div>
        </section>
      </div>

      {r.top_reason && (
        <section className="finding rise" style={at(5)} aria-label="Olya's finding">
          <span className="olya" aria-hidden="true">O</span>
          <div className="f-body">
            <p className="f-label">Olya found why people write</p>
            <p className="f-reason">{r.top_reason}</p>
            {r.recommendation && <p className="f-do"><b>Fix it in the product:</b> {r.recommendation}</p>}
          </div>
          {created ? (
            <span className="created">✓ {PRODUCT_TICKET} sent to the product team</span>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setCreated(true)}>Send to product ↗</button>
          )}
        </section>
      )}
    </>
  )
}

function Skeleton() {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Loading this week's numbers">
      <div className="sk sk-stats" />
      <div className="ov-grid">
        <div className="sk sk-panel" />
        <div className="sk sk-panel" />
      </div>
    </div>
  )
}
