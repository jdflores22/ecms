import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined'
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material'
import axios from 'axios'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import AuthShell, {
  AuthAlert,
  AuthLink,
  authFieldSx,
  authPrimaryButtonSx,
  authColors,
} from '../components/auth/AuthShell'
import PasswordField from '../components/auth/PasswordField'
import { ICS_BRAND } from '../config/brandCopy'
import { authApi } from '../services/api'
import { useAppSelector } from '../store/hooks'
import { evaluatePasswordStrength, passwordStrengthMessage } from '../utils/passwordStrength'

const TRUCKER_SIGNUP = {
  apiRole: 'Trucker' as const,
  title: 'Sign up',
  subtitle: ICS_BRAND.truckerSignup,
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
  const navigate = useNavigate()

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
  const [success, setSuccess] = useState('')
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
    setSuccess('')
    try {
      const { data } = await authApi.signUp({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        role: config.apiRole,
      })
      setSuccess(data.message)
      setTimeout(() => navigate('/verify-email'), 1500)
    } catch (err) {
      setError(apiErrorMessage(err, 'Registration failed. Please review your details.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={config.title}
      maxWidth="32rem"
      subtitle={
        <>
          Create your ICS trucker account.{' '}
          <AuthLink to="/login">Sign in</AuthLink>{' '}
          if you already have an account.
        </>
      }
      alerts={
        <>
          {error ? <AuthAlert>{error}</AuthAlert> : null}
          {success ? <AuthAlert severity="success">{success}</AuthAlert> : null}
        </>
      }
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}
      >
        <TextField
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Juan Dela Cruz"
          required
          fullWidth
          autoFocus
          autoComplete="name"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={authFieldSx}
        />
        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Choose a username"
          required
          fullWidth
          autoComplete="username"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={authFieldSx}
        />
        <TextField
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          fullWidth
          autoComplete="email"
          slotProps={{ inputLabel: { shrink: true } }}
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
          disableElevation
          disabled={loading || !passwordStrength.isValid || passwordsMismatch}
          startIcon={loading ? undefined : <PersonAddAltOutlinedIcon />}
          sx={authPrimaryButtonSx}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Create account'}
        </Button>

        <Typography
          variant="body2"
          sx={{ textAlign: 'center', color: authColors.textMuted, fontSize: '0.875rem' }}
        >
          <AuthLink to="/trucker/faq" sx={{ fontWeight: 600 }}>Read trucker FAQ</AuthLink>{' '}
          before you register.
        </Typography>
      </Box>
    </AuthShell>
  )
}
