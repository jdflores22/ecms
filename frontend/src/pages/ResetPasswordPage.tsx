import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell, {
  AuthAlert,
  AuthInlineLink,
  authFieldSx,
  authPrimaryButtonSx,
  authColors,
} from '../components/auth/AuthShell'
import { authApi } from '../services/api'

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
    <AuthShell
      title="Reset password"
      subtitle="Choose a new password for your account."
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
          fullWidth
          label="Reset token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          slotProps={{ inputLabel: { shrink: true } }}
          sx={authFieldSx}
        />
        <TextField
          fullWidth
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          slotProps={{ inputLabel: { shrink: true } }}
          sx={authFieldSx}
        />
        <TextField
          fullWidth
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          slotProps={{ inputLabel: { shrink: true } }}
          sx={authFieldSx}
        />
        <Button
          fullWidth
          type="submit"
          variant="contained"
          disableElevation
          disabled={loading || !!success}
          sx={authPrimaryButtonSx}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Update password'}
        </Button>
        <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', color: authColors.textMuted }}>
          <AuthInlineLink to="/login">Back to sign in</AuthInlineLink>
        </Typography>
      </Box>
    </AuthShell>
  )
}
