import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import {
  Avatar,
  Box,
  CircularProgress,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { roleLabel } from '../../config/roleConfig'
import { logoutSession } from '../../services/api'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { logout } from '../../store/slices/authSlice'
import { useAssetUrlState } from '../../hooks/useAssetUrl'
import { AvatarSkeleton } from './SkeletonPrimitives'
import { portalColors } from '../../theme/portalTheme'

function userInitials(name?: string) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function PortalUserMenu() {
  const user = useAppSelector((s) => s.auth.user)
  const refreshToken = useAppSelector((s) => s.auth.refreshToken)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const { url: profilePhotoUrl, loading: profilePhotoLoading } = useAssetUrlState(user?.profilePhoto)
  const open = Boolean(anchorEl)

  if (!user) return null

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    setAnchorEl(null)
    try {
      await logoutSession(refreshToken)
      dispatch(logout())
      navigate('/login', { replace: true })
    } catch {
      setLoggingOut(false)
    }
  }

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-controls={open ? 'portal-user-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        aria-label="Open user menu"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          border: 'none',
          borderRadius: '0.5rem',
          bgcolor: open ? 'rgba(255,255,255,0.12)' : 'transparent',
          color: '#fff',
          cursor: 'pointer',
          px: { xs: 0.5, sm: 1 },
          py: 0.5,
          transition: 'background-color 0.15s ease',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
        }}
      >
        {user.profilePhoto && profilePhotoLoading ? (
          <AvatarSkeleton size={32} />
        ) : (
          <Avatar
            src={profilePhotoUrl || undefined}
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'rgba(255,255,255,0.15)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {user.profilePhoto ? null : userInitials(user.fullName)}
          </Avatar>
        )}
        <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left', minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              lineHeight: 1.2,
              color: 'inherit',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 180,
            }}
          >
            {user.fullName}
          </Typography>
          <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.2 }}>
            {roleLabel(user.role)}
          </Typography>
        </Box>
        <KeyboardArrowDownIcon sx={{ fontSize: 18, opacity: 0.8, display: { xs: 'none', sm: 'block' } }} />
      </Box>

      <Menu
        id="portal-user-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 200,
              borderRadius: '0.75rem',
              border: `1px solid ${portalColors.border}`,
              boxShadow: '0 8px 24px rgba(11, 61, 145, 0.12)',
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{user.fullName}</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: portalColors.textMuted }}>{roleLabel(user.role)}</Typography>
        </Box>
        <Divider />
        <MenuItem component={RouterLink} to="/profile" onClick={() => setAnchorEl(null)}>
          <ListItemIcon>
            <PersonOutlineOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>My profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleLogout} disabled={loggingOut}>
          <ListItemIcon>
            {loggingOut ? (
              <CircularProgress size={18} aria-label="Logging out" />
            ) : (
              <LogoutOutlinedIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>{loggingOut ? 'Logging out…' : 'Logout'}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
