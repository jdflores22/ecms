import { CardGridSkeleton, StatCardsSkeleton } from '../../components/layout/SkeletonPrimitives'
import { Alert, Box, Button, FormControl, InputLabel, LinearProgress, MenuItem, Paper, Select, Typography } from '@mui/material'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useSearchParams } from 'react-router-dom'
import CyYardAllocationCard from '../../components/evaluations/CyYardAllocationCard'
import { DetailBackButton, hexToRgba, ICS_PRIMARY } from '../../components/layout/DetailPagePrimitives'
import {
  listHeroOutlineActionSx,
  listPageRootSx,
  PageHero,
} from '../../components/layout/ListPagePrimitives'
import { appColors } from '../../theme/colors'
import { portalColors } from '../../theme/portalTheme'
import { canAccessPage } from '../../config/routeAccess'
import { cyAllocationApi, shippingLineApi, type CyAllocation, type CyAllocationForApproval, type LogicteckCyAllocationFeed, type ShippingLine } from '../../services/api'
import { getShippingLineDisplayCode, getShippingLineFullName } from '../../utils/shippingLine'
import { useAppSelector } from '../../store/hooks'
import {
  aggregateAtYardTeuBySize,
  aggregatePreAdvisedTeuBySize,
  breakdownAtYardTeu,
  cyUtilizationPctCapped,
  getGroupBreakdownRow,
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
  const isAdmin = user?.role === 'Administrator'
  const [searchParams, setSearchParams] = useSearchParams()
  const preAdviceId = searchParams.get('preAdviceId')
  const initialLine = Number(searchParams.get('shippingLineId'))
  const [adminLineId, setAdminLineId] = useState<number | ''>(
    Number.isFinite(initialLine) && initialLine > 0 ? initialLine : '',
  )
  const [shippingLines, setShippingLines] = useState<ShippingLine[]>([])
  const [items, setItems] = useState<CyAllocation[]>([])
  const [approvalContext, setApprovalContext] = useState<CyAllocationForApproval | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [logicteckFeed, setLogicteckFeed] = useState<LogicteckCyAllocationFeed | null>(null)

  useEffect(() => {
    if (!isAdmin || preAdviceId) return
    shippingLineApi
      .list()
      .then(({ data }) => setShippingLines(data.filter((l) => l.isActive)))
      .catch(() => setShippingLines([]))
  }, [isAdmin, preAdviceId])

  useEffect(() => {
    if (!isAdmin || preAdviceId || shippingLines.length === 0 || adminLineId !== '') return
    setAdminLineId(shippingLines[0].id)
  }, [isAdmin, preAdviceId, shippingLines, adminLineId])

  useEffect(() => {
    if (!isAdmin || preAdviceId) return
    const params = new URLSearchParams()
    if (adminLineId !== '') params.set('shippingLineId', String(adminLineId))
    setSearchParams(params, { replace: true })
  }, [adminLineId, isAdmin, preAdviceId, setSearchParams])

  const effectiveShippingLineId = isAdmin && !preAdviceId ? (adminLineId === '' ? null : adminLineId) : null

  const loadLogicteck = useCallback((shippingLineId?: number) => {
    cyAllocationApi
      .logicteck(shippingLineId)
      .then(({ data }) => setLogicteckFeed(data))
      .catch(() => setLogicteckFeed(null))
  }, [])

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
          const lineId = data.allocations[0]?.shippingLineId
          if (lineId) loadLogicteck(lineId)
        })
        .catch((err) =>
          setError(loadErrorMessage(err, 'Failed to load container yard allocations for this evaluation.')),
        )
        .finally(() => setLoading(false))
      return
    }

    if (isAdmin && !effectiveShippingLineId) {
      setItems([])
      setLogicteckFeed(null)
      setLoading(false)
      return
    }

    loadLogicteck(isAdmin ? effectiveShippingLineId ?? undefined : undefined)
    cyAllocationApi
      .list(isAdmin ? effectiveShippingLineId ?? undefined : undefined)
      .then(({ data }) => setItems(data))
      .catch((err) => setError(loadErrorMessage(err, 'Failed to load container yard allocations.')))
      .finally(() => setLoading(false))
  }, [preAdviceId, isAdmin, effectiveShippingLineId, loadLogicteck])

  useEffect(() => {
    load()
  }, [load])

  const selectedLine = useMemo(
    () => shippingLines.find((l) => l.id === adminLineId),
    [shippingLines, adminLineId],
  )

  const shippingLineCode =
    items[0]?.shippingLineCode ?? (selectedLine ? getShippingLineDisplayCode(selectedLine.code, selectedLine.name) : '')
  const shippingLineName =
    items[0]?.shippingLineName ?? (selectedLine ? getShippingLineFullName(selectedLine.code, selectedLine.name) : '')

  const heroTitle =
    preAdviceId
      ? 'CY allocation — evaluation'
      : shippingLineCode
        ? `${shippingLineCode} — CY allocation`
        : 'CY allocation'

  const heroSubtitle = preAdviceId
    ? 'Contracted yard capacity for the yard you may assign on this evaluation.'
    : isAdmin
      ? 'Read-only contracted yard capacity by shipping line. At-yard counts are physical gate check-ins; orange +confirmed and +pre-forecast are pipeline units not yet at the CY. Released ATW units are excluded.'
      : 'Read-only view of your contracted yard capacity. At-yard counts are physical gate check-ins; orange +confirmed and +pre-forecast show pipeline units not yet at the CY. Released ATW units are excluded.'

  const totals = useMemo(() => {
    const sizeTotals = aggregateAtYardTeuBySize(items)
    const committedTotals = aggregatePreAdvisedTeuBySize(items)
    const contractTeu = items.reduce((sum, i) => sum + i.contractTeu, 0)
    const atYardTeu = Math.round(items.reduce((sum, i) => sum + i.atYardTeu, 0))
    const confirmedTeu = Math.round(items.reduce((sum, i) => sum + i.confirmedTeu, 0))
    const preForecastTeu = Math.round(items.reduce((sum, i) => sum + i.preForecastTeu, 0))
    const committedTeu = Math.round(items.reduce((sum, i) => sum + i.preAdvisedTeu, 0))
    const bookingTeu = Math.round(items.reduce((sum, i) => sum + i.bookingTeu, 0))
    const line = logicteckFeed?.matchedLine
    const logicteckYard = line ? items.find((item) => item.isLogicteck) : undefined
    const logicteckAtLimit = Boolean(
      line && (line.size20.onHold || line.size40.onHold || line.size20.percent >= 100 || line.size40.percent >= 100 || line.teu.percent >= 100),
    )
    const contract = logicteckYard && line ? contractTeu - logicteckYard.contractTeu + line.teu.limit : contractTeu
    const atYard = logicteckYard && line ? atYardTeu - Math.round(logicteckYard.atYardTeu) + line.teu.used : atYardTeu
    const committed = logicteckYard && line ? atYard : committedTeu
    const teu20 = logicteckYard && line ? sizeTotals.teu20 - breakdownAtYardTeu(getGroupBreakdownRow(logicteckYard, '20')) + line.size20.inYard : sizeTotals.teu20
    const teu40 = logicteckYard && line ? sizeTotals.teu40 - breakdownAtYardTeu(getGroupBreakdownRow(logicteckYard, '40')) + line.size40.inYard * 2 : sizeTotals.teu40
    const yardsAtLimit = items.filter((item) => (logicteckYard && line && item.depotId === logicteckYard.depotId ? logicteckAtLimit : !item.hasCapacity)).length
    const teuPct = cyUtilizationPctCapped(committed, contract)
    const teuOver = contract > 0 && committed > contract
    return {
      ...sizeTotals,
      teu20,
      teu40,
      committedTotals,
      contractTeu: contract,
      atYardTeu: atYard,
      confirmedTeu,
      preForecastTeu,
      committedTeu: committed,
      bookingTeu,
      yardsAtLimit,
      teuPct,
      teuOver,
    }
  }, [items, logicteckFeed])

  if (user?.role && !canAccessPage(user.role, 'cyAllocation', user.allowedPages)) {
    return <Navigate to="/" replace />
  }

  const inventoryLink = (
    <Box
      component={RouterLink}
      to={
        isAdmin && effectiveShippingLineId
          ? `/evaluations/container-inventory?shippingLineId=${effectiveShippingLineId}`
          : '/evaluations/container-inventory'
      }
      sx={{ color: portalColors.primary, fontWeight: 600, textDecoration: 'underline', display: 'inline' }}
    >
      CY inventory
    </Box>
  )

  return (
    <Box sx={listPageRootSx}>
      {!preAdviceId && (
        <DetailBackButton
          to={isAdmin ? '/' : '/evaluations'}
          label={isAdmin ? 'Back to dashboard' : 'Back to evaluations'}
        />
      )}

      <PageHero
        icon={<WarehouseOutlinedIcon />}
        title={heroTitle}
        subtitle={
          <>
            {heroSubtitle} See {inventoryLink} for released units.
            {!preAdviceId && shippingLineName && !isAdmin ? ` ${shippingLineName}.` : ''}
          </>
        }
        actions={
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={load}
            disabled={loading || (isAdmin && !effectiveShippingLineId)}
            sx={listHeroOutlineActionSx}
          >
            Refresh
          </Button>
        }
      />

      {!preAdviceId && isAdmin && shippingLines.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            mb: 2,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            View context
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto' },
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            <FormControl size="small" fullWidth>
              <InputLabel id="cy-allocation-line-label">Shipping line</InputLabel>
              <Select
                labelId="cy-allocation-line-label"
                label="Shipping line"
                value={adminLineId === '' ? '' : adminLineId}
                onChange={(e) => setAdminLineId(Number(e.target.value))}
              >
                {shippingLines.map((l) => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.code} — {l.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {shippingLineName && (
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, textAlign: { sm: 'right' } }}>
                {shippingLineName}
              </Typography>
            )}
          </Box>
        </Paper>
      )}

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
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Container yards
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
            {isAdmin && !effectiveShippingLineId
              ? 'Select a shipping line above to view yard contracts.'
              : 'No CY contracts are configured for this shipping line yet. Set up contract allocations in Master Data.'}
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
              logicteckLine={row.isLogicteck ? logicteckFeed?.matchedLine ?? null : null}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
