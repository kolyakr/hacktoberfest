import type { DemoAction } from '../data/demo'
import type { ActionStatus } from '../types'
import { StatusChip } from './StatusChip'

export type Decision = 'approved' | 'rejected'

interface Props {
  actions: DemoAction[]
  decision: Decision | undefined
  canDecide: boolean
  onDecide: (d: Decision | undefined) => void
}

const formatArgs = (args: Record<string, unknown>) =>
  '{ ' + Object.entries(args).map(([k, v]) => `${k}: ${String(v)}`).join(', ') + ' }'

export function ActionsPanel({ actions, decision, canDecide, onDecide }: Props) {
  const statusOf = (a: DemoAction): ActionStatus =>
    a.status ?? (decision === 'approved' ? 'confirmed' : decision === 'rejected' ? 'blocked' : 'proposed')

  return (
    <section className="card pad" aria-label="Yurko proposes">
      <h2>Yurko proposes</h2>
      {actions.length === 0 && <p className="sub">No action needed.</p>}
      {actions.map((a) => {
        const s = statusOf(a)
        return (
          <div key={a.tool} className="action">
            <div className="row-between">
              <span className="tool">{a.tool}</span>
              <StatusChip value={s} />
            </div>
            <div className="args">{formatArgs(a.args)}</div>
            <div className="meta">
              <span className="tag mono">{a.policy_ref}</span>
              <StatusChip value={a.mode} prefix="mode: " />
              {s === 'confirmed' && a.external_ref && <span className="ref-ok">✓ {a.external_ref}</span>}
            </div>
          </div>
        )
      })}
      {canDecide && (
        <div className="decide">
          <button type="button" className="btn btn-primary" onClick={() => onDecide('approved')}>
            Approve &amp; run
          </button>
          <button type="button" className="btn">Edit</button>
          <button type="button" className="btn" onClick={() => onDecide('rejected')}>
            Reject
          </button>
        </div>
      )}
      {decision && (
        <div className="done-note">
          <span>
            {decision === 'approved'
              ? 'Approved by Mykhailo · billing confirmed · receipt sent'
              : 'Rejected · Yurko will draft a new plan'}
          </span>
          <button type="button" className="btn" onClick={() => onDecide(undefined)}>
            Replay
          </button>
        </div>
      )}
    </section>
  )
}
