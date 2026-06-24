import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import AuthShell, { authFieldSx, authPrimaryButtonSx } from '../components/auth/AuthShell'
import { authApi } from '../services/api'

const primaryDark = '#0B3D91'

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
      subtitle="Enter your username or email. If an account exists, you will receive reset instructions."
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {message}
          {resetToken && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Dev reset link:{' '}
              <Link component={RouterLink} to={`/reset-password?token=${encodeURIComponent(resetToken)}`}>
                Set new password
              </Link>
            </Typography>
          )}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          fullWidth
          label="Username or email"
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          required
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
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Send reset link'}
        </Button>
      </Box>
      <Button component={RouterLink} to="/login" fullWidth sx={{ mt: 2, fontWeight: 600, color: primaryDark }}>
        Back to sign in
      </Button>
    </AuthShell>
  )
}
