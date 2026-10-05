import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { startBackgroundSync } from './lib/inspectionQueue'

// Inspections saved offline are retried in the background for the whole session.
startBackgroundSync()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
