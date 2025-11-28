import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { CoinsBaseline } from './Coins.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CoinsBaseline />
  </StrictMode>,
)
