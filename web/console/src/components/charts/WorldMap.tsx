import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { useMemo, useState } from 'react'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import world from 'world-atlas/countries-110m.json'
import type { Country } from '../../data/demo'
import { useWidth } from './hooks'

// One hue, light to dark: more tickets, darker sky blue.
export const STEPS = [
  { min: 1, label: '1–9', fill: '#c4e6f4' },
  { min: 10, label: '10–19', fill: '#7cc8e8' },
  { min: 20, label: '20–49', fill: '#0593c6' },
  { min: 50, label: '50+', fill: '#04628a' },
]
const fillFor = (n: number) => [...STEPS].reverse().find((s) => n >= s.min)?.fill

const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>
const land = feature(topo, topo.objects.countries).features.filter((f) => f.id !== '010')

export function WorldMap({ countries }: { countries: Country[] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<{ c: Country; x: number; y: number } | null>(null)
  const byId = useMemo(() => new Map(countries.map((c) => [c.id, c])), [countries])
  const height = Math.round(width * 0.56)
  // Zoom to the countries that have tickets, so Europe is big enough to point at.
  const path = useMemo(() => {
    const focus = land.filter((f) => byId.has(String(f.id)))
    const projection = geoNaturalEarth1().fitExtent([[8, 8], [width - 8, height - 8]], { type: 'FeatureCollection', features: focus })
    return geoPath(projection)
  }, [width, height, byId])

  return (
    <div className="chart map" ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Tickets by customer country">
          {land.map((f) => {
            const c = byId.get(String(f.id))
            const d = path(f) ?? ''
            if (!c) return <path key={f.id} d={d} className="land" />
            const [x, y] = path.centroid(f)
            return (
              <path
                key={f.id}
                d={d}
                className={`land on${hover?.c.id === c.id ? ' hot' : ''}`}
                style={{ fill: fillFor(c.tickets), animationDelay: `${300 + (90 - c.tickets) * 8}ms` }}
                onMouseEnter={() => setHover({ c, x, y })}
                onMouseLeave={() => setHover(null)}
              />
            )
          })}
        </svg>
      )}
      {hover && (
        <div className="tip" style={{ left: hover.x, top: hover.y - 10 }}>
          <b>{hover.c.name}</b>
          <span>{hover.c.tickets} tickets</span>
          <span className="muted">{hover.c.rule}</span>
        </div>
      )}
    </div>
  )
}
