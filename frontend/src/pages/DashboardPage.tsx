import { DashboardSkeleton, CardPanelSkeleton } from '../components/layout/SkeletonPrimitives'
import {
  DashboardAttentionPanel,
  DashboardQuickLinkCard,
  DashboardStatStrip,
  DashboardWorkflowPanel,
} from '../components/dashboard/DashboardWidgets'
import { Alert, Box, Button, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PortalPageHeader } from '../components/layout/PortalPageHeader'
import { portalPrimaryButtonSx } from '../theme/portalStyles'
import CyAllocationDashboardPanel from '../components/dashboard/CyAllocationDashboardPanel'
import { isTruckerOrBroker, roleLabel } from '../config/roleConfig'
import { cyAllocationApi } from '../services/api'
import { fetchCachedDashboard } from '../utils/dashboardApiCache'
import type { CyAllocation } from '../services/api'
import { useAppSelector } from '../store/hooks'
import { dashboardConfig, isUserRole } from '../config/dashboardConfig'
import { portalColors } from '../theme/portalTheme'
import { ICS_BRAND } from '../config/brandCopy'

interface DashboardRejectedReason {
  reason: string
  count: number
}

interface DashboardWidgets {
  expiringWithin48Hours: number
  stuckOver24HoursInReview: number
  depotTurnaroundHours: number
  topRejectedReasons: DashboardRejectedReason[]
}

type DashboardWidgetKey = 'expiring48' | 'stuck24' | 'rejectedReasons' | 'turnaround'

type DashboardPayload = Record<string, unknown> & {
  widgets?: DashboardWidgets
}

const QUICK_LINK_DESCRIPTIONS: Record<string, string> = {
  '/evaluations': 'Review and approve pending pre-forecast submissions.',
  '/evaluations/cy-allocation': 'Monitor CY allocation across contracted yards.',
  '/evaluations/cy-fill-priority': 'Set daily CY fill priority for your shipping line.',
  '/evaluations/demurrage-billing': 'Process demurrage and detention billing.',
  '/evaluations/demurrage-rates': 'Manage demurrage rate tables.',
  '/evaluations/statement-of-accounts': 'View statements of account.',
  '/evaluations/container-inventory': 'CY inventory visibility and status.',
  '/admin/users': 'Manage registered users and access.',
  '/admin/roles': 'Configure roles and page permissions.',
  '/admin/settings': 'Payments, reference data, and container yard contracts.',
  '/admin/certificate-templates': 'Certificate layout and digital seal templates.',
  '/admin/reports': 'Operational and transaction reports.',
  '/admin/revenue': 'Revenue summaries and billing oversight.',
  '/admin/audit': 'Review critical system actions.',
  '/admin/payments': 'Verify trucker payment proofs.',
  '/preforecast': 'View and manage your pre-forecast requests.',
  '/preforecast/new': 'Submit a new empty-container pre-forecast.',
  '/trucker/withdrawals': 'Track withdrawal and repositioning requests.',
  '/trucker/returns': 'Review assigned return schedules.',
  '/trucker/payments': 'Upload payment proof and track verification.',
  '/trucker/qr': 'Download LOGICTECK booking QR after verification.',
  '/depot/daily-returns': "Today's scheduled returns and slot occupancy.",
  '/depot/schedules': 'Manage return schedules and slot capacity.',
}

function quickLinkDescription(path: string, label: string) {
  return QUICK_LINK_DESCRIPTIONS[path] ?? `Open ${label.toLowerCase()}.`
}

