import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import DashboardIcon from '@mui/icons-material/Dashboard'
import DescriptionIcon from '@mui/icons-material/Description'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import CalendarViewDayIcon from '@mui/icons-material/CalendarViewDay'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import MenuIcon from '@mui/icons-material/Menu'
import PaymentsIcon from '@mui/icons-material/Payments'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
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
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { roleLabel } from '../config/roleConfig'
import { roleApi } from '../services/api'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { updateUser } from '../store/slices/authSlice'
import { ICS_BRAND } from '../config/brandCopy'
import { getNavPagesForRole, type AppPageKey } from '../config/routeAccess'
import { useAdminPendingPaymentCount } from '../hooks/useAdminPendingPaymentCount'
import { useDepotWaitingScheduleCount } from '../hooks/useDepotWaitingScheduleCount'
import { useDepotPendingWithdrawalCount } from '../hooks/useDepotPendingWithdrawalCount'
import { useTruckerPendingWithdrawalCount } from '../hooks/useTruckerPendingWithdrawalCount'
import { useTruckerPaymentDueCount } from '../hooks/useTruckerPaymentDueCount'
import { useTruckerDemurrageDueCount } from '../hooks/useTruckerDemurrageDueCount'
import { useEvaluatorAwaitingCyCount } from '../hooks/useEvaluatorAwaitingCyCount'
import { useEvaluatorPendingEvaluationCount } from '../hooks/useEvaluatorPendingEvaluationCount'
import { SYSTEM_TIMEZONE } from '../utils/datetime'
import { scheduleNonCritical } from '../utils/deferWork'
import NotificationBell from '../components/NotificationBell'
import TruckerBroadcastModal from '../components/TruckerBroadcastModal'
import IcsLogo from '../components/brand/IcsLogo'
import { PortalBreadcrumbs } from '../components/layout/PortalBreadcrumbs'
import { PortalUserMenu } from '../components/layout/PortalUserMenu'
import { appColors, portalColors } from '../theme/colors'
import { portalNavItemSx, portalNavSectionLabelSx } from '../theme/portalTheme'

