import { useState, type FormEvent } from 'react'
import { supabase } from '../../../src/live'

/** Email + password sign-in. The console user is made in the Supabase dashboard. */
export function Login({ onGuest }: { onGuest: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error.message)
    else if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
  }

  return (
    <main className="login">
      <div className="login-bg" aria-hidden="true"><i /><i /><i /></div>
      <section className="login-pitch rise">
        <span className="ov-kicker">Countersign · support console</span>
        <h1>Support that <em>keeps its word.</em></h1>
        <p>Yurko acts, Zavuch checks every promise against billing, Olya counts what worked.</p>
        <ul className="login-chips">
          <li><b>0</b> false "done" sent</li>
          <li><b>2 s</b> live updates</li>
          <li><b>3</b> checks per action</li>
        </ul>
      </section>
      <form className="login-card rise" onSubmit={submit}>
        <h2>Welcome <em>back</em></h2>
        <p>Sign in to see tickets, approve refunds and take over chats from Yurko.</p>
        <label>
          <span>Work email</span>
          <input type="email" autoComplete="username" placeholder="you@team.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          <span>Password</span>
          <input type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <button type="button" className="btn ghost login-guest" onClick={onGuest}>Continue as demo agent</button>
        <small>Accounts are made by your team lead in Supabase.</small>
      </form>
    </main>
  )
}

export function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="10" fill="#0593c6" />
      <path d="M9 16.5l4.5 4.5L23 11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
