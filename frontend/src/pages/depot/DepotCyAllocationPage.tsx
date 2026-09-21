import { CardGridSkeleton, StatCardsSkeleton } from '../../components/layout/SkeletonPrimitives'
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate } from 'react-router-dom'
import CyYardAllocationCard from '../../components/evaluations/CyYardAllocationCard'
import { hexToRgba, ICS_PRIMARY } from '../../components/layout/DetailPagePrimitives'
import {
  listHeroOutlineActionSx,
  listPageRootSx,
  PageHero,
} from '../../components/layout/ListPagePrimitives'
import { appColors } from '../../theme/colors'
import { canAccessPage } from '../../config/routeAccess'
import { cyAllocationApi, depotApi, type CyAllocation, type Depot } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import {
  aggregateAtYardTeuBySize,
  aggregatePreAdvisedTeuBySize,
  cyUtilizationPctCapped,
  formatUtilizationPctLabel,
  getAllocationSizeLabel,
  progressBarColor,
} from '../../utils/cyAllocation'
import axios from 'axios'

const primaryDark = ICS_PRIMARY

function loadErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string' && msg.trim()) return msg
    if (err.response?.status === 403) {
      return 'Your role does not have access to CY allocation for this depot.'
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

export default function DepotCyAllocationPage() {
  const user = useAppSelector((s) => s.auth.user)
  const [items, setItems] = useState<CyAllocation[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [depotId, setDepotId] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isAdmin = user?.role === 'Administrator'
  const allowed = user?.role === 'DepotPersonnel' || isAdmin

  useEffect(() => {
    if (!isAdmin) return
    depotApi.list().then(({ data }) => setDepots(data)).catch(() => {})
  }, [isAdmin])

  useEffect(() => {
    if (user?.role === 'DepotPersonnel' && user.depotId) {
      setDepotId(user.depotId)
    } else if (isAdmin && depots.length > 0 && depotId === '') {
      setDepotId(depots[0].id)
    }
  }, [user, depots, depotId, isAdmin])

  const effectiveDepotId = useMemo(() => {
    if (depotId !== '') return depotId
    if (user?.depotId) return user.depotId
    return null
  }, [depotId, user?.depotId])

  const depotName = useMemo(() => {
    if (items[0]?.depotName) return items[0].depotName
    if (effectiveDepotId) {
      const match = depots.find((d) => d.id === effectiveDepotId)
      if (match) return match.name
    }
    return null
  }, [items, effectiveDepotId, depots])

  const load = useCallback(() => {
    if (!allowed) return
    if (isAdmin && !effectiveDepotId) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    cyAllocationApi
      .listByDepot(isAdmin ? effectiveDepotId ?? undefined : undefined)
      .then(({ data }) => setItems(data))
      .catch((err) => setError(loadErrorMessage(err, 'Failed to load shipping line allocations for this yard.')))
      .finally(() => setLoading(false))
  }, [allowed, isAdmin, effectiveDepotId])

  useEffect(() => {
    load()
  }, [load])

  const totals = useMemo(() => {
    const sizeTotals = aggregateAtYardTeuBySize(items)
    const committedTotals = aggregatePreAdvisedTeuBySize(items)
    const contractTeu = items.reduce((sum, i) => sum + i.contractTeu, 0)
    const atYardTeu = Math.round(items.reduce((sum, i) => sum + i.atYardTeu, 0))
    const confirmedTeu = Math.round(items.reduce((sum, i) => sum + i.confirmedTeu, 0))
    const preForecastTeu = Math.round(items.reduce((sum, i) => sum + i.preForecastTeu, 0))
    const committedTeu = Math.round(items.reduce((sum, i) => sum + i.preAdvisedTeu, 0))
    const linesAtLimit = items.filter((i) => !i.hasCapacity).length
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
      linesAtLimit,
      teuPct,
      teuOver,
    }
  }, [items])

  if (user?.role && !canAccessPage(user.role, 'depotCyAllocation', user.allowedPages)) {
    return <Navigate to="/" replace />
  }

  if (!allowed) {
    return <Navigate to="/" replace />
  }

  return (
    <Box sx={listPageRootSx}>
      <PageHero
        icon={<WarehouseOutlinedIcon />}
        title="CY allocation"
        subtitle={
          <>
            Read-only view of shipping lines contracted at your container yard. At-yard counts are physical gate
            check-ins; orange +confirmed and +pre-forecast show pipeline units not yet at the CY. See{' '}
            <Box
              component={RouterLink}
              to="/depot/container-inventory"
              sx={{ color: '#7dd3fc', fontWeight: 600, textDecoration: 'underline', display: 'inline' }}
            >
              CY inventory
            </Box>{' '}
            for container-level detail by line.
            {depotName ? ` ${depotName}.` : ''}
          </>
        }
        actions={
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={load}
            disabled={loading || (isAdmin && !effectiveDepotId)}
            sx={listHeroOutlineActionSx}
          >
            Refresh
          </Button>
        }
      />

      {isAdmin && depots.length > 0 && (
        <FormControl size="small" sx={{ mb: 2, minWidth: { xs: '100%', sm: 280 } }}>
          <InputLabel id="depot-cy-allocation-depot-label">Container yard</InputLabel>
          <Select
            labelId="depot-cy-allocation-depot-label"
            label="Container yard"
            value={depotId === '' ? '' : depotId}
            onChange={(e) => setDepotId(Number(e.target.value))}
          >
            {depots.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
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
            <SummaryCard label="At yard (TEU)" value={totals.atYardTeu} color={ICS_PRIMARY} />
            <SummaryCard label="+ Confirmed (TEU)" value={totals.confirmedTeu} color="#0288D1" />
            <SummaryCard label="+ Pre-forecast (TEU)" value={totals.preForecastTeu} color="#C2410C" />
            <SummaryCard label="Lines at limit" value={totals.linesAtLimit} color="#D32F2F" />
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
                  Yard utilization (all lines)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getAllocationSizeLabel('20')}: {totals.teu20} at yard · {getAllocationSizeLabel('40')}: {totals.teu40}{' '}
                  at yard · {formatUtilizationPctLabel(totals.committedTeu, totals.contractTeu)} committed
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
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Shipping lines
        </Typography>
      </Box>

      {loading ? (
        <>
          <StatCardsSkeleton count={4} />
          <CardGridSkeleton cards={2} />
        </>
      ) : isAdmin && !effectiveDepotId ? (
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
          <Typography color="text.secondary">Select a container yard to view shipping line allocations.</Typography>
        </Paper>
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
            No shipping line contracts are configured for this yard yet. Ask an administrator to set up CY contracts in
            Master Data.
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
              key={row.shippingLineId ?? row.shippingLineCode}
              allocation={row}
              shippingLineCode={row.shippingLineCode}
              shippingLineName={row.shippingLineName}
              perspective="byShippingLine"
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
