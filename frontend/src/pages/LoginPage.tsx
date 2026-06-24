import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Navigate, Link as RouterLink } from 'react-router-dom'
import AuthShell, { authFieldSx, authPrimaryButtonSx } from '../components/auth/AuthShell'
import { authApi } from '../services/api'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setCredentials } from '../store/slices/authSlice'

const primaryDark = '#0B3D91'

const DEMO_ACCOUNTS = [
  { role: 'Broker', username: 'broker1', password: 'Broker@123' },
  { role: 'Admin', username: 'admin', password: 'Admin@123' },
  { role: 'Evaluator', username: 'evaluator1', password: 'Evaluator@123' },
  { role: 'Depot', username: 'depot1', password: 'Depot@123' },
  { role: 'Trucker', username: 'trucker1', password: 'Trucker@123' },
]

export default function LoginPage() {
  const token = useAppSelector((s) => s.auth.accessToken)
  const dispatch = useAppDispatch()
  const [username, setUsername] = useState('broker1')
  const [password, setPassword] = useState('Broker@123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await authApi.login(username, password)
      dispatch(
        setCredentials({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        }),
      )
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setUsername(account.username)
    setPassword(account.password)
    setError('')
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Enter your credentials to access the ECMS portal."
      footer={
        <Box
          sx={{
            mt: { xs: 2, sm: 3 },
            pt: 2.5,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
            Quick demo access
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
              maxWidth: '100%',
            }}
          >
            {DEMO_ACCOUNTS.map((account) => (
              <Chip
                key={account.username}
                label={account.role}
                size="small"
                clickable
                onClick={() => fillDemo(account)}
                sx={{
                  fontWeight: 600,
                  maxWidth: '100%',
                  bgcolor: 'rgba(11, 61, 145, 0.06)',
                  '&:hover': { bgcolor: 'rgba(11, 61, 145, 0.12)' },
                }}
              />
            ))}
          </Box>
        </Box>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
        <TextField
          fullWidth
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          sx={authFieldSx}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          sx={authFieldSx}
        />
        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          sx={authPrimaryButtonSx}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
        </Button>
        <Button
          component={RouterLink}
          to="/forgot-password"
          fullWidth
          sx={{ fontWeight: 600, color: primaryDark }}
        >
          Forgot password?
        </Button>
        <Box
          sx={{
            mt: 1,
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            New to ECMS?
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
            <Button
              component={RouterLink}
              to="/signup/broker"
              variant="outlined"
              fullWidth
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Sign up as broker
            </Button>
            <Button
              component={RouterLink}
              to="/signup/trucker"
              variant="outlined"
              fullWidth
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Sign up as trucker
            </Button>
          </Box>
          <Button component={RouterLink} to="/" sx={{ mt: 1.5, fontWeight: 600, color: primaryDark }}>
            Back to home
          </Button>
        </Box>
      </Box>
    </AuthShell>
  )
}
