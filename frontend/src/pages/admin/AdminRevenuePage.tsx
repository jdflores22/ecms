import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DownloadIcon from '@mui/icons-material/Download'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link as RouterLink, Navigate } from 'react-router-dom'
import {
  heroMutedChipSx,
  heroPaperSx,
  hexToRgba,
} from '../../components/layout/DetailPagePrimitives'
import {
  ListDesktopOnly,
  ListLoadingState,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  LIST_PRIMARY,
  listHeroActionSx,
  listPageRootSx,
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'
import { StatCardsSkeleton } from '../../components/layout/SkeletonPrimitives'
import {
  paymentApi,
  reportApi,
  type RevenueReport,
  type RevenueReportRow,
  type TransactionDepotOverview,
  type TransactionShippingLineOverview,
} from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { currentPhYear, formatPeso } from '../../utils/datetime'

const primaryDark = LIST_PRIMARY

type RevenuePeriod = 'weekly' | 'monthly' | 'yearly'

const PERIOD_TABS: { key: RevenuePeriod; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
]

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function SummaryCard({
  label,
  value,
  color,
  icon,
  hint,
}: {
  label: string
  value: string
  color: string
  icon: ReactNode
  hint?: string
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
        borderTop: `3px solid ${color}`,
        height: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: hexToRgba(color, 0.1),
            color,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 0.25, lineHeight: 1.2 }}>
            {value}
          </Typography>
          {hint && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {hint}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  )
}

function RevenueBarChart({
  rows,
  maxAmount,
}: {
  rows: RevenueReportRow[]
  maxAmount: number
}) {
  if (!rows.length || maxAmount <= 0) return null

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: { xs: 0.75, sm: 1.25 },
        height: { xs: 160, sm: 200 },
        px: { xs: 1, sm: 2 },
        pt: 2,
        pb: 1,
      }}
    >
      {rows.map((row) => {
        const heightPct = maxAmount > 0 ? (row.totalAmount / maxAmount) * 100 : 0
        const hasData = row.paymentCount > 0
        return (
          <Tooltip
            key={`${row.periodStart}-${row.periodEnd}`}
            title={`${row.label}: ${formatPeso(row.totalAmount)} · ${row.paymentCount} payments`}
            arrow
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: hasData ? primaryDark : 'text.disabled',
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                  textAlign: 'center',
                  lineHeight: 1.2,
                  minHeight: '2.4em',
                }}
              >
                {hasData ? formatPeso(row.totalAmount) : '—'}
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 48,
                  height: `${Math.max(heightPct, hasData ? 4 : 2)}%`,
                  minHeight: hasData ? 8 : 4,
                  borderRadius: '6px 6px 2px 2px',
                  bgcolor: hasData ? primaryDark : hexToRgba(primaryDark, 0.12),
                  opacity: hasData ? 0.85 + heightPct / 500 : 1,
                  transition: 'height 0.35s ease',
                }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.6rem', sm: '0.7rem' },
                  textAlign: 'center',
                  lineHeight: 1.1,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.label.replace(/\s+\d{4}$/, '')}
              </Typography>
            </Box>
          </Tooltip>
        )
      })}
    </Box>
  )
}

function computeInsights(report: RevenueReport) {
  const activeRows = report.rows.filter((r) => r.paymentCount > 0)
  const peakRow =
    report.rows.length > 0
      ? report.rows.reduce((best, row) => (row.totalAmount > best.totalAmount ? row : best), report.rows[0])
      : null

  let periodChange: { pct: number; label: string } | null = null
  if (activeRows.length >= 2) {
    const latest = activeRows[activeRows.length - 1]
    const prev = activeRows[activeRows.length - 2]
    if (prev.totalAmount > 0) {
      const pct = ((latest.totalAmount - prev.totalAmount) / prev.totalAmount) * 100
      periodChange = { pct, label: `${prev.label} → ${latest.label}` }
    }
  }

  const activePeriods = activeRows.length
  const totalPeriods = report.rows.length

  return { peakRow, periodChange, activePeriods, totalPeriods }
}

