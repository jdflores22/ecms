import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import App from './App'
import { ToastProvider } from './components/feedback/ToastProvider'
import { store } from './store'

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

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0B3D91' },
    secondary: { main: '#00A3E0' },
    background: { default: '#F4F7FB' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: { borderRadius: 10 },
  components: {
    MuiAppBar: {
      defaultProps: { elevation: 0 },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          position: 'relative',
        },
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <App />
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
