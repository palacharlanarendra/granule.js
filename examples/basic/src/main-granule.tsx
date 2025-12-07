import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { CoinsGranule } from './Coins'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <CoinsGranule />
  </StrictMode>,
)
