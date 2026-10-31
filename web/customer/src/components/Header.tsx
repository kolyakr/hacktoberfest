import { brand } from '../brand.ts'

export function Header() {
  return (
    <header className="wrap top">
      <a href="#" aria-label={`${brand.name} Help Center home`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={brand.logo} alt={brand.name} width={127} height={32} />
      </a>
      <span className="title">{brand.tagline}</span>
      <span className="demo">Demo</span>
      <nav>
        <a href="#">Submit a request</a>
        <a href="#">Sign in</a>
      </nav>
    </header>
  )
}
