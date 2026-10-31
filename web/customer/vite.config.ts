import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // One web/.env.local serves both apps (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
  envDir: '..',
  server: { port: 5174, strictPort: true },
})
