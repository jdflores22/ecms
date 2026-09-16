import {
  Box,
  Button,
  CircularProgress,
  Link,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import AuthShell, {
  AuthAlert,
  AuthInlineLink,
  authFieldSx,
  authPrimaryButtonSx,
  authColors,
} from '../components/auth/AuthShell'
import { authApi } from '../services/api'

export default function ForgotPasswordPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [resetToken, setResetToken] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    setResetToken(null)
    try {
      const { data } = await authApi.forgotPassword(emailOrUsername.trim())
      setMessage(data.message)
      if (data.resetToken) setResetToken(data.resetToken)
    } catch {
      setError('Unable to process request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle={
        <>
          Enter your username or email.{' '}
          <AuthInlineLink to="/login">Back to sign in</AuthInlineLink>
        </>
      }
      alerts={
        <>
          {error ? <AuthAlert>{error}</AuthAlert> : null}
          {message ? (
            <AuthAlert severity="success">
              {message}
              {resetToken && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Dev reset link:{' '}
                  <Link
                    component={RouterLink}
                    to={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                  >
                    Set new password
                  </Link>
                </Typography>
              )}
            </AuthAlert>
          ) : null}
        </>
      }
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}
      >
        <TextField
          fullWidth
          label="Username or email"
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          placeholder="you@company.com"
          required
          slotProps={{ inputLabel: { shrink: true } }}
          sx={authFieldSx}
        />
        <Button
          fullWidth
          type="submit"
          variant="contained"
          disableElevation
          disabled={loading}
          sx={authPrimaryButtonSx}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Send reset link'}
        </Button>
        <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', color: authColors.textMuted }}>
          <AuthInlineLink to="/login">Back to sign in</AuthInlineLink>
        </Typography>
      </Box>
    </AuthShell>
  )
}
