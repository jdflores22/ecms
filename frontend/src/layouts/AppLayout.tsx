import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import DescriptionIcon from '@mui/icons-material/Description'
import CalendarViewDayIcon from '@mui/icons-material/CalendarViewDay'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import PaymentsIcon from '@mui/icons-material/Payments'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import PeopleIcon from '@mui/icons-material/People'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import HistoryIcon from '@mui/icons-material/History'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined'
import SystemUpdateAltOutlinedIcon from '@mui/icons-material/SystemUpdateAltOutlined'
import AssessmentIcon from '@mui/icons-material/Assessment'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { roleLabel } from '../config/roleConfig'
import { authApi, roleApi } from '../services/api'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { logout, updateUser } from '../store/slices/authSlice'
import { ICS_BRAND } from '../config/brandCopy'
import { getNavPagesForRole, type AppPageKey } from '../config/routeAccess'
import { useAdminPendingPaymentCount } from '../hooks/useAdminPendingPaymentCount'
import { useDepotWaitingScheduleCount } from '../hooks/useDepotWaitingScheduleCount'
import { useDepotPendingWithdrawalCount } from '../hooks/useDepotPendingWithdrawalCount'
import { useTruckerPendingWithdrawalCount } from '../hooks/useTruckerPendingWithdrawalCount'
import { useTruckerPaymentDueCount } from '../hooks/useTruckerPaymentDueCount'
import { SYSTEM_TIMEZONE } from '../utils/datetime'
import { resolveAssetUrl } from '../utils/assetUrl'
import { scheduleNonCritical } from '../utils/deferWork'
import NotificationBell from '../components/NotificationBell'
import IcsLogo from '../components/brand/IcsLogo'

const drawerWidth = 272
const appBarHeight = 64

const primaryDark = '#0B3D91'
const primaryLight = '#00A3E0'

function userInitials(name?: string) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function isNavActive(path: string, current: string, allNavPaths: string[]) {
  if (path === '/') return current === '/'

  const matches = current === path || current.startsWith(`${path}/`)
  if (!matches) return false

  const hasMoreSpecificNavMatch = allNavPaths.some(
    (other) =>
      other !== path &&
      other.startsWith(`${path}/`) &&
      (current === other || current.startsWith(`${other}/`)),
  )

  return !hasMoreSpecificNavMatch
}

