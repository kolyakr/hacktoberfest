import { useState } from 'react'
import { brand } from './brand.ts'
import { Header } from './components/Header.tsx'
import { Hero } from './components/Hero.tsx'
import { Categories } from './components/Categories.tsx'
import { ChatBand } from './components/ChatBand.tsx'
import { ChatWidget } from './components/ChatWidget.tsx'
import { initialChat, type ChatState } from './chat.ts'

export default function App() {
  const [open, setOpen] = useState(false)
  const [chat, setChat] = useState<ChatState>(initialChat)
  const openChat = () => setOpen(true)

  return (
    <>
      <Header />
      <Hero onChat={openChat} />

      <main className="wrap">
        <section className="intro">
          <h1>{brand.name} Help Center: Support for the Dog Training App</h1>
          <p>Welcome to the {brand.name} Help Center — find help with your subscription, billing, cancellations, refunds, and our Money-Back Guarantee. Browse the sections below or use the search bar.</p>
          <p>
            Want it sorted right now?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); openChat() }}>{brand.assistant}, our AI assistant</a>, can refund, cancel or pause your plan in chat — every action is checked before it happens.
          </p>
        </section>

        <Categories onChat={openChat} />
        <ChatBand onChat={openChat} />

        <footer>
          <span>© {brand.name} · Hackathon demo, not the live Help Center</span>
          <span>Powered by Countersign · Gemma 4</span>
        </footer>
      </main>

      <button className="fab" type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <img src={brand.mascot} alt="" />Need help?
      </button>

      <ChatWidget open={open} state={chat} onChange={setChat} onRestart={() => setChat(initialChat)} />
    </>
  )
}
