import { brand } from '../brand.ts'

export function Hero({ onChat }: { onChat: () => void }) {
  return (
    <section className="hero" style={{ backgroundImage: `url('${brand.heroImage}')` }}>
      <label className="search">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="#444547" strokeWidth="2" />
          <path d="M20 20l-4-4" stroke="#444547" strokeWidth="2" />
        </svg>
        <input type="search" placeholder="Search" aria-label="Search the Help Center" />
      </label>
      <div className="btns">
        <button className="ghost" type="button" onClick={onChat}>Chat with {brand.assistant}</button>
        <button className="ghost" type="button">Contact us</button>
      </div>
    </section>
  )
}
