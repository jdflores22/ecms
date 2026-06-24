import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
} from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell, { authFieldSx, authPrimaryButtonSx } from '../components/auth/AuthShell'
import { authApi } from '../services/api'

const primaryDark = '#0B3D91'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState(searchParams.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await authApi.resetPassword(token.trim(), password)
      setSuccess(data.message)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setError(msg ?? 'Unable to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Reset password" subtitle="Choose a new password for your account.">
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {success}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          fullWidth
          label="Reset token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          sx={authFieldSx}
        />
        <TextField
          fullWidth
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          sx={authFieldSx}
        />
        <TextField
          fullWidth
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          sx={authFieldSx}
        />
        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          disabled={loading || !!success}
          sx={authPrimaryButtonSx}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Update password'}
        </Button>
      </Box>
      <Button component={RouterLink} to="/login" fullWidth sx={{ mt: 2, fontWeight: 600, color: primaryDark }}>
        Back to sign in
      </Button>
    </AuthShell>
  )
}
