import { useState } from 'react'
import { GUARDRAILS, RULES } from '../data/demo'
import type { ActionMode } from '../types'

const MODES: ActionMode[] = ['auto', 'ask', 'never']

export function Rules() {
  const [modes, setModes] = useState<Record<string, ActionMode>>(() => Object.fromEntries(RULES.map((r) => [r.tool, r.mode])))

  return (
    <main className="rules">
      <div className="rules-main">
        <h1 className="display">How much can Yurko do <em>alone?</em></h1>
        <p>
          Set a level for every tool. The model only <em>proposes</em>. These rules decide, in code, whether a proposal runs, waits for a
          person, or is blocked.
        </p>
        <div className="card table-wrap">
          <table style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Action</th>
                <th>Limit</th>
                <th>Level</th>
                <th className="num">Last 7 days</th>
              </tr>
            </thead>
            <tbody>
              {RULES.map((r) => (
                <tr key={r.tool}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.label}</div>
                    <div className="mono muted" style={{ fontSize: 12, marginTop: 2 }}>{r.tool}</div>
                  </td>
                  <td className="mono" style={{ fontSize: 13 }}>{r.limit}</td>
                  <td>
                    <div className="seg" role="group" aria-label={`${r.label} level`}>
                      {MODES.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={m}
                          aria-pressed={modes[r.tool] === m}
                          onClick={() => setModes({ ...modes, [r.tool]: m })}
                        >
                          {m.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="num muted" style={{ fontSize: 13 }}>{r.stat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="guard">
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7fd0f5', fontFamily: 'var(--mono)' }}>
          Hard guardrails · always on
        </div>
        <ul>
          {GUARDRAILS.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </aside>
    </main>
  )
}
