import { brand } from '../brand.ts'

export function ChatBand({ onChat }: { onChat: () => void }) {
  return (
    <section className="band" aria-label={`Chat with ${brand.assistant}`}>
      <div className="txt">
        <div className="eyebrow">No forms. No waiting.</div>
        <h2>Sort it out in chat<br />in under 2 minutes</h2>
        <p>{brand.assistant} doesn't just explain — he acts. A safety check verifies every refund, cancel or pause, and you only hear “done” after billing confirms it.</p>
        <div className="steps">
          <span><b>1</b>Tell us what happened</span>
          <span><b>2</b>Pick an option</span>
          <span><b>3</b>Get a receipt</span>
        </div>
        <button className="cta" type="button" onClick={onChat}>Chat with {brand.assistant}</button>
      </div>
      <img src={brand.phoneMockup} alt={`${brand.name} app on a phone`} />
    </section>
  )
}
