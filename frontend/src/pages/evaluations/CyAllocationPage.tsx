import { CardGridSkeleton, StatCardsSkeleton } from '../../components/layout/SkeletonPrimitives'
import { Alert, Box, Button, LinearProgress, Paper, Typography } from '@mui/material'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useSearchParams } from 'react-router-dom'
import CyYardAllocationCard from '../../components/evaluations/CyYardAllocationCard'
import { hexToRgba, ICS_PRIMARY } from '../../components/layout/DetailPagePrimitives'
import {
  listHeroOutlineActionSx,
  listPageRootSx,
  PageHero,
} from '../../components/layout/ListPagePrimitives'
import { appColors } from '../../theme/colors'
import { canAccessPage } from '../../config/routeAccess'
import { cyAllocationApi, type CyAllocation, type CyAllocationForApproval } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import {
  aggregateAtYardTeuBySize,
  aggregatePreAdvisedTeuBySize,
  cyUtilizationPctCapped,
  formatUtilizationPctLabel,
  getAllocationSizeLabel,
  progressBarColor,
} from '../../utils/cyAllocation'
import { formatContainerSizeLabel } from '../../utils/containerSize'
import axios from 'axios'

const primaryDark = ICS_PRIMARY

function loadErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string' && msg.trim()) return msg
    if (err.response?.status === 403) {
      return 'Your role does not have access to container yard allocation.'
    }
  }
  return fallback
}

function SummaryCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: '1rem',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: appColors.surfaceShadow,
        minWidth: 0,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, lineHeight: 1.3, wordBreak: 'break-word', display: 'block' }}
      >
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 0.5, fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>
        {value}
      </Typography>
    </Paper>
  )
}

