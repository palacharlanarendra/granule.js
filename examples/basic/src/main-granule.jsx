import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { CoinsGranule } from './Coins.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CoinsGranule />
  </StrictMode>,
)
