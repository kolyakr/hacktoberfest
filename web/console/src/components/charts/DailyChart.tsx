import { useState } from 'react'
import type { Day } from '../../data/demo'
import { useWidth } from './hooks'

const H = 220
const PAD = { top: 16, right: 8, bottom: 28, left: 28 }
const BAR = 24
const GAP = 2

/** Top-rounded column segment, square at the bottom. */
function column(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

export function DailyChart({ days }: { days: Day[] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.ceil(Math.max(...days.map((d) => d.ai + d.human)) / 10) * 10
  const plotW = Math.max(0, width - PAD.left - PAD.right)
  const plotH = H - PAD.top - PAD.bottom
  const slot = plotW / days.length
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH
  const ticks = Array.from({ length: max / 10 + 1 }, (_, i) => i * 10)
  const d = hover === null ? null : days[hover]

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label="Tickets per day, solved by AI and by a human">
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="axis" x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{t}</text>
            </g>
          ))}
          {days.map((day, i) => {
            const cx = PAD.left + slot * i + slot / 2
            const x = cx - BAR / 2
            const aiTop = y(day.ai)
            const humanTop = y(day.ai + day.human)
            return (
              <g
                key={day.date}
                className={`col${hover !== null && hover !== i ? ' dim' : ''}`}
                style={{ animationDelay: `${120 + i * 70}ms` }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <rect className="hit" x={PAD.left + slot * i} y={PAD.top} width={slot} height={plotH} />
                <rect x={x} y={aiTop} width={BAR} height={y(0) - aiTop} fill="var(--s-ai)" />
                <path d={column(x, humanTop, BAR, aiTop - GAP - humanTop, 4)} fill="var(--s-human)" />
                <text className="axis" x={cx} y={H - 8} textAnchor="middle">{day.label}</text>
              </g>
            )
          })}
        </svg>
      )}
      {d && hover !== null && (
        <div className="tip" style={{ left: PAD.left + slot * hover + slot / 2, top: y(d.ai + d.human) - 8 }}>
          <b>{d.label}, {d.date.slice(8)} Oct</b>
          <span><i style={{ background: 'var(--s-ai)' }} />AI solved <em>{d.ai}</em></span>
          <span><i style={{ background: 'var(--s-human)' }} />Human needed <em>{d.human}</em></span>
        </div>
      )}
      <table className="sr-only">
        <caption>Tickets per day</caption>
        <thead><tr><th>Day</th><th>AI solved</th><th>Human needed</th></tr></thead>
        <tbody>{days.map((x) => <tr key={x.date}><td>{x.date}</td><td>{x.ai}</td><td>{x.human}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
