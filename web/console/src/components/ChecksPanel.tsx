import type { Check } from '../types'

export function ChecksPanel({ checks }: { checks: Check[] }) {
  return (
    <section className="card pad" aria-label="Zavuch checks">
      <h2>Zavuch checks</h2>
      <p className="sub">Verifier hooks run in code around every tool call and every reply.</p>
      {checks.map((c) => (
        <div key={c.hook} className="check">
          <span className={`verdict ${c.verdict}`}>{c.verdict}</span>
          <div>
            <div className="hook">{c.hook}</div>
            <div className="text">{c.text}</div>
          </div>
        </div>
      ))}
    </section>
  )
}
