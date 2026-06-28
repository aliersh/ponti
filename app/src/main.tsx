import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Providers } from './providers'
import { ThemeProvider } from './theme/ThemeProvider'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Boundary wraps the full tree; CSS tokens are global so the fallback needs no providers. */}
    <ErrorBoundary>
      <BrowserRouter>
        <Providers>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </Providers>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
