import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import SaveIcon from '@mui/icons-material/Save'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { roleLabel } from '../config/roleConfig'
import {
  DetailErrorState,
  DetailLoadingState,
  DetailTabPanel,
  ICS_PRIMARY,
  detailTabsSx,
  hexToRgba,
  sectionPaperSx,
} from '../components/layout/DetailPagePrimitives'
import { profileApi, type Profile } from '../services/api'
import { useAppDispatch } from '../store/hooks'
import { updateUser } from '../store/slices/authSlice'
import { useAssetUrlState } from '../hooks/useAssetUrl'
import { AvatarSkeleton } from '../components/layout/SkeletonPrimitives'
import { formatDate } from '../utils/datetime'

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

function userInitials(name?: string) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function statusChipOnGradient(status: string) {
  switch (status) {
    case 'Active':
      return { bgcolor: 'rgba(46, 125, 50, 0.92)', color: '#fff' }
    case 'Suspended':
      return { bgcolor: 'rgba(198, 40, 40, 0.92)', color: '#fff' }
    default:
      return { bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }
  }
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

function AccountFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <ListItem disableGutters sx={{ py: 0.75, alignItems: 'flex-start' }}>
      <ListItemIcon sx={{ minWidth: 36, mt: 0.25, color: ICS_PRIMARY }}>{icon}</ListItemIcon>
      <ListItemText
        primary={label}
        secondary={value}
        slotProps={{
          primary: { variant: 'caption', sx: { fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' } },
          secondary: { sx: { fontWeight: 600, color: 'text.primary', wordBreak: 'break-word' } },
        }}
      />
    </ListItem>
  )
}

export default function ProfilePage() {
  const dispatch = useAppDispatch()
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('account')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')
  const { url: profilePhotoUrl, loading: profilePhotoLoading } = useAssetUrlState(profile?.profilePhoto)

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
        dispatch(updateUser({ profilePhoto: data.profilePhoto ?? undefined }))
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [dispatch])

  useEffect(() => {
    load()
  }, [load])

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setProfileError('Please choose an image file (JPG, PNG, WEBP, or GIF).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Photo must be 5 MB or smaller.')
      return
    }

    setUploadingPhoto(true)
    setProfileError('')
    setProfileSuccess('')
    try {
      const { data } = await profileApi.uploadPhoto(file)
      setProfile(data)
      dispatch(updateUser({ profilePhoto: data.profilePhoto ?? undefined }))
      setProfileSuccess('Profile photo updated.')
    } catch (err) {
      setProfileError(apiErrorMessage(err, 'Failed to upload profile photo.'))
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true)
    setProfileError('')
    setProfileSuccess('')
    try {
      const { data } = await profileApi.removePhoto()
      setProfile(data)
      dispatch(updateUser({ profilePhoto: undefined }))
      setProfileSuccess('Profile photo removed.')
    } catch (err) {
      setProfileError(apiErrorMessage(err, 'Failed to remove profile photo.'))
    } finally {
      setUploadingPhoto(false)
    }
  }

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

  if (loading) return <DetailLoadingState />
  if (error || !profile) return <DetailErrorState message={error || 'Profile not found.'} />

  const profileDirty = fullName.trim() !== profile.fullName || email.trim() !== profile.email
  const memberSince = formatDate(profile.createdAt)

  return (
    <Box sx={{ minWidth: 0, maxWidth: 1080, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', sm: '1.75rem' }, color: ICS_PRIMARY }}>
          Profile settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Manage your photo, contact details, and password
        </Typography>
      </Box>

      {(profileSuccess || profileError) && (
        <Box sx={{ mb: 2 }}>
          {profileSuccess && (
            <Alert severity="success" sx={{ borderRadius: 2, mb: profileError ? 1 : 0 }} onClose={() => setProfileSuccess('')}>
              {profileSuccess}
            </Alert>
          )}
          {profileError && (
            <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setProfileError('')}>
              {profileError}
            </Alert>
          )}
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        {/* Identity sidebar */}
        <Paper
          elevation={0}
          sx={{
            ...sectionPaperSx,
            mb: 0,
            position: { lg: 'sticky' },
            top: { lg: 88 },
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              mx: -2.5,
              mt: -2.5,
              mb: 2.5,
              px: 2.5,
              pt: 3,
              pb: 4,
              background: `linear-gradient(160deg, ${ICS_PRIMARY} 0%, #0C4DA8 100%)`,
              textAlign: 'center',
              color: '#fff',
            }}
          >
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              {profile.profilePhoto && profilePhotoLoading ? (
                <AvatarSkeleton size={96} />
              ) : (
              <Avatar
                src={profilePhotoUrl || undefined}
                sx={{
                  width: 96,
                  height: 96,
                  mx: 'auto',
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  border: '4px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  bgcolor: hexToRgba('#fff', 0.15),
                }}
              >
                {profile.profilePhoto ? null : userInitials(profile.fullName)}
              </Avatar>
              )}
              <Tooltip title="Change photo">
                <span>
                  <IconButton
                    size="small"
                    disabled={uploadingPhoto}
                    onClick={() => photoInputRef.current?.click()}
                    sx={{
                      position: 'absolute',
                      right: 0,
                      bottom: 0,
                      bgcolor: '#fff',
                      color: ICS_PRIMARY,
                      boxShadow: 2,
                      '&:hover': { bgcolor: '#f8fafc' },
                    }}
                  >
                    {uploadingPhoto ? (
                      <CircularProgress size={18} sx={{ color: ICS_PRIMARY }} />
                    ) : (
                      <PhotoCameraOutlinedIcon fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => void handlePhotoSelected(e)}
              />
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 800, mt: 1.5, wordBreak: 'break-word' }}>
              {profile.fullName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.88 }}>
              @{profile.username}
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
              <Chip
                label={roleLabel(profile.role)}
                size="small"
                sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.95)', color: ICS_PRIMARY }}
              />
              <Chip label={profile.status} size="small" sx={{ fontWeight: 700, ...statusChipOnGradient(profile.status) }} />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<CloudUploadOutlinedIcon />}
              disabled={uploadingPhoto}
              onClick={() => photoInputRef.current?.click()}
              sx={{ borderRadius: 2, fontWeight: 700, borderColor: hexToRgba(ICS_PRIMARY, 0.35), color: ICS_PRIMARY }}
            >
              Upload photo
            </Button>
            {profile.profilePhoto && (
              <Button
                variant="text"
                fullWidth
                color="error"
                startIcon={<DeleteOutlinedIcon />}
                disabled={uploadingPhoto}
                onClick={() => void handleRemovePhoto()}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                Remove photo
              </Button>
            )}
          </Box>

          <Divider sx={{ mb: 1.5 }} />

          <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 1 }}>
            Account
          </Typography>
          <List dense disablePadding sx={{ mt: 0.5 }}>
            <AccountFact icon={<BadgeOutlinedIcon fontSize="small" />} label="Username" value={profile.username} />
            <AccountFact icon={<AlternateEmailOutlinedIcon fontSize="small" />} label="Email" value={profile.email} />
            <AccountFact icon={<CalendarMonthOutlinedIcon fontSize="small" />} label="Member since" value={memberSince} />
            {profile.shippingLineName && (
              <AccountFact
                icon={<VerifiedUserOutlinedIcon fontSize="small" />}
                label="Shipping line"
                value={profile.shippingLineName}
              />
            )}
            {profile.depotName && (
              <AccountFact icon={<WarehouseOutlinedIcon fontSize="small" />} label="Depot" value={profile.depotName} />
            )}
          </List>
        </Paper>

        {/* Main settings panel */}
        <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0, p: 0, overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={(_, value: string) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ ...detailTabsSx, px: { xs: 1, sm: 2 } }}
          >
            <Tab icon={<PersonOutlinedIcon fontSize="small" />} iconPosition="start" label="Personal info" value="account" />
            <Tab icon={<LockOutlinedIcon fontSize="small" />} iconPosition="start" label="Password" value="security" />
          </Tabs>

          <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
            <DetailTabPanel value="account" activeTab={activeTab}>
              <Box component="form" onSubmit={handleSaveProfile}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      bgcolor: hexToRgba(ICS_PRIMARY, 0.08),
                      color: ICS_PRIMARY,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <SettingsOutlinedIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Personal information
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Name and email shown across ICS
                    </Typography>
                  </Box>
                </Box>

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
                  sx={{ ...fieldSx, mb: 3 }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={savingProfile ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                    disabled={savingProfile || !profileDirty}
                    sx={{
                      fontWeight: 700,
                      px: 3,
                      py: 1.1,
                      borderRadius: 2,
                      bgcolor: ICS_PRIMARY,
                      '&:hover': { bgcolor: '#0A3580' },
                    }}
                  >
                    Save changes
                  </Button>
                </Box>
              </Box>
            </DetailTabPanel>

            <DetailTabPanel value="security" activeTab={activeTab}>
              <Box component="form" onSubmit={handleChangePassword}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      bgcolor: hexToRgba(ICS_PRIMARY, 0.08),
                      color: ICS_PRIMARY,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <LockOutlinedIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Change password
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Use a strong password you do not use elsewhere
                    </Typography>
                  </Box>
                </Box>

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
                  sx={{ ...fieldSx, mb: 3 }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                    sx={{
                      fontWeight: 700,
                      px: 3,
                      py: 1.1,
                      borderRadius: 2,
                      bgcolor: ICS_PRIMARY,
                      '&:hover': { bgcolor: '#0A3580' },
                    }}
                  >
                    {savingPassword ? <CircularProgress size={22} color="inherit" /> : 'Update password'}
                  </Button>
                </Box>
              </Box>
            </DetailTabPanel>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
