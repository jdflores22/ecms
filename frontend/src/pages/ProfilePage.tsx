import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import SaveIcon from '@mui/icons-material/Save'
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { roleLabel } from '../config/roleConfig'
import { profileApi, type Profile } from '../services/api'
import { useAppDispatch } from '../store/hooks'
import { updateUser } from '../store/slices/authSlice'
import { formatDate } from '../utils/datetime'

const primaryDark = '#0B3D91'

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

const sectionPaperSx = {
  p: 2.5,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: '#fff',
  boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function userInitials(name?: string) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function heroChipStyle(kind: 'role' | 'status', value: string) {
  if (kind === 'role') {
    return { bgcolor: 'rgba(255,255,255,0.95)', color: primaryDark }
  }
  switch (value) {
    case 'Active':
      return { bgcolor: 'rgba(46, 125, 50, 0.92)', color: '#fff' }
    case 'Suspended':
      return { bgcolor: 'rgba(198, 40, 40, 0.92)', color: '#fff' }
    case 'Inactive':
      return { bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }
    default:
      return { bgcolor: 'rgba(255,255,255,0.95)', color: primaryDark }
  }
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.04)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            bgcolor: hexToRgba(primaryDark, 0.08),
            color: primaryDark,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {icon}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', wordBreak: 'break-word' }}>{value}</Typography>
    </Paper>
  )
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1.5,
          bgcolor: hexToRgba(primaryDark, 0.08),
          color: primaryDark,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

export default function ProfilePage() {
  const dispatch = useAppDispatch()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    profileApi
      .get()
      .then(({ data }) => {
        setProfile(data)
        setFullName(data.fullName)
        setEmail(data.email)
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileError('')
    setProfileSuccess('')
    try {
      const { data } = await profileApi.update({ fullName: fullName.trim(), email: email.trim() })
      setProfile(data)
      dispatch(updateUser({ fullName: data.fullName, email: data.email }))
      setProfileSuccess('Profile updated successfully.')
    } catch (err) {
      setProfileError(apiErrorMessage(err, 'Failed to update profile.'))
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setSavingPassword(true)
    try {
      const { data } = await profileApi.changePassword(currentPassword, newPassword)
      setPasswordSuccess(data.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(apiErrorMessage(err, 'Failed to change password.'))
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          py: 12,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
        }}
      >
        <CircularProgress sx={{ color: primaryDark }} />
      </Paper>
    )
  }

  if (error || !profile) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {error || 'Profile not found.'}
      </Alert>
    )
  }

  const profileDirty = fullName.trim() !== profile.fullName || email.trim() !== profile.email
  const memberSince = formatDate(profile.createdAt)

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${primaryDark} 0%, #0A3580 60%, #0C4DA8 100%)`,
          color: '#fff',
          boxShadow: '0 8px 24px rgba(11, 61, 145, 0.22)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -40,
            top: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
          }}
        />
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2.5,
            position: 'relative',
          }}
        >
          <Avatar
            sx={{
              width: { xs: 64, sm: 72 },
              height: { xs: 64, sm: 72 },
              bgcolor: 'rgba(255,255,255,0.18)',
              border: '2px solid rgba(255,255,255,0.35)',
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {userInitials(profile.fullName)}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', sm: '1.75rem' }, wordBreak: 'break-word' }}
            >
              {profile.fullName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.88, mt: 0.5 }}>
              @{profile.username} · {profile.email}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.25 }}>
              <Chip
                label={roleLabel(profile.role)}
                size="small"
                sx={{ fontWeight: 700, ...heroChipStyle('role', profile.role) }}
              />
              <Chip
                label={profile.status}
                size="small"
                sx={{ fontWeight: 700, ...heroChipStyle('status', profile.status) }}
              />
            </Box>
          </Box>
        </Box>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: profile.shippingLineName || profile.depotName ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <SummaryCard label="Username" value={profile.username} icon={<BadgeOutlinedIcon sx={{ fontSize: 16 }} />} />
        <SummaryCard label="Member since" value={memberSince} icon={<CalendarMonthOutlinedIcon sx={{ fontSize: 16 }} />} />
        {profile.shippingLineName && (
          <SummaryCard
            label="Shipping line"
            value={profile.shippingLineName}
            icon={<VerifiedUserOutlinedIcon sx={{ fontSize: 16 }} />}
          />
        )}
        {profile.depotName && (
          <SummaryCard label="Depot" value={profile.depotName} icon={<WarehouseOutlinedIcon sx={{ fontSize: 16 }} />} />
        )}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 3,
          alignItems: 'stretch',
        }}
      >
        <Paper elevation={0} component="form" onSubmit={handleSaveProfile} sx={sectionPaperSx}>
          <SectionHeader
            icon={<PersonOutlinedIcon fontSize="small" />}
            title="Edit profile"
            subtitle="Update your display name and contact email"
          />

          {profileSuccess && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setProfileSuccess('')}>
              {profileSuccess}
            </Alert>
          )}
          {profileError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setProfileError('')}>
              {profileError}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlinedIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ ...fieldSx, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <AlternateEmailOutlinedIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ ...fieldSx, mb: 'auto' }}
          />

          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              startIcon={savingProfile ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              disabled={savingProfile || !profileDirty}
              sx={{ fontWeight: 700, py: 1.25, borderRadius: 2 }}
            >
              Save changes
            </Button>
          </Box>
        </Paper>

        <Paper elevation={0} component="form" onSubmit={handleChangePassword} sx={sectionPaperSx}>
          <SectionHeader
            icon={<LockOutlinedIcon fontSize="small" />}
            title="Security"
            subtitle="Change your sign-in password"
          />

          {passwordSuccess && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setPasswordSuccess('')}>
              {passwordSuccess}
            </Alert>
          )}
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setPasswordError('')}>
              {passwordError}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            sx={{ ...fieldSx, mb: 2 }}
          />
          <TextField
            fullWidth
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            helperText="At least 8 characters"
            sx={{ ...fieldSx, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            sx={{ ...fieldSx, mb: 'auto' }}
          />

          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              sx={{
                fontWeight: 700,
                py: 1.25,
                borderRadius: 2,
                bgcolor: primaryDark,
                '&:hover': { bgcolor: '#0A3580' },
              }}
            >
              {savingPassword ? <CircularProgress size={22} color="inherit" /> : 'Update password'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
