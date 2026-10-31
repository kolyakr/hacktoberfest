import { useEffect, useRef } from 'react'
import { brand, demo } from '../brand.ts'
import type { ChatState, Step } from '../chat.ts'

type Props = {
  open: boolean
  state: ChatState
  onChange: (next: ChatState) => void
  onRestart: () => void
}

function Paw() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="currentColor">
        <ellipse cx="12" cy="16" rx="5" ry="4.2" />
        <circle cx="5.5" cy="10.5" r="2.2" />
        <circle cx="9.5" cy="6.5" r="2.2" />
        <circle cx="14.5" cy="6.5" r="2.2" />
        <circle cx="18.5" cy="10.5" r="2.2" />
      </g>
    </svg>
  )
}

export function ChatWidget({ open, state, onChange, onRestart }: Props) {
  const logRef = useRef<HTMLDivElement>(null)
  const { step, choice, rating } = state

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [state, open])

  const go = (next: Step, patch: Partial<ChatState> = {}) => onChange({ ...state, ...patch, step: next })

  const receipt: [string, string][] = choice === 'cancel'
    ? [['Membership', 'cancelled'], [`Refund to ${demo.card}`, demo.amount], ['Arrives', '5–10 days']]
    : [['Membership', 'paused'], ['Next charge', `none until ${demo.pausedUntil}`], [`Refund to ${demo.card}`, demo.amount]]
  const ref = choice === 'cancel' ? demo.refundRef : demo.pauseRef

  return (
    <section className={open ? 'chat open' : 'chat'} id="chat" aria-label={`Chat with ${brand.assistant}`}>
      <div className="head">
        <img src={brand.mascot} alt="" />
        <div>
          <div className="n">{brand.assistant} <span className="demo" style={{ background: 'rgba(255,255,255,.25)', color: '#fff' }}>Demo</span></div>
          <div className="s">{brand.name} support · AI assistant</div>
        </div>
        <button type="button" onClick={onRestart}>Restart</button>
      </div>

      <div className="log" ref={logRef} aria-live="polite">
        <div className="me">{demo.complaint}</div>

        {step >= 1 && (
          <>
            <div className="bot">I found your account ({demo.maskedEmail}). Your 7-day trial turned into a paid plan on {demo.convertedOn}, and we didn't send you a reminder first. That's on us.</div>
            <div className="bot">What would you like me to do?</div>
          </>
        )}

        {step === 1 && (
          <div className="qr">
            <button className="p" type="button" onClick={() => go(2, { choice: 'cancel' })}>Cancel + refund</button>
            <button className="s" type="button" onClick={() => go(2, { choice: 'pause' })}>Pause 1 month instead</button>
          </div>
        )}

        {step >= 2 && (
          <>
            <div className="me">{choice === 'cancel' ? 'Cancel + refund' : 'Pause 1 month instead'}</div>
            <div className={step >= 3 ? 'pill ok' : 'pill wait'}>{step >= 3 ? 'Safety check ✓ passed' : 'Checking with our safety check…'}</div>
          </>
        )}

        {step >= 3 && (
          <>
            <div className="receipt">
              <div className="h">Done ✓ confirmed by billing</div>
              <dl>
                {receipt.map(([k, v]) => (
                  <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
              <div className="ref">Ref {ref} · keep this for your bank</div>
            </div>
            <div className="bot">
              {choice === 'cancel'
                ? "All done. You won't be charged again. Anything else I can help with?"
                : "Your plan is paused and your charge is refunded. Your pup's progress is saved."}
            </div>
            <div className="bot">
              <div style={{ fontWeight: 800, marginBottom: 4 }}>{rating ? `Thanks! You gave us ${rating} of 5 🐾` : 'How did we do?'}</div>
              <div className="paws" role="group" aria-label="Rate us from 1 to 5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" aria-label={`${n} of 5`} style={{ color: n <= rating ? brand.colors.red : brand.colors.line }} onClick={() => onChange({ ...state, rating: n })}>
                    <Paw />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {(step === 0 || step === 2) && (
          <button className="next" type="button" onClick={() => go((step + 1) as Step)}>Next step ▸</button>
        )}
      </div>

      <form className="composer" onSubmit={(e) => e.preventDefault()}>
        <input type="text" placeholder="Type a message…" aria-label="Message" />
        <button type="submit" aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M9.5 4.5L14 9l-4.5 4.5" fill="none" stroke="#fff" strokeWidth="2.2" /></svg>
        </button>
      </form>
    </section>
  )
}
