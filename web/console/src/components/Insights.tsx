import { useState } from 'react'
import { CAUSES, INTENTS, KPIS, PRODUCT_TICKET, PROMISES } from '../data/demo'

const MAX_INTENT = Math.max(...INTENTS.map((i) => i.total))
const pct = (n: number) => `${((n / MAX_INTENT) * 100).toFixed(1)}%`

export function Insights() {
  const [created, setCreated] = useState(false)

  return (
    <main className="page">
      <div>
        <div className="eyebrow">Olya · analyst</div>
        <h1>How support did this week</h1>
      </div>

      <section className="kpis" aria-label="Key numbers">
        {KPIS.map((k) => (
          <div key={k.label} className="card kpi">
            <div className="k-label">{k.label}</div>
            <div className="k-value">{k.value}</div>
            <div className="k-delta">
              <span className={k.good ? 'good' : 'bad'}>{k.delta}</span> <span className="muted">vs last week</span>
            </div>
          </div>
        ))}
      </section>

      <div className="two">
        <section className="card section" aria-label="Tickets by intent">
          <h2>Tickets by intent</h2>
          <p className="sub">Intent set by Yurko on each ticket · solved with no human in coral</p>
          {INTENTS.map((i) => (
            <div key={i.label} className="bar-row">
              <span>{i.label}</span>
              <div className="bar">
                <div style={{ width: pct(i.auto), background: 'var(--red)' }} />
                <div style={{ width: pct(i.total - i.auto), background: 'var(--pink)' }} />
              </div>
              <span style={{ textAlign: 'right' }}>{i.total}</span>
            </div>
          ))}
          <div className="legend">
            <span><span className="swatch" style={{ background: 'var(--red)' }} />AI solved</span>
            <span><span className="swatch" style={{ background: 'var(--pink)' }} />Human needed</span>
          </div>
        </section>

        <section className="card section insight" aria-label="Olya's insight">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="olya">O</span>
            <div>
              <h2>Olya's insight</h2>
              <div className="muted" style={{ fontSize: 12 }}>Gemma read 128 refund tickets · SQL numbers below</div>
            </div>
          </div>
          <p className="headline">
            38% of refund tickets come from trials that converted with no reminder. Send a reminder 48h before conversion.
          </p>
          <p style={{ margin: '0 0 16px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
            This would have prevented about <strong className="mono">49</strong> tickets and <strong className="mono">$1,960</strong> in
            refunds this week. The next cause is “thought uninstalling the app cancels the plan” (24%).
          </p>
          <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
            {CAUSES.map((c) => (
              <div key={c.label} className="cause">
                <span>{c.label}</span>
                <span className="mono" style={{ fontSize: 12, textAlign: 'right' }}>{c.pct}%</span>
                <div className="cause-bar"><div style={{ width: `${c.pct}%` }} /></div>
                <span />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {created ? (
              <span className="created">✓ {PRODUCT_TICKET} created for the product team</span>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setCreated(true)}>
                Create ticket for product
              </button>
            )}
            <button type="button" className="btn">See the 49 tickets</button>
          </div>
        </section>
      </div>

      <section className="card section" aria-label="Promise kept">
        <h2>Promise kept</h2>
        <p className="sub">Every “I refunded / cancelled / paused” in a reply, checked against the billing log</p>
        <div className="table-wrap">
          <table style={{ minWidth: 620 }}>
            <thead>
              <tr>
                <th>Agent</th>
                <th className="num">Promised</th>
                <th className="num">Done</th>
                <th className="num">Broken</th>
                <th className="num">Kept</th>
              </tr>
            </thead>
            <tbody>
              {PROMISES.map((g) => {
                const broken = g.promised - g.done
                const kept = (g.done / g.promised) * 100
                return (
                  <tr key={g.name}>
                    <td style={{ padding: '11px 0', fontWeight: 700 }}>
                      {g.name} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>{g.note}</span>
                    </td>
                    <td className="num">{g.promised}</td>
                    <td className="num">{g.done}</td>
                    <td className="num">{broken === 0 ? broken : <span className="broken">{broken}</span>}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{kept === 100 ? '100%' : `${kept.toFixed(1)}%`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
