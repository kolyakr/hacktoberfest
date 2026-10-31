import { useState } from 'react'
import { Header, type Tab } from './components/Header'
import { Inbox } from './components/Inbox'
import { Insights } from './components/Insights'
import { Rules } from './components/Rules'

export default function App() {
  const [tab, setTab] = useState<Tab>('inbox')
  return (
    <>
      <Header tab={tab} onTab={setTab} />
      {tab === 'inbox' && <Inbox />}
      {tab === 'insights' && <Insights />}
      {tab === 'rules' && <Rules />}
    </>
  )
}
