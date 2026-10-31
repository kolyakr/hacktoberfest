import { useEffect, useRef, useState } from 'react'
import { watchLobby, type Handoff } from '../../../src/live'

export type Toast = { id: number; handoff: Handoff }

/** Two short rising tones, no audio file needed. */
function chime() {
  try {
    const ctx = new AudioContext()
    ;[660, 880].forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.14)
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.14 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.14 + 0.32)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + i * 0.14)
      o.stop(ctx.currentTime + i * 0.14 + 0.35)
    })
  } catch {
    // No sound is fine.
  }
}

/** Customers the AI passed to a person, newest first, plus a toast for each new one. */
export function useLive(enabled: boolean, onOpen: (id: string) => void) {
  const [handoffs, setHandoffs] = useState<Handoff[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const seen = useRef(new Set<string>())
  const openRef = useRef(onOpen)
  openRef.current = onOpen

  useEffect(() => {
    if (!enabled) return
    return watchLobby((h) => {
      setHandoffs((list) => [h, ...list.filter((x) => x.ticketId !== h.ticketId)])
      if (seen.current.has(h.ticketId)) return
      seen.current.add(h.ticketId)
      const id = Date.now()
      setToasts((t) => [...t, { id, handoff: h }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 9000)
      chime()
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        const n = new Notification(`${h.name} needs a person`, { body: h.reason, tag: h.ticketId })
        n.onclick = () => {
          window.focus()
          openRef.current(h.ticketId)
        }
      }
    })
  }, [enabled])

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))
  return { handoffs, toasts, dismiss }
}
