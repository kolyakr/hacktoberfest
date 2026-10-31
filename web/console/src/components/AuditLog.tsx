import type { DemoAudit } from '../data/demo'

export function AuditLog({ ticketNumber, rows }: { ticketNumber: string; rows: DemoAudit[] }) {
  return (
    <section className="card audit" aria-label="Audit log">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <h2>Audit log</h2>
        <span className="muted" style={{ fontSize: 12 }}>audit_log · ticket #{ticketNumber} · append-only</span>
      </div>
      <div className="table-wrap">
        <table style={{ minWidth: 640, fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ width: 90 }}>Time</th>
              <th style={{ width: 160 }}>Actor</th>
              <th style={{ width: 150 }}>Event</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="mono muted">{r.time}</td>
                <td className="mono">{r.actor}</td>
                <td style={{ fontWeight: 700 }}>{r.event}</td>
                <td style={{ color: 'var(--ink-2)' }}>{String(r.detail.note ?? JSON.stringify(r.detail))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
