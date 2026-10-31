import { useCallback, useEffect, useState } from 'react'
import { brand } from './brand.ts'
import { Header } from './components/Header.tsx'
import { Hero } from './components/Hero.tsx'
import { Categories } from './components/Categories.tsx'
import { ChatBand } from './components/ChatBand.tsx'
import { ChatWidget } from './components/ChatWidget.tsx'

export default function App() {
  // `?mock=<case>` opens the chat straight away, for the demo.
  const [open, setOpen] = useState(new URLSearchParams(window.location.search).has('mock'))
  const openChat = () => setOpen(true)
  const closeChat = useCallback(() => setOpen(false), [])
  // Wide screens: the page makes room for the chat panel instead of hiding under it.
  useEffect(() => { document.documentElement.classList.toggle('chat-open', open) }, [open])

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
            <a href="#" onClick={(e) => { e.preventDefault(); openChat() }}>{brand.assistant}, our AI assistant</a>, can cancel your plan or refund a charge in chat — every action is checked before it happens.
          </p>
        </section>

        <Categories onChat={openChat} />
        <ChatBand onChat={openChat} />

        <footer>
          <span>© {brand.name} · Hackathon demo, not the live Help Center</span>
          <span>Powered by Countersign · OpenAI</span>
        </footer>
      </main>

      <button className={open ? 'fab gone' : 'fab'} type="button" onClick={openChat} aria-expanded={open} aria-controls="chat" tabIndex={open ? -1 : 0}>
        <img src={brand.mascot} alt="" />Need help?
      </button>

      <ChatWidget open={open} onClose={closeChat} />
    </>
  )
}