function NavBadge({ count, active, ariaLabel }: { count: number; active: boolean; ariaLabel?: string }) {
  const label = count > 99 ? '99+' : String(count)
  return (
    <Box
      component="span"
      aria-label={ariaLabel ?? `${label} pending`}
      sx={{
        ml: 'auto',
        minWidth: 20,
        height: 20,
        px: 0.75,
        borderRadius: 999,
        bgcolor: active ? 'rgba(255,255,255,0.22)' : portalColors.primary,
        color: '#fff',
        fontSize: '0.6875rem',
        fontWeight: 700,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {label}
    </Box>
  )
}

const drawerWidth = 256
const appBarHeight = 64
const contentMaxWidth = '80rem'

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
  cyFillPriority: <WarehouseOutlinedIcon fontSize="small" />,
  cyAllocation: <WarehouseOutlinedIcon fontSize="small" />,
  containerInventory: <Inventory2OutlinedIcon fontSize="small" />,
  demurrageBilling: <PaymentsIcon fontSize="small" />,
  demurrageRates: <PaymentsIcon fontSize="small" />,
  statementOfAccounts: <DescriptionOutlinedIcon fontSize="small" />,
  adminReports: <AssessmentIcon fontSize="small" />,
  depotReports: <AssessmentIcon fontSize="small" />,
  evaluatorReports: <AssessmentIcon fontSize="small" />,
  truckerReports: <AssessmentIcon fontSize="small" />,
  depotDailyReturns: <CalendarViewDayIcon fontSize="small" />,
  depotGateScan: <QrCodeScannerIcon fontSize="small" />,
  depotSchedules: <CalendarMonthIcon fontSize="small" />,
  depotCyAllocation: <WarehouseOutlinedIcon fontSize="small" />,
  depotContainerInventory: <Inventory2OutlinedIcon fontSize="small" />,
  adminPayments: <PaymentsIcon fontSize="small" />,
  truckerReturns: <LocalShippingIcon fontSize="small" />,
  truckerPayments: <PaymentsIcon fontSize="small" />,
  truckerDemurrageBilling: <PaymentsIcon fontSize="small" />,
  truckerStatementOfAccounts: <DescriptionOutlinedIcon fontSize="small" />,
  evaluatorAtw: <AssignmentTurnedInOutlinedIcon fontSize="small" />,
  evaluatorCro: <DescriptionIcon fontSize="small" />,
  depotWithdrawals: <UnarchiveOutlinedIcon fontSize="small" />,
  depotBroadcasts: <CampaignOutlinedIcon fontSize="small" />,
  truckerWithdrawals: <UnarchiveOutlinedIcon fontSize="small" />,
  truckerQr: <QrCode2Icon fontSize="small" />,
  truckerQrPrint: <QrCode2Icon fontSize="small" />,
  truckerNotifications: <NotificationsNoneOutlinedIcon fontSize="small" />,
  adminUsers: <PeopleIcon fontSize="small" />,
  adminRoles: <AdminPanelSettingsIcon fontSize="small" />,
  adminMasterData: <SettingsOutlinedIcon fontSize="small" />,
  adminCertificateTemplates: <DescriptionIcon fontSize="small" />,
  adminTruckerNews: <ArticleOutlinedIcon fontSize="small" />,
  adminAudit: <HistoryIcon fontSize="small" />,
  adminVersion: <SystemUpdateAltOutlinedIcon fontSize="small" />,
  adminRevenue: <TrendingUpIcon fontSize="small" />,
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const waitingScheduleCount = useDepotWaitingScheduleCount(user?.role, user?.allowedPages)
  const pendingWithdrawalCount = useDepotPendingWithdrawalCount(user?.role, user?.allowedPages)
  const truckerPendingWithdrawalCount = useTruckerPendingWithdrawalCount(user?.role, user?.allowedPages)
  const paymentDueCount = useTruckerPaymentDueCount(user?.role, user?.allowedPages)
  const demurrageDueCount = useTruckerDemurrageDueCount(user?.role, user?.allowedPages)
  const pendingPaymentVerifyCount = useAdminPendingPaymentCount(user?.role, user?.allowedPages)
  const awaitingCyCount = useEvaluatorAwaitingCyCount(user?.role, user?.allowedPages)
  const pendingEvaluationCount = useEvaluatorPendingEvaluationCount(user?.role, user?.allowedPages)
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
      truckerDemurrageBilling: { count: demurrageDueCount, ariaLabel: 'demurrage payment due' },
      adminPayments: { count: pendingPaymentVerifyCount, ariaLabel: 'awaiting verification' },
      evaluations: { count: pendingEvaluationCount, ariaLabel: 'pre-forecast pending evaluation' },
      evaluatorAtw: { count: awaitingCyCount, ariaLabel: 'awaiting CY assignment' },
    }),
    [
      waitingScheduleCount,
      pendingWithdrawalCount,
      truckerPendingWithdrawalCount,
      paymentDueCount,
      demurrageDueCount,
      pendingPaymentVerifyCount,
      pendingEvaluationCount,
      awaitingCyCount,
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
    maxWidth: drawerWidth,
    boxSizing: 'border-box' as const,
    borderRight: `1px solid ${portalColors.border}`,
    bgcolor: portalColors.bgWhite,
    overflowX: 'hidden',
  }

  const permanentDrawerPaperSx = {
    ...drawerPaperSx,
    top: appBarHeight,
    height: `calc(100% - ${appBarHeight}px)`,
  }

  const breadcrumbNavItems = useMemo(
    () => menuItems.map((item) => ({ label: item.text, href: item.path })),
    [menuItems],
  )

  const profileActive = isNavActive('/profile', location.pathname, navPaths)

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, overflow: 'hidden' }}>
      <Box
        sx={{
          flexShrink: 0,
          px: 2.5,
          py: 2,
          borderBottom: `1px solid ${portalColors.border}`,
        }}
      >
        <Typography sx={{ ...portalNavSectionLabelSx, px: 0, pt: 0, pb: 0.5 }}>Menu</Typography>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: portalColors.textDark }}>
          {user?.role ? `${roleLabel(user.role)} portal` : 'ICS portal'}
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <Box component="nav" aria-label="Main" sx={{ py: 1.5 }}>
          {menuItems.map((item) => {
            const active = isNavActive(item.path, location.pathname, navPaths)
            return (
              <Box key={item.path} sx={{ px: 1.5, pb: 0.5 }}>
                <Box
                  component="button"
                  type="button"
                  className={active ? 'active' : undefined}
                  onClick={() => goTo(item.path)}
                  sx={{
                    ...portalNavItemSx,
                    border: 'none',
                    bgcolor: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {item.icon}
                  <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.text}
                  </Box>
                  {item.badge > 0 ? (
                    <NavBadge count={item.badge} active={active} ariaLabel={`${item.badge} ${item.badgeAriaLabel ?? 'items'}`} />
                  ) : null}
                </Box>
              </Box>
            )
          })}
        </Box>

        <Typography sx={portalNavSectionLabelSx}>Account</Typography>
        <Box component="nav" aria-label="Account" sx={{ pb: 1.5 }}>
          <Box sx={{ px: 1.5, pb: 0.5 }}>
            <Box
              component="button"
              type="button"
              className={profileActive ? 'active' : undefined}
              onClick={() => goTo('/profile')}
              sx={{
                ...portalNavItemSx,
                border: 'none',
                bgcolor: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <PersonOutlinedIcon />
              <Box component="span" sx={{ flex: 1, minWidth: 0 }}>My profile</Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Typography
        variant="caption"
        color="text.disabled"
        sx={{
          flexShrink: 0,
          px: 2,
          py: 1.5,
          display: 'block',
          textAlign: 'center',
          lineHeight: 1.4,
          borderTop: `1px solid ${portalColors.border}`,
        }}
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
          bgcolor: portalColors.primary,
          color: '#fff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: appColors.icsAppBarShadow,
        }}
      >
        <Toolbar sx={{ minHeight: appBarHeight, px: { xs: 2, sm: 3 } }}>
          <IconButton
            color="inherit"
            edge="start"
            sx={{
              mr: 1.5,
              display: { sm: 'none' },
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
            }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </IconButton>

          <Box
            component="button"
            type="button"
            onClick={() => navigate('/')}
            aria-label={`${ICS_BRAND.name} dashboard`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 1.5 },
              minWidth: 0,
              border: 0,
              bgcolor: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              p: 0,
            }}
          >
            <IcsLogo height={{ xs: 32, sm: 36 }} maxWidth={{ xs: 80, sm: 96 }} />
            <Typography
              component="span"
              sx={{
                display: { xs: 'none', sm: 'inline' },
                color: 'rgba(255, 255, 255, 0.88)',
                fontSize: '0.875rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              · {user?.role ? roleLabel(user.role) : ICS_BRAND.shortName}
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <NotificationBell />
            <PortalUserMenu />
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true, disableRestoreFocus: true }}
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
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: `${appBarHeight}px`,
          minHeight: `calc(100vh - ${appBarHeight}px)`,
          minWidth: 0,
          overflowX: 'hidden',
          bgcolor: portalColors.bgPage,
        }}
      >
        <Box
          sx={{
            maxWidth: contentMaxWidth,
            mx: 'auto',
            px: { xs: 2, sm: 3, lg: 4 },
            py: { xs: 3, sm: 4 },
          }}
        >
          <PortalBreadcrumbs navItems={breadcrumbNavItems} />
          <Outlet />
        </Box>
      </Box>
      <TruckerBroadcastModal />
    </Box>
  )
}