export default function AdminRevenuePage() {
  const user = useAppSelector((s) => s.auth.user)
  const [period, setPeriod] = useState<RevenuePeriod>('monthly')
  const [year, setYear] = useState(currentPhYear())
  const [report, setReport] = useState<RevenueReport | null>(null)
  const [shippingOverview, setShippingOverview] = useState<TransactionShippingLineOverview | null>(null)
  const [depotOverview, setDepotOverview] = useState<TransactionDepotOverview | null>(null)
  const [returnFeeAmount, setReturnFeeAmount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    if (user?.role !== 'Administrator') return
    setLoading(true)
    setError('')
    reportApi
      .revenue({ period, year: period === 'monthly' ? year : undefined })
      .then(({ data }) => {
        setReport(data)
        if (data.totalPayments === 0) {
          setShippingOverview(null)
          setDepotOverview(null)
          return
        }
        return Promise.all([
          reportApi.transactionShippingLines({ from: data.from, to: data.to }),
          reportApi.transactionDepots({ from: data.from, to: data.to }),
        ]).then(([shippingRes, depotRes]) => {
          setShippingOverview(shippingRes.data)
          setDepotOverview(depotRes.data)
        })
      })
      .catch(() => setError('Failed to load revenue report.'))
      .finally(() => setLoading(false))
  }, [user?.role, period, year])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (user?.role !== 'Administrator') return
    paymentApi
      .getSettings()
      .then(({ data }) => setReturnFeeAmount(data.returnFeeAmount))
      .catch(() => setReturnFeeAmount(null))
  }, [user?.role])

  const periodLabel = useMemo(() => {
    if (!report) return ''
    if (report.period === 'weekly') return `Last 12 weeks · ${report.from} to ${report.to}`
    if (report.period === 'monthly') return `Calendar year ${year}`
    return `${report.from.slice(0, 4)} – ${report.to.slice(0, 4)}`
  }, [report, year])

  const insights = useMemo(() => (report ? computeInsights(report) : null), [report])

  const maxRowAmount = useMemo(
    () => (report ? Math.max(...report.rows.map((r) => r.totalAmount), 0) : 0),
    [report],
  )

  const exportCsv = () => {
    if (!report) return
    downloadCsv(
      `revenue-${report.period}-${report.from}-${report.to}.csv`,
      ['Period', 'Start', 'End', 'Payments', 'Revenue'],
      report.rows.map((row) => [
        row.label,
        row.periodStart,
        row.periodEnd,
        row.paymentCount,
        row.totalAmount,
      ]),
    )
  }

  if (user?.role !== 'Administrator') {
    return <Navigate to="/" replace />
  }

  return (
    <Box sx={listPageRootSx}>
      <Paper elevation={0} sx={heroPaperSx}>
        <Box
          sx={{
            position: 'absolute',
            right: -30,
            top: -30,
            width: 140,
            height: 140,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
          }}
        />
        <Box sx={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <TrendingUpIcon />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Revenue
              </Typography>
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.88)', maxWidth: 640, mb: 1.5 }}>
              Verified pre-forecast fee collections from trucker payments approved by depot personnel.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {periodLabel && <Chip size="small" label={periodLabel} sx={heroMutedChipSx} />}
              {report && report.totalPayments > 0 && (
                <Chip
                  size="small"
                  label={`${report.totalPayments} verified · ${formatPeso(report.totalRevenue)}`}
                  sx={heroMutedChipSx}
                />
              )}
              {returnFeeAmount != null && (
                <Chip
                  size="small"
                  label={`Fee ${formatPeso(returnFeeAmount)} per return`}
                  sx={heroMutedChipSx}
                />
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
            <Button
              component={RouterLink}
              to="/admin/reports"
              variant="contained"
              startIcon={<AssessmentOutlinedIcon />}
              sx={listHeroActionSx}
            >
              Transactions
            </Button>
            <Button
              component={RouterLink}
              to="/admin/payments"
              variant="contained"
              startIcon={<VerifiedOutlinedIcon />}
              sx={listHeroActionSx}
            >
              Payments
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportCsv}
              disabled={!report?.rows.length}
              sx={{
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.45)',
                fontWeight: 600,
                borderRadius: 2,
                flex: { xs: 1, sm: 'none' },
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              Export
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={load}
              disabled={loading}
              sx={{
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.45)',
                fontWeight: 600,
                borderRadius: 2,
                flex: { xs: 1, sm: 'none' },
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={period}
          onChange={(_, value: RevenuePeriod) => setPeriod(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: { xs: 1, sm: 2 },
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48 },
            '& .MuiTabs-indicator': { height: 3, bgcolor: primaryDark },
          }}
        >
          {PERIOD_TABS.map((tab) => (
            <Tab key={tab.key} value={tab.key} label={tab.label} />
          ))}
        </Tabs>

        {period === 'monthly' && (
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <IconButton
              size="small"
              onClick={() => setYear((y) => y - 1)}
              aria-label="Previous year"
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontWeight: 700, minWidth: 48, textAlign: 'center' }}>{year}</Typography>
            <IconButton
              size="small"
              onClick={() => setYear((y) => y + 1)}
              disabled={year >= currentPhYear()}
              aria-label="Next year"
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <ChevronRightIcon />
            </IconButton>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              Navigate calendar years
            </Typography>
          </Box>
        )}
        {loading && <LinearProgress sx={{ height: 2 }} />}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {insights?.periodChange && report && report.totalPayments > 0 && (
        <Alert
          severity={insights.periodChange.pct >= 0 ? 'success' : 'info'}
          icon={
            insights.periodChange.pct >= 0 ? (
              <ArrowUpwardIcon fontSize="inherit" />
            ) : (
              <ArrowDownwardIcon fontSize="inherit" />
            )
          }
          sx={{ mb: 2, borderRadius: 2 }}
        >
          <Typography variant="body2">
            <strong>
              {insights.periodChange.pct >= 0 ? '+' : ''}
              {insights.periodChange.pct.toFixed(1)}%
            </strong>{' '}
            vs prior active period ({insights.periodChange.label})
          </Typography>
        </Alert>
      )}

      {loading && !report ? (
        <StatCardsSkeleton count={4} />
      ) : (
        report && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <SummaryCard
            label="Total revenue"
            value={formatPeso(report.totalRevenue)}
            color={primaryDark}
            icon={<TrendingUpIcon fontSize="small" />}
            hint={periodLabel}
          />
          <SummaryCard
            label="Verified payments"
            value={String(report.totalPayments)}
            color="#2E7D32"
            icon={<VerifiedOutlinedIcon fontSize="small" />}
            hint={
              insights
                ? `${insights.activePeriods} of ${insights.totalPeriods} periods with collections`
                : undefined
            }
          />
          <SummaryCard
            label="Average per payment"
            value={formatPeso(report.averagePayment)}
            color="#6A1B9A"
            icon={<PaymentsOutlinedIcon fontSize="small" />}
          />
          <SummaryCard
            label="Peak period"
            value={
              insights?.peakRow && insights.peakRow.paymentCount > 0
                ? formatPeso(insights.peakRow.totalAmount)
                : '—'
            }
            color="#E65100"
            icon={<EmojiEventsOutlinedIcon fontSize="small" />}
            hint={
              insights?.peakRow && insights.peakRow.paymentCount > 0
                ? `${insights.peakRow.label} · ${insights.peakRow.paymentCount} payments`
                : 'No collections yet'
            }
          />
        </Box>
        )
      )}

      {report && report.rows.length > 0 && maxRowAmount > 0 && (
        <Paper
          elevation={0}
          sx={{
            ...listTablePaperSx,
            mb: 3,
            p: { xs: 1, sm: 2 },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, px: { xs: 1, sm: 0 }, mb: 0.5 }}>
            Revenue trend
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: { xs: 1, sm: 0 }, mb: 1 }}>
            Verified collections per {period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : 'year'}
          </Typography>
          <RevenueBarChart rows={report.rows} maxAmount={maxRowAmount} />
        </Paper>
      )}

      <Paper elevation={0} sx={listTablePaperSx}>
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <PaymentsOutlinedIcon sx={{ color: primaryDark }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
            {PERIOD_TABS.find((t) => t.key === period)?.label} breakdown
          </Typography>
          {periodLabel && (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {periodLabel}
            </Typography>
          )}
        </Box>

        {loading && !report ? (
          <ListLoadingState rows={6} columns={5} showMobileCards />
        ) : report && report.rows.length > 0 ? (
          <>
            <ListMobileOnly>
              {report.rows.map((row) => {
                const share =
                  report.totalRevenue > 0 ? (row.totalAmount / report.totalRevenue) * 100 : 0
                const isPeak = insights?.peakRow?.periodStart === row.periodStart
                return (
                  <ListMobileCard key={`${row.periodStart}-${row.periodEnd}`}>
                    <ListMobileTitle>
                      {row.label}
                      {isPeak && row.paymentCount > 0 ? ' · Peak' : ''}
                    </ListMobileTitle>
                    <ListMobileMeta>
                      {row.paymentCount} payment{row.paymentCount === 1 ? '' : 's'}
                      {share > 0 ? ` · ${share.toFixed(1)}% of total` : ''}
                    </ListMobileMeta>
                    <ListMobileChipRow>
                      <Chip
                        size="small"
                        label={formatPeso(row.totalAmount)}
                        sx={{ fontWeight: 700, bgcolor: hexToRgba(primaryDark, 0.08), color: primaryDark }}
                      />
                    </ListMobileChipRow>
                  </ListMobileCard>
                )
              })}
            </ListMobileOnly>
            <ListDesktopOnly>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: hexToRgba(primaryDark, 0.04) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Period</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Payments
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Revenue
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Share</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.rows.map((row) => {
                      const share =
                        report.totalRevenue > 0 ? (row.totalAmount / report.totalRevenue) * 100 : 0
                      const isPeak = insights?.peakRow?.periodStart === row.periodStart && row.paymentCount > 0
                      return (
                        <TableRow
                          key={`${row.periodStart}-${row.periodEnd}`}
                          hover
                          sx={isPeak ? { bgcolor: hexToRgba('#E65100', 0.06) } : undefined}
                        >
                          <TableCell sx={{ fontWeight: 600 }}>
                            {row.label}
                            {isPeak && (
                              <Chip
                                size="small"
                                label="Peak"
                                sx={{
                                  ml: 1,
                                  height: 20,
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  bgcolor: hexToRgba('#E65100', 0.12),
                                  color: '#E65100',
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">{row.paymentCount}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: primaryDark }}>
                            {formatPeso(row.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  flex: 1,
                                  height: 6,
                                  borderRadius: 3,
                                  bgcolor: hexToRgba(primaryDark, 0.1),
                                  overflow: 'hidden',
                                }}
                              >
                                <Box
                                  sx={{
                                    width: `${share}%`,
                                    height: '100%',
                                    bgcolor: primaryDark,
                                    borderRadius: 3,
                                  }}
                                />
                              </Box>
                              <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 36 }}>
                                {share.toFixed(0)}%
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow sx={{ bgcolor: hexToRgba(primaryDark, 0.03) }}>
                      <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {report.totalPayments}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: primaryDark }}>
                        {formatPeso(report.totalRevenue)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </ListDesktopOnly>
          </>
        ) : (
          <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No verified payments in this period yet. Revenue appears after depot approves trucker payment proofs.
            </Typography>
            <Button component={RouterLink} to="/admin/payments" variant="contained" sx={{ fontWeight: 700 }}>
              Go to payment verification
            </Button>
          </Box>
        )}
      </Paper>

      {(shippingOverview?.rows.length || depotOverview?.rows.length) && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
            gap: 2,
            mt: 3,
          }}
        >
          {shippingOverview && shippingOverview.rows.length > 0 && (
            <Paper elevation={0} sx={listTablePaperSx}>
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <LocalShippingOutlinedIcon sx={{ color: primaryDark }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    By shipping line
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Verified revenue in selected range
                  </Typography>
                </Box>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: hexToRgba(primaryDark, 0.04) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Line</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Verified
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Revenue
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...shippingOverview.rows]
                      .sort((a, b) => b.paidAmount - a.paidAmount)
                      .slice(0, 6)
                      .map((row) => (
                        <TableRow key={row.shippingLineId} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {row.code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {row.name}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{row.paidCount}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: primaryDark }}>
                            {formatPeso(row.paidAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {depotOverview && depotOverview.rows.length > 0 && (
            <Paper elevation={0} sx={listTablePaperSx}>
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <WarehouseOutlinedIcon sx={{ color: primaryDark }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    By container yard
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Verified revenue in selected range
                  </Typography>
                </Box>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: hexToRgba(primaryDark, 0.04) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Yard</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Verified
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Revenue
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...depotOverview.rows]
                      .sort((a, b) => b.paidAmount - a.paidAmount)
                      .slice(0, 6)
                      .map((row) => (
                        <TableRow key={row.depotId} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                          <TableCell align="right">{row.paidCount}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: primaryDark }}>
                            {formatPeso(row.paidAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  )
}
