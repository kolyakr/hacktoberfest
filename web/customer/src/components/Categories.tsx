import type { MouseEvent } from 'react'
import { brand } from '../brand.ts'

const categories = [
  { title: 'Getting started with PawChamp', text: "New to PawChamp? Learn how the app works, set up your dog's profile, and get your personalized training plan." },
  { title: 'Training & app features', text: 'Find your training courses, use Pawchie AI, track daily streaks, and get the most out of PawChamp.' },
  { title: 'Technical issues & account access', text: 'Fix app issues, reset your password, recover account access, and manage email notifications.' },
  { title: 'Money-Back Guarantee', text: 'Who can get a refund in 30 days, and how App Store purchases are refunded by Apple.' },
  { title: 'Pause your membership', text: "Going on holiday? Pause for a month and keep your dog's progress." },
]

const articles = [
  'If I delete the app, is my membership cancelled?',
  'Why was I charged after my free trial?',
  'How to cancel your PawChamp subscription',
  'How do I get a refund?',
  'I paid through the App Store — who refunds me?',
  "How to update your dog's profile",
]

export function Categories({ onChat }: { onChat: () => void }) {
  const chat = (e: MouseEvent) => {
    e.preventDefault()
    onChat()
  }
  return (
    <>
      <section className="cats" aria-label="Categories">
        <a className="cat hot" href="#" onClick={chat}>
          <h3>Billing, refunds &amp; cancellations</h3>
          <p>Unknown charge, trial turned paid, refund or cancel — {brand.assistant} does it in chat and sends a receipt.</p>
        </a>
        {categories.map((c) => (
          <a className="cat" href="#" key={c.title}>
            <h3>{c.title}</h3>
            <p>{c.text}</p>
          </a>
        ))}
      </section>

      <h2 className="sec">Promoted articles</h2>
      <section className="arts" aria-label="Promoted articles">
        {articles.map((a) => <a href="#" key={a}>{a}</a>)}
      </section>
    </>
  )
}
