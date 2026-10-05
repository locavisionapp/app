import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { startBackgroundSync } from './lib/inspectionQueue'
import { ErrorBoundary, reloadForNewVersion } from './components/ui/ErrorBoundary'

// Vite fires this when a lazy chunk from a previous deploy is gone: reload
// to pick up the current version instead of rendering a blank page.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewVersion()) event.preventDefault()
})

// Inspections saved offline are retried in the background for the whole session.
startBackgroundSync()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
