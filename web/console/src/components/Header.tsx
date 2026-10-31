import { BRAND } from '../data/demo'

export type Tab = 'inbox' | 'insights' | 'rules'

const TABS: { id: Tab; label: string }[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'insights', label: 'Insights' },
  { id: 'rules', label: 'Rules' },
]

export function Header({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  return (
    <header className="top">
      <div className="brand">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <rect width="24" height="24" rx="6" fill="#ef3a36" />
          <path d="M6.5 12.5l3.5 3.5 7.5-8" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <b>Countersign</b>
        <span>for {BRAND}</span>
      </div>
      <nav className="nav" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} type="button" aria-current={tab === t.id ? 'page' : undefined} onClick={() => onTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="top-right">
        {tab === 'inbox' ? (
          <span>
            <span className="dot" />
            Yurko · Zavuch · Olya online
          </span>
        ) : (
          <span>Last 7 days · 312 tickets · demo data</span>
        )}
        <span className="avatar">M</span>
      </div>
    </header>
  )
}
