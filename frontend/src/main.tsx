import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { appTheme } from './theme/theme'
import App from './App'
import { ToastProvider } from './components/feedback/ToastProvider'
import { store } from './store'
import { installApiPreconnect } from './utils/apiPreconnect'

installApiPreconnect()

// After a deploy, browsers may still have an old entry bundle that references removed chunks.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const key = 'ecms-chunk-reload'
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, '1')
    window.location.reload()
    return
  }
  sessionStorage.removeItem(key)
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  const message = reason instanceof Error ? reason.message : String(reason ?? '')
  if (!/Failed to fetch dynamically imported module/i.test(message)) return
  const key = 'ecms-chunk-reload'
  if (!sessionStorage.getItem(key)) {
    event.preventDefault()
    sessionStorage.setItem(key, '1')
    window.location.reload()
  }
})

async function clearStaleServiceWorkersInDev() {
  if (!import.meta.env.DEV || !('serviceWorker' in navigator)) return

  const registrations = await navigator.serviceWorker.getRegistrations()
  if (registrations.length === 0) return

  await Promise.all(registrations.map((registration) => registration.unregister()))

  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }

  // Reload once so Vite dev assets are no longer intercepted by Workbox.
  if (!sessionStorage.getItem('ecms-sw-cleared')) {
    sessionStorage.setItem('ecms-sw-cleared', '1')
    window.location.reload()
  }
}

void clearStaleServiceWorkersInDev()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider theme={appTheme}>
          <CssBaseline />
          <ToastProvider>
            <App />
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
