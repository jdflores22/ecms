import AndroidOutlinedIcon from '@mui/icons-material/AndroidOutlined'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AuthShell, {
  AuthAlert,
  AuthInlineLink,
  AuthLink,
  authFieldSx,
  authPrimaryButtonSx,
  authColors,
} from '../components/auth/AuthShell'
import { TRUCKER_APP_DOWNLOAD } from '../config/truckerAppDownload'
import axios from 'axios'
import { authApi, resetAuthRefreshState } from '../services/api'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setCredentials } from '../store/slices/authSlice'

const REMEMBER_USERNAME_KEY = 'ics.rememberUsername'

export default function LoginPage() {
  const token = useAppSelector((s) => s.auth.accessToken)
  const dispatch = useAppDispatch()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_USERNAME_KEY)
    if (saved) {
      setUsername(saved)
      setRememberMe(true)
    }
  }, [])

  if (token) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_USERNAME_KEY, username.trim())
      } else {
        localStorage.removeItem(REMEMBER_USERNAME_KEY)
      }

      const { data } = await authApi.login(username, password)
      resetAuthRefreshState()
      dispatch(
        setCredentials({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        }),
      )
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        setError('Too many login attempts. Please wait about a minute and try again.')
      } else {
        setError('Unable to sign in. Check your credentials and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle={
        <>
          Sign in to ICS.{' '}
          <AuthLink to="/signup/trucker">Create trucker account</AuthLink>{' '}
          if you need an account.
        </>
      }
      alerts={error ? <AuthAlert>{error}</AuthAlert> : null}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}
      >
        <TextField
          fullWidth
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
          autoFocus
          autoComplete="username"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={authFieldSx}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          autoComplete="current-password"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={authFieldSx}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              sx={{
                color: authColors.textMuted,
                '&.Mui-checked': { color: authColors.primary },
              }}
            />
          }
          label={
            <Typography sx={{ fontSize: '0.875rem', color: authColors.textMuted }}>
              Remember me
            </Typography>
          }
          sx={{ m: 0, alignItems: 'flex-start' }}
        />

        <Button
          fullWidth
          type="submit"
          variant="contained"
          disableElevation
          disabled={loading}
          startIcon={loading ? undefined : <LoginOutlinedIcon />}
          sx={authPrimaryButtonSx}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
        </Button>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            pt: 0.5,
            fontSize: '0.875rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AuthInlineLink to="/forgot-password">Forgot your password?</AuthInlineLink>
          <Typography component="span" sx={{ color: authColors.linkDivider, fontSize: 'inherit' }}>
            ·
          </Typography>
          <AuthInlineLink to="/trucker/faq">Trucker FAQ</AuthInlineLink>
          <Typography component="span" sx={{ color: authColors.linkDivider, fontSize: 'inherit' }}>
            ·
          </Typography>
          <AuthInlineLink
            to={TRUCKER_APP_DOWNLOAD.publicPagePath}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
          >
            <AndroidOutlinedIcon sx={{ fontSize: 16 }} />
            Android app
          </AuthInlineLink>
        </Stack>
      </Box>
    </AuthShell>
  )
}