export default function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user)
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardPayload>({})
  const [cyAllocations, setCyAllocations] = useState<CyAllocation[]>([])
  const [loading, setLoading] = useState(true)
  const [cyLoading, setCyLoading] = useState(false)
  const [error, setError] = useState('')

  const config = useMemo(() => {
    if (!user || !isUserRole(user.role)) return null
    return dashboardConfig[user.role]
  }, [user])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError('')
    fetchCachedDashboard(user.role)
      .then((payload) => setData(payload as DashboardPayload))
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Failed to load dashboard data.'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!user || user.role !== 'ShippingLineEvaluator') {
      setCyAllocations([])
      return
    }
    setCyLoading(true)
    cyAllocationApi
      .list()
      .then(({ data: allocations }) => setCyAllocations(allocations))
      .catch(() => setCyAllocations([]))
      .finally(() => setCyLoading(false))
  }, [user])

  const widgets = data.widgets
  const statValue = (key: string) => (typeof data[key] === 'number' ? (data[key] as number) : 0)

  const widgetTargetPath = useMemo(() => {
    switch (user?.role) {
      case 'Trucker':
        return '/trucker/withdrawals'
      case 'DepotPersonnel':
        return '/depot/withdrawals'
      case 'ShippingLineEvaluator':
        return '/evaluations/atw'
      default:
        return null
    }
  }, [user?.role])

  const openWidget = (key: DashboardWidgetKey) => {
    if (!widgetTargetPath) return
    navigate(`${widgetTargetPath}?widget=${key}`)
  }

  if (!user) return null

  if (!config) {
    return (
      <Alert severity="warning">
        No dashboard configured for role: {user.role}
      </Alert>
    )
  }

  const dashboardTitle = `${roleLabel(user.role)} dashboard`

  const statItems = config.stats.map((stat) => {
    const value = statValue(stat.key)
    const caption =
      stat.highlightWhenPositive && value > 0 ? `${value} need attention` : stat.description
    return {
      label: stat.label,
      value,
      caption,
    }
  })

  const attentionItems = useMemo(() => {
    const items: { label: string; value: string | number; href?: string; onClick?: () => void }[] = []

    config.stats
      .filter((stat) => stat.highlightWhenPositive && statValue(stat.key) > 0)
      .forEach((stat) => {
        items.push({
          label: stat.label,
          value: statValue(stat.key),
          href: user.role === 'Administrator' && stat.key === 'pendingEvaluations' ? '/evaluations' : undefined,
        })
      })

    if (widgets && !isTruckerOrBroker(user.role)) {
      if (widgets.expiringWithin48Hours > 0) {
        items.push({
          label: 'Expiring within 48h',
          value: widgets.expiringWithin48Hours,
          onClick: widgetTargetPath ? () => openWidget('expiring48') : undefined,
        })
      }
      if (widgets.stuckOver24HoursInReview > 0) {
        items.push({
          label: 'Stuck > 24h in review',
          value: widgets.stuckOver24HoursInReview,
          onClick: widgetTargetPath ? () => openWidget('stuck24') : undefined,
        })
      }
    }

    return items.slice(0, 5)
  }, [config.stats, data, user.role, widgetTargetPath, widgets, navigate])

  const quickActions = config.actions.slice(0, 8)

  return (
    <Box sx={{ minWidth: 0 }}>
      <PortalPageHeader
        eyebrow={ICS_BRAND.shortName}
        title={dashboardTitle}
        subtitle={config.subtitle}
        actions={
          isTruckerOrBroker(user.role) ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/preforecast/new')}
                sx={portalPrimaryButtonSx}
              >
                New pre-forecast
              </Button>
              <Button
                variant="outlined"
                startIcon={<UnarchiveOutlinedIcon />}
                onClick={() => navigate('/trucker/withdrawals/new')}
                sx={{
                  minHeight: 44,
                  borderColor: portalColors.borderStrong,
                  color: portalColors.textDark,
                  borderRadius: '0.5rem',
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    borderColor: portalColors.primary,
                    bgcolor: portalColors.bgMuted,
                    color: portalColors.primary,
                  },
                }}
              >
                New withdrawal
              </Button>
            </Box>
          ) : undefined
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '0.75rem' }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <DashboardSkeleton statCards={config.stats.length} />
      ) : (
        <>
          <Box sx={{ mb: 3 }}>
            <DashboardStatStrip items={statItems} />
          </Box>

          {quickActions.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: portalColors.textMuted,
                  mb: 1.5,
                }}
              >
                Quick access
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    lg: 'repeat(4, minmax(0, 1fr))',
                  },
                  gap: 1.5,
                }}
              >
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <DashboardQuickLinkCard
                      key={action.path}
                      to={action.path}
                      icon={Icon}
                      label={action.label}
                      description={quickLinkDescription(action.path, action.label)}
                    />
                  )
                })}
              </Box>
            </Box>
          )}

          {user.role === 'ShippingLineEvaluator' &&
            (cyLoading ? (
              <Box
                sx={{
                  mb: 3,
                  p: 2.5,
                  borderRadius: '0.875rem',
                  border: `1px solid ${portalColors.border}`,
                  bgcolor: portalColors.bgWhite,
                }}
              >
                <CardPanelSkeleton />
              </Box>
            ) : (
              <Box sx={{ mb: 3 }}>
                <CyAllocationDashboardPanel items={cyAllocations} />
              </Box>
            ))}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: attentionItems.length > 0 ? '2fr 1fr' : '1fr' },
              gap: 3,
              alignItems: 'stretch',
            }}
          >
            <DashboardWorkflowPanel steps={config.workflow} />
            {attentionItems.length > 0 && (
              <DashboardAttentionPanel
                items={attentionItems}
                subtitle={
                  user.role === 'Administrator'
                    ? 'Cross-role items that may need administrator follow-up.'
                    : 'Operational items that may require your follow-up.'
                }
              />
            )}
          </Box>
        </>
      )}
    </Box>
  )
}
