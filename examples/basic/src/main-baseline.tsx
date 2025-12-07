import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { CoinsBaseline } from './Coins'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <CoinsBaseline />
  </StrictMode>,
)
