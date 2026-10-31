import { useEffect, useRef, useState } from 'react'

const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Counts from 0 to `to` once, easing out. Jumps straight there with reduced motion. */
export function useCountUp(to: number, ms = 1100): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (still()) {
      setValue(to)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      setValue(to * (1 - (1 - t) ** 3))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [to, ms])
  return value
}

/** Width of an element, kept in sync with resizes. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}
