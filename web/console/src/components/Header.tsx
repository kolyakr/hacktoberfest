import { supabase } from '../../../src/live'
import { BRAND } from '../data/demo'
import { Mark } from '../live/Login'

export type Tab = 'overview' | 'live' | 'inbox' | 'rules'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'live', label: 'Live chats' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'rules', label: 'Rules' },
]

export function Header({ tab, onTab, live, agent }: { tab: Tab; onTab: (tab: Tab) => void; live: number; agent: string }) {
  return (
    <header className="top glass">
      <div className="brand">
        <Mark size={30} />
        <b>Countersign</b>
        <em>for {BRAND}</em>
      </div>
      <nav className="nav" aria-label="Main">
        {TABS.filter((t) => t.id !== 'live' || supabase).map((t) => (
          <button key={t.id} type="button" aria-current={tab === t.id ? 'page' : undefined} onClick={() => onTab(t.id)}>
            {t.label}
            {t.id === 'live' && live > 0 && <span className="badge">{live}</span>}
          </button>
        ))}
      </nav>
      <div className="top-right">
        <span className="online">
          <span className="dot" />
          Yurko, Zavuch, Olya online
        </span>
        {supabase && <button type="button" className={`bell${live ? ' ring' : ''}`} aria-label={`${live} chats wait for a person`} onClick={() => onTab('live')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
          </svg>
          {live > 0 && <span className="badge">{live}</span>}
        </button>}
        <span className="avatar" title={agent}>{agent[0]}</span>
        {supabase && (
          <button type="button" className="btn ghost small" onClick={() => { try { sessionStorage.removeItem('guest') } catch { /* private mode */ } void (supabase?.auth.signOut() ?? Promise.resolve()).then(() => location.reload()) }}>Sign out</button>
        )}
      </div>
    </header>
  )
}
