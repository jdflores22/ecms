import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material'
import axios from 'axios'
import { useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useParams } from 'react-router-dom'
import AuthShell, { authFieldSx, authPrimaryButtonSx } from '../components/auth/AuthShell'
import { ICS_BRAND } from '../config/brandCopy'
import { authApi } from '../services/api'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setCredentials } from '../store/slices/authSlice'

const primaryDark = '#0B3D91'

const SIGNUP_ROLES = {
  broker: {
    apiRole: 'Broker' as const,
    title: 'Create broker account',
    subtitle: ICS_BRAND.brokerSignup,
  },
  trucker: {
    apiRole: 'Trucker' as const,
    title: 'Create trucker account',
    subtitle: 'Register to view assigned returns, upload payments, and access booking QR codes.',
  },
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

export default function SignUpPage() {
  const { role: roleParam } = useParams()
  const token = useAppSelector((s) => s.auth.accessToken)
  const dispatch = useAppDispatch()

  const config = useMemo(() => {
    const key = roleParam?.toLowerCase()
    if (key === 'broker' || key === 'trucker') return SIGNUP_ROLES[key]
    return null
  }, [roleParam])

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to="/" replace />
  if (!config) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { data } = await authApi.signUp({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        role: config.apiRole,
      })
      dispatch(
        setCredentials({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        }),
      )
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to create account. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={config.title} subtitle={config.subtitle}>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}
      >
        <TextField
          fullWidth
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
          sx={authFieldSx}
        />
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
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          sx={authFieldSx}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          helperText="At least 8 characters"
          sx={authFieldSx}
        />
        <TextField
          fullWidth
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
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
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Create account'}
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Already have an account?{' '}
          <Button component={RouterLink} to="/login" sx={{ fontWeight: 700, color: primaryDark, p: 0, minWidth: 0 }}>
            Sign in
          </Button>
        </Typography>
        <Button component={RouterLink} to="/" sx={{ fontWeight: 600, color: primaryDark }}>
          Back to home
        </Button>
      </Box>
    </AuthShell>
  )
}
