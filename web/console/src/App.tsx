import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../src/live'
import { Header, type Tab } from './components/Header'
import { Inbox } from './components/Inbox'
import { Overview } from './components/Overview'
import { Rules } from './components/Rules'
import { Live } from './live/Live'
import { Login } from './live/Login'
import { Toasts } from './live/Toasts'
import { useLive } from './live/useLive'

/** "iryna.k@team.com" -> "Iryna" */
const firstName = (email?: string) => {
  const p = (email ?? 'support').split('@')[0].split(/[._-]/)[0]
  return p[0].toUpperCase() + p.slice(1)
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)
  // "Continue as demo agent": opens the console without an account (for judges and teammates).
  const [guest, setGuest] = useState(() => { try { return sessionStorage.getItem('guest') === '1' } catch { return false } })
  const enterGuest = () => { try { sessionStorage.setItem('guest', '1') } catch { /* private mode */ } setGuest(true) }
  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="aurora" />
  if (supabase && !session && !guest) return <><div className="aurora" /><Login onGuest={enterGuest} /></>
  return <Console agent={session ? firstName(session.user.email) : 'Demo'} />
}

function Console({ agent }: { agent: string }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [ticket, setTicket] = useState<string>()
  const [liveId, setLiveId] = useState<string>()
  const openLive = (id: string) => {
    setLiveId(id)
    setTab('live')
  }
  const { handoffs, toasts, dismiss } = useLive(!!supabase, openLive)
  const open = (id: string) => {
    setTicket(id)
    setTab('inbox')
  }
  return (
    <>
      <div className="aurora" />
      <Header tab={tab} onTab={setTab} live={handoffs.length} agent={agent} />
      <div className="page" key={tab}>
        {tab === 'overview' && <Overview onOpen={open} handoffs={handoffs} onLive={openLive} />}
        {tab === 'live' && <Live handoffs={handoffs} active={liveId} onPick={setLiveId} agent={agent} />}
        {tab === 'inbox' && <Inbox initial={ticket} agent={agent} />}
        {tab === 'rules' && <Rules />}
      </div>
      <Toasts toasts={toasts} onOpen={openLive} onDismiss={dismiss} />
    </>
  )
}
