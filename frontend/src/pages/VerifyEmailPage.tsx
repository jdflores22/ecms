import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell, {
  AuthAlert,
  AuthLink,
  authFieldSx,
  authPrimaryButtonSx,
  authColors,
} from '../components/auth/AuthShell'
import { authApi } from '../services/api'

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState(searchParams.get('token') ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  const verify = async (verificationToken: string) => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await authApi.verifyEmail(verificationToken.trim())
      setSuccess(data.message)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to verify email. The link may have expired.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fromQuery = searchParams.get('token')?.trim()
    if (fromQuery) verify(fromQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when landing with ?token=
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    verify(token)
  }

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    setResendLoading(true)
    setResendMessage('')
    try {
      const { data } = await authApi.resendVerification(resendEmail.trim())
      setResendMessage(data.message)
    } catch (err) {
      setResendMessage(apiErrorMessage(err, 'Could not resend verification email.'))
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <AuthShell
      title="Verify email"
      subtitle="Confirm your address to activate your trucker account."
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
          label="Verification token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          slotProps={{ inputLabel: { shrink: true } }}
          sx={authFieldSx}
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disableElevation
          disabled={loading || !token.trim()}
          sx={authPrimaryButtonSx}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify email'}
        </Button>
        <Typography variant="body2" sx={{ textAlign: 'center', color: authColors.textMuted }}>
          <AuthLink to="/login">Back to sign in</AuthLink>
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleResend} sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" sx={{ color: authColors.textMuted }}>
          Did not get the email?
        </Typography>
        <TextField
          fullWidth
          label="Username or email"
          value={resendEmail}
          onChange={(e) => setResendEmail(e.target.value)}
          required
          slotProps={{ inputLabel: { shrink: true } }}
          sx={authFieldSx}
        />
        <Button type="submit" variant="outlined" disabled={resendLoading || !resendEmail.trim()}>
          {resendLoading ? <CircularProgress size={22} /> : 'Resend verification email'}
        </Button>
        {resendMessage ? (
          <Typography variant="body2" sx={{ color: authColors.textMuted }}>{resendMessage}</Typography>
        ) : null}
      </Box>
    </AuthShell>
  )
}
