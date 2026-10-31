import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { cssVars } from './brand.ts'

for (const [name, value] of Object.entries(cssVars)) {
  document.documentElement.style.setProperty(name, value)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
