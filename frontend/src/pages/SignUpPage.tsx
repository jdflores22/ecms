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
import PasswordField from '../components/auth/PasswordField'
import { ICS_BRAND } from '../config/brandCopy'
import { authApi, resetAuthRefreshState } from '../services/api'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setCredentials } from '../store/slices/authSlice'
import { evaluatePasswordStrength, passwordStrengthMessage } from '../utils/passwordStrength'

const primaryDark = '#0B3D91'

const TRUCKER_SIGNUP = {
  apiRole: 'Trucker' as const,
  title: 'Create trucker account',
  subtitle:
    'Register to submit pre-forecast, manage assigned returns, upload payments, and access booking QR codes.',
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
    if (key === 'trucker') return TRUCKER_SIGNUP
    return null
  }, [roleParam])

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordStrength = useMemo(() => evaluatePasswordStrength(password), [password])
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  if (token) return <Navigate to="/" replace />
  if (!config) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const strengthError = passwordStrengthMessage(password)
    if (strengthError) {
      setError(strengthError)
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
      resetAuthRefreshState()
      dispatch(
        setCredentials({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        }),
      )
    } catch (err) {
      setError(apiErrorMessage(err, 'Sign-up failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={config.title} subtitle={config.subtitle}>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}
      >
        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          fullWidth
          autoComplete="name"
          sx={authFieldSx}
        />
        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          fullWidth
          autoComplete="username"
          sx={authFieldSx}
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          autoComplete="email"
          sx={authFieldSx}
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          showStrength
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          error={passwordsMismatch}
          helperText={passwordsMismatch ? 'Passwords do not match.' : undefined}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading || !passwordStrength.isValid || passwordsMismatch}
          sx={{ ...authPrimaryButtonSx, mt: 0 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Create account'}
        </Button>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Already have an account?{' '}
          <Button component={RouterLink} to="/login" sx={{ fontWeight: 700, color: primaryDark, p: 0, minWidth: 0 }}>
            Sign in
          </Button>
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', pb: 0.5 }}>
          {ICS_BRAND.appBarCaption}
        </Typography>
      </Box>
    </AuthShell>
  )
}
