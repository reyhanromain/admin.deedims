import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { MiniProvider } from './store'
import { initTelegram } from './telegram'

initTelegram()

createRoot(document.getElementById('miniroot')!).render(
  <StrictMode>
    <MiniProvider>
      <App />
    </MiniProvider>
  </StrictMode>,
)