export default function CyAllocationPage() {
  const user = useAppSelector((s) => s.auth.user)
  const [searchParams] = useSearchParams()
  const preAdviceId = searchParams.get('preAdviceId')
  const [items, setItems] = useState<CyAllocation[]>([])
  const [approvalContext, setApprovalContext] = useState<CyAllocationForApproval | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    setApprovalContext(null)

    if (preAdviceId) {
      cyAllocationApi
        .forApproval(Number(preAdviceId))
        .then(({ data }) => {
          setApprovalContext(data)
          setItems(data.allocations)
        })
        .catch((err) =>
          setError(loadErrorMessage(err, 'Failed to load container yard allocations for this evaluation.')),
        )
        .finally(() => setLoading(false))
      return
    }

    cyAllocationApi
      .list()
      .then(({ data }) => setItems(data))
      .catch((err) => setError(loadErrorMessage(err, 'Failed to load container yard allocations.')))
      .finally(() => setLoading(false))
  }, [preAdviceId])

  useEffect(() => {
    load()
  }, [load])

  const shippingLineCode = items[0]?.shippingLineCode ?? ''
  const shippingLineName = items[0]?.shippingLineName ?? ''

  const totals = useMemo(() => {
    const sizeTotals = aggregateAtYardTeuBySize(items)
    const committedTotals = aggregatePreAdvisedTeuBySize(items)
    const contractTeu = items.reduce((sum, i) => sum + i.contractTeu, 0)
    const atYardTeu = Math.round(items.reduce((sum, i) => sum + i.atYardTeu, 0))
    const confirmedTeu = Math.round(items.reduce((sum, i) => sum + i.confirmedTeu, 0))
    const preForecastTeu = Math.round(items.reduce((sum, i) => sum + i.preForecastTeu, 0))
    const committedTeu = Math.round(items.reduce((sum, i) => sum + i.preAdvisedTeu, 0))
    const bookingTeu = Math.round(items.reduce((sum, i) => sum + i.bookingTeu, 0))
    const yardsAtLimit = items.filter((i) => !i.hasCapacity).length
    const teuPct = cyUtilizationPctCapped(committedTeu, contractTeu)
    const teuOver = contractTeu > 0 && committedTeu > contractTeu
    return {
      ...sizeTotals,
      committedTotals,
      contractTeu,
      atYardTeu,
      confirmedTeu,
      preForecastTeu,
      committedTeu,
      bookingTeu,
      yardsAtLimit,
      teuPct,
      teuOver,
    }
  }, [items])

  if (user?.role && !canAccessPage(user.role, 'cyAllocation', user.allowedPages)) {
    return <Navigate to="/" replace />
  }

  return (
    <Box sx={listPageRootSx}>
      <PageHero
        icon={<WarehouseOutlinedIcon />}
        title="CY allocation"
        subtitle={
          <>
            Read-only view of your shipping line&apos;s contracted yard capacity. At-yard counts are physical gate
            check-ins; orange +confirmed and +pre-forecast show pipeline units not yet at the CY. Released ATW units are
            excluded — see{' '}
            <Box
              component={RouterLink}
              to="/evaluations/container-inventory"
              sx={{ color: '#7dd3fc', fontWeight: 600, textDecoration: 'underline', display: 'inline' }}
            >
              CY inventory
            </Box>{' '}
            for released units.
            {shippingLineName ? ` ${shippingLineName}.` : ''}
          </>
        }
        actions={
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={load}
            disabled={loading}
            sx={listHeroOutlineActionSx}
          >
            Refresh
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {approvalContext && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Choosing a yard for {approvalContext.referenceNo} ({formatContainerSizeLabel(approvalContext.containerSize)}).{' '}
          <Typography
            component={RouterLink}
            to={`/evaluations/${approvalContext.preAdviceId}`}
            sx={{ fontWeight: 700, color: 'inherit' }}
          >
            Back to evaluation
          </Typography>
        </Alert>
      )}

      {!preAdviceId && (
        <Typography
          component={RouterLink}
          to="/evaluations"
          sx={{ display: 'inline-block', mb: 2, fontWeight: 600, color: primaryDark, textDecoration: 'none' }}
        >
          ← Back to evaluations
        </Typography>
      )}

      {!loading && items.length > 0 && (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
              gap: { xs: 1.5, sm: 2 },
              mb: 2,
            }}
          >
            <SummaryCard label="Contract (TEU)" value={totals.contractTeu} color={primaryDark} />
            <SummaryCard label="At yard (TEU)" value={totals.atYardTeu} color="#0B3D91" />
            <SummaryCard label="+ Confirmed (TEU)" value={totals.confirmedTeu} color="#0288D1" />
            <SummaryCard label="+ Pre-forecast (TEU)" value={totals.preForecastTeu} color="#C2410C" />
            <SummaryCard label="Yards at limit" value={totals.yardsAtLimit} color="#D32F2F" />
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
              mb: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: '#fff',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.25 }}>
              <Inventory2OutlinedIcon sx={{ color: 'text.secondary', mt: 0.25 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Overall utilization
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getAllocationSizeLabel('20')}: {totals.teu20} at yard · {getAllocationSizeLabel('40')}: {totals.teu40} at yard ·{' '}
                  {formatUtilizationPctLabel(totals.committedTeu, totals.contractTeu)} committed
                </Typography>
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, totals.teuPct)}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: hexToRgba(primaryDark, 0.08),
                '& .MuiLinearProgress-bar': {
                  bgcolor: totals.teuOver ? '#D32F2F' : progressBarColor(totals.teuPct),
                  borderRadius: 4,
                },
              }}
            />
          </Paper>
        </>
      )}

      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Container yards
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Contract limits are configured by administrators in Master Data.
        </Typography>
      </Box>

      {loading ? (
        <><StatCardsSkeleton count={4} /><CardGridSkeleton cards={2} /></>
      ) : items.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
            textAlign: 'center',
          }}
        >
          <Typography color="text.secondary">
            No CY contracts are configured for your shipping line yet. Ask an administrator to set up contract
            allocations in Master Data.
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              xl: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          {items.map((row) => (
            <CyYardAllocationCard
              key={row.depotId}
              allocation={row}
              shippingLineCode={shippingLineCode}
              shippingLineName={shippingLineName}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