const navIcons: Record<AppPageKey, React.ReactNode> = {
  dashboard: <DashboardIcon fontSize="small" />,
  profile: <PersonOutlinedIcon fontSize="small" />,
  preforecast: <DescriptionIcon fontSize="small" />,
  evaluations: <FactCheckIcon fontSize="small" />,
  cyAllocation: <WarehouseOutlinedIcon fontSize="small" />,
  containerInventory: <Inventory2OutlinedIcon fontSize="small" />,
  demurrageBilling: <PaymentsIcon fontSize="small" />,
  adminReports: <AssessmentIcon fontSize="small" />,
  depotReports: <AssessmentIcon fontSize="small" />,
  evaluatorReports: <AssessmentIcon fontSize="small" />,
  truckerReports: <AssessmentIcon fontSize="small" />,
  depotDailyReturns: <CalendarViewDayIcon fontSize="small" />,
  depotSchedules: <CalendarMonthIcon fontSize="small" />,
  adminPayments: <PaymentsIcon fontSize="small" />,
  truckerReturns: <LocalShippingIcon fontSize="small" />,
  truckerPayments: <PaymentsIcon fontSize="small" />,
  truckerDemurrageBilling: <PaymentsIcon fontSize="small" />,
  evaluatorAtw: <AssignmentTurnedInOutlinedIcon fontSize="small" />,
  depotWithdrawals: <UnarchiveOutlinedIcon fontSize="small" />,
  truckerWithdrawals: <UnarchiveOutlinedIcon fontSize="small" />,
  truckerQr: <QrCode2Icon fontSize="small" />,
  truckerQrPrint: <QrCode2Icon fontSize="small" />,
  adminUsers: <PeopleIcon fontSize="small" />,
  adminRoles: <AdminPanelSettingsIcon fontSize="small" />,
  adminMasterData: <WarehouseIcon fontSize="small" />,
  adminAudit: <HistoryIcon fontSize="small" />,
  adminVersion: <SystemUpdateAltOutlinedIcon fontSize="small" />,
  adminRevenue: <TrendingUpIcon fontSize="small" />,
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const user = useAppSelector((s) => s.auth.user)
  const refreshToken = useAppSelector((s) => s.auth.refreshToken)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const waitingScheduleCount = useDepotWaitingScheduleCount(user?.role, user?.allowedPages)
  const pendingWithdrawalCount = useDepotPendingWithdrawalCount(user?.role, user?.allowedPages)
  const truckerPendingWithdrawalCount = useTruckerPendingWithdrawalCount(user?.role, user?.allowedPages)
  const paymentDueCount = useTruckerPaymentDueCount(user?.role, user?.allowedPages)
  const pendingPaymentVerifyCount = useAdminPendingPaymentCount(user?.role, user?.allowedPages)

  useEffect(() => {
    if (!user?.role) return undefined
    const cancel = scheduleNonCritical(() => {
      roleApi
        .access()
        .then(({ data }) => {
          dispatch(updateUser({ allowedPages: data.allowedPages }))
        })
        .catch(() => {
          /* keep login-time pages */
        })
    })
    return cancel
  }, [user?.role, dispatch])

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } finally {
      dispatch(logout())
      navigate('/login')
    }
  }

  const goTo = (path: string) => {
    navigate(path)
    setMobileOpen(false)
  }

  const navBadgeConfig = useMemo<Partial<Record<AppPageKey, { count: number; ariaLabel: string }>>>(
    () => ({
      depotSchedules: { count: waitingScheduleCount, ariaLabel: 'waiting schedule' },
      depotWithdrawals: { count: pendingWithdrawalCount, ariaLabel: 'pending withdrawal review' },
      truckerWithdrawals: {
        count: truckerPendingWithdrawalCount,
        ariaLabel: 'withdrawal action required',
      },
      truckerPayments: { count: paymentDueCount, ariaLabel: 'payment due' },
      adminPayments: { count: pendingPaymentVerifyCount, ariaLabel: 'awaiting verification' },
    }),
    [
      waitingScheduleCount,
      pendingWithdrawalCount,
      truckerPendingWithdrawalCount,
      paymentDueCount,
      pendingPaymentVerifyCount,
    ],
  )

  const menuItems = useMemo(
    () =>
      user?.role
        ? getNavPagesForRole(user.role, user.allowedPages).map((page) => ({
            text: page.label,
            icon: navIcons[page.key],
            path: page.path,
            badge: navBadgeConfig[page.key]?.count ?? 0,
            badgeAriaLabel: navBadgeConfig[page.key]?.ariaLabel,
          }))
        : [
            {
              text: 'Dashboard',
              icon: <DashboardIcon fontSize="small" />,
              path: '/',
              badge: 0,
              badgeAriaLabel: undefined,
            },
          ],
    [navBadgeConfig, user?.allowedPages, user?.role],
  )

  const navPaths = useMemo(() => menuItems.map((item) => item.path), [menuItems])

  const drawerPaperSx = {
    width: drawerWidth,
    boxSizing: 'border-box' as const,
    borderRight: '1px solid',
    borderColor: 'divider',
    bgcolor: '#FAFBFD',
    backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
  }

  const permanentDrawerPaperSx = {
    ...drawerPaperSx,
    top: appBarHeight,
    height: `calc(100% - ${appBarHeight}px)`,
  }

  const navItemSx = (active: boolean) => ({
    mx: 1.5,
    mb: 0.5,
    borderRadius: 2,
    minHeight: 44,
    transition: 'background-color 0.15s ease, color 0.15s ease',
    ...(active
      ? {
          bgcolor: 'rgba(11, 61, 145, 0.1)',
          color: primaryDark,
          fontWeight: 600,
          '& .MuiListItemIcon-root': { color: primaryDark },
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '20%',
            bottom: '20%',
            width: 3,
            borderRadius: '0 4px 4px 0',
            bgcolor: primaryLight,
          },
        }
      : {
          color: 'text.secondary',
          '&:hover': { bgcolor: 'rgba(11, 61, 145, 0.06)', color: 'text.primary' },
          '& .MuiListItemIcon-root': { color: 'text.secondary' },
        }),
  })

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', py: 2 }}>
      <Box sx={{ px: 2.5, pb: 2 }}>
        <Box
          component="button"
          type="button"
          onClick={() => goTo('/profile')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            width: '100%',
            borderRadius: 2,
            bgcolor: isNavActive('/profile', location.pathname, navPaths)
              ? 'rgba(11, 61, 145, 0.1)'
              : 'rgba(11, 61, 145, 0.06)',
            border: '1px solid',
            borderColor: isNavActive('/profile', location.pathname, navPaths)
              ? 'rgba(11, 61, 145, 0.2)'
              : 'rgba(11, 61, 145, 0.1)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background-color 0.15s ease, border-color 0.15s ease',
            '&:hover': {
              bgcolor: 'rgba(11, 61, 145, 0.1)',
              borderColor: 'rgba(11, 61, 145, 0.2)',
            },
          }}
        >
          <Avatar
            src={user?.profilePhoto ? resolveAssetUrl(user.profilePhoto) : undefined}
            sx={{
              width: 40,
              height: 40,
              bgcolor: primaryDark,
              fontSize: '0.875rem',
              fontWeight: 700,
            }}
          >
            {user?.profilePhoto ? null : userInitials(user?.fullName)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
              {user?.fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {user?.role ? roleLabel(user.role) : ''}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Typography
        variant="overline"
        sx={{ px: 3, mb: 0.5, color: 'text.disabled', fontWeight: 700, letterSpacing: 1.2 }}
      >
        Menu
      </Typography>

      <List sx={{ flex: 1, px: 0.5, py: 0 }}>
        {menuItems.map((item) => {
          const active = isNavActive(item.path, location.pathname, navPaths)
          return (
            <ListItemButton
              key={item.path}
              onClick={() => goTo(item.path)}
              selected={active}
              sx={navItemSx(active)}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.text}
                slotProps={{ primary: { sx: { fontSize: '0.9rem', fontWeight: active ? 600 : 500 } } }}
              />
              {item.badge > 0 ? (() => {
                const badgeLabel = item.badge > 99 ? '99+' : String(item.badge)
                const badgeSize = badgeLabel.length > 1 ? 26 : 22
                return (
                  <Box
                    aria-label={`${badgeLabel} ${item.badgeAriaLabel ?? 'items'}`}
                    sx={{
                      width: badgeSize,
                      height: badgeSize,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      bgcolor: 'rgba(237, 108, 2, 0.12)',
                      border: '1px solid rgba(237, 108, 2, 0.22)',
                      color: '#C2410C',
                      fontSize: badgeLabel.length > 1 ? '0.625rem' : '0.7rem',
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {badgeLabel}
                  </Box>
                )
              })() : null}
            </ListItemButton>
          )
        })}
      </List>

      <Divider sx={{ mx: 2, mb: 1 }} />

      <List sx={{ px: 0.5 }}>
        <ListItemButton
          onClick={() => goTo('/profile')}
          selected={isNavActive('/profile', location.pathname, navPaths)}
          sx={navItemSx(isNavActive('/profile', location.pathname, navPaths))}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <PersonOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Profile"
            slotProps={{
              primary: {
                sx: { fontSize: '0.9rem', fontWeight: isNavActive('/profile', location.pathname, navPaths) ? 600 : 500 },
              },
            }}
          />
        </ListItemButton>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            mx: 1.5,
            borderRadius: 2,
            minHeight: 44,
            color: 'text.secondary',
            '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.08)', color: 'error.main' },
            '&:hover .MuiListItemIcon-root': { color: 'error.main' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
            slotProps={{ primary: { sx: { fontSize: '0.9rem', fontWeight: 500 } } }}
          />
        </ListItemButton>
      </List>
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ px: 2.5, pb: 2, display: 'block', textAlign: 'center', lineHeight: 1.4 }}
      >
        {SYSTEM_TIMEZONE.labelLong}
      </Typography>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          background: `linear-gradient(135deg, ${primaryDark} 0%, #0A3580 55%, #0C4DA8 100%)`,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 20px rgba(11, 61, 145, 0.25)',
        }}
      >
        <Toolbar sx={{ minHeight: appBarHeight, px: { xs: 2, sm: 3 } }}>
          <IconButton
            color="inherit"
            edge="start"
            sx={{ mr: 1.5, display: { sm: 'none' } }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, minWidth: 0 }}>
            <IcsLogo height={{ xs: 32, sm: 36 }} maxWidth={{ xs: 80, sm: 96 }} />
            <Box sx={{ minWidth: 0, display: { xs: 'none', md: 'block' } }}>
              <Typography
                variant="h6"
                noWrap
                sx={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2 }}
              >
                {ICS_BRAND.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                {ICS_BRAND.appBarCaption}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <NotificationBell />
          <Tooltip title={`${user?.fullName ?? 'Profile'} — view profile`}>
            <Chip
              avatar={
                <Avatar
                  src={user?.profilePhoto ? resolveAssetUrl(user.profilePhoto) : undefined}
                  sx={{ bgcolor: primaryLight, color: '#fff', width: 28, height: 28, fontSize: '0.75rem' }}
                >
                  {user?.profilePhoto ? null : userInitials(user?.fullName)}
                </Avatar>
              }
              label={user?.role ? roleLabel(user.role) : ''}
              onClick={() => navigate('/profile')}
              sx={{
                display: { xs: 'none', md: 'flex' },
                bgcolor: 'rgba(255,255,255,0.12)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.18)',
                fontWeight: 500,
                cursor: 'pointer',
                '& .MuiChip-label': { px: 1 },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              }}
            />
          </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              ...drawerPaperSx,
              top: appBarHeight,
              height: `calc(100% - ${appBarHeight}px)`,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': permanentDrawerPaperSx,
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: `${appBarHeight}px`,
          minHeight: `calc(100vh - ${appBarHeight}px)`,
          minWidth: 0,
          overflowX: 'hidden',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
