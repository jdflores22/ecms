import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import DownloadIcon from '@mui/icons-material/Download'
import FilterListIcon from '@mui/icons-material/FilterList'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  depotApi,
  reportApi,
  type DailyReturnReport,
  type Depot,
  type DepotReport,
  type MonthlyReturnReport,
  type ShippingLineReport,
} from '../services/api'
import { useAppSelector } from '../store/hooks'
import { currentPhYear, defaultReportFromDate, formatScheduleDate, todayIsoDate } from '../utils/datetime'

const primaryDark = '#0B3D91'

const REPORT_ROLES = new Set([
  'Administrator',
  'DepotPersonnel',
  'Broker',
  'ShippingLineEvaluator',
])

const STATUS_HEADERS = ['Scheduled', 'Confirmed', 'Completed', 'Cancelled'] as const

const TAB_LABELS = ['Daily', 'Monthly', 'By shipping line', 'By depot'] as const

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

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

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
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
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  )
}

interface ReportTableProps {
  loading: boolean
  headCells: React.ReactNode
  children: React.ReactNode
}

function ReportTable({ loading, headCells, children }: ReportTableProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden',
      }}
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: primaryDark }} />
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: hexToRgba(primaryDark, 0.04),
                  '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
                }}
              >
                {headCells}
              </TableRow>
            </TableHead>
            <TableBody>{children}</TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  )
}

export default function ReportsPage() {
  const user = useAppSelector((s) => s.auth.user)
  const [tab, setTab] = useState(0)
  const [from, setFrom] = useState(defaultReportFromDate())
  const [to, setTo] = useState(todayIsoDate())
  const [year, setYear] = useState(currentPhYear())
  const [depotId, setDepotId] = useState<number | ''>('')
  const [depots, setDepots] = useState<Depot[]>([])
  const [daily, setDaily] = useState<DailyReturnReport | null>(null)
  const [monthly, setMonthly] = useState<MonthlyReturnReport | null>(null)
  const [byLine, setByLine] = useState<ShippingLineReport | null>(null)
  const [byDepot, setByDepot] = useState<DepotReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const usesDateRange = tab === 0 || tab === 2 || tab === 3

  useEffect(() => {
    if (user?.role === 'Administrator') {
      depotApi.list().then(({ data }) => setDepots(data)).catch(() => {})
    }
  }, [user?.role])

  const load = useCallback(() => {
    if (!user || !REPORT_ROLES.has(user.role)) return
    setLoading(true)
    setError('')
    const depot = depotId === '' ? undefined : Number(depotId)

    const request =
      tab === 0
        ? reportApi.dailyReturns({ from, to, depotId: depot })
        : tab === 1
          ? reportApi.monthlyReturns({ year, depotId: depot })
          : tab === 2
            ? reportApi.shippingLines({ from, to, depotId: depot })
            : reportApi.depots({ from, to, depotId: depot })

    request
      .then((res) => {
        if (tab === 0) setDaily(res.data as DailyReturnReport)
        else if (tab === 1) setMonthly(res.data as MonthlyReturnReport)
        else if (tab === 2) setByLine(res.data as ShippingLineReport)
        else setByDepot(res.data as DepotReport)
      })
      .catch(() => setError('Failed to load report.'))
      .finally(() => setLoading(false))
  }, [user, tab, from, to, year, depotId])

  useEffect(() => {
    load()
  }, [load])

  const summary = useMemo(() => {
    if (tab === 0 && daily) {
      return {
        label: `${daily.from} → ${daily.to}`,
        scheduled: daily.totalScheduled,
        completed: daily.totalCompleted,
      }
    }
    if (tab === 1 && monthly) {
      return {
        label: `Year ${monthly.year}`,
        scheduled: monthly.totalScheduled,
        completed: monthly.totalCompleted,
      }
    }
    if (tab === 2 && byLine) {
      return {
        label: `${byLine.from} → ${byLine.to}`,
        scheduled: byLine.totalScheduled,
        completed: byLine.totalCompleted,
      }
    }
    if (tab === 3 && byDepot) {
      return {
        label: `${byDepot.from} → ${byDepot.to}`,
        scheduled: byDepot.totalScheduled,
        completed: byDepot.totalCompleted,
      }
    }
    return null
  }, [tab, daily, monthly, byLine, byDepot])

  if (!user || !REPORT_ROLES.has(user.role)) {
    return <Navigate to="/" replace />
  }

  const exportCsv = () => {
    if (tab === 0 && daily) {
      downloadCsv(
        `returns-daily-${daily.from}-${daily.to}.csv`,
        ['Date', ...STATUS_HEADERS],
        daily.rows.map((r) => [r.date, r.scheduled, r.confirmed, r.completed, r.cancelled]),
      )
    } else if (tab === 1 && monthly) {
      downloadCsv(
        `returns-monthly-${monthly.year}.csv`,
        ['Month', ...STATUS_HEADERS],
        monthly.rows.map((r) => [r.label, r.scheduled, r.confirmed, r.completed, r.cancelled]),
      )
    } else if (tab === 2 && byLine) {
      downloadCsv(
        `returns-by-shipping-line-${byLine.from}-${byLine.to}.csv`,
        ['Code', 'Shipping line', ...STATUS_HEADERS],
        byLine.rows.map((r) => [r.code, r.name, r.scheduled, r.confirmed, r.completed, r.cancelled]),
      )
    } else if (tab === 3 && byDepot) {
      downloadCsv(
        `returns-by-depot-${byDepot.from}-${byDepot.to}.csv`,
        ['Depot', ...STATUS_HEADERS],
        byDepot.rows.map((r) => [r.name, r.scheduled, r.confirmed, r.completed, r.cancelled]),
      )
    }
  }

  const hasExportData =
    (tab === 0 && !!daily?.rows.length) ||
    (tab === 1 && !!monthly?.rows.length) ||
    (tab === 2 && !!byLine?.rows.length) ||
    (tab === 3 && !!byDepot?.rows.length)

  const statusCells = STATUS_HEADERS.map((h) => (
    <TableCell key={h} align="right">
      {h}
    </TableCell>
  ))

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
            right: -30,
            top: -30,
            width: 140,
            height: 140,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
          }}
        />
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.14)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <AssessmentOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                Returns Reports
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 520 }}>
                Container return statistics by time period, shipping line, and depot.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={exportCsv}
            disabled={loading || !hasExportData}
            sx={{
              bgcolor: '#fff',
              color: primaryDark,
              fontWeight: 700,
              px: 2.5,
              flexShrink: 0,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
              '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.4)', color: 'rgba(11,61,145,0.5)' },
            }}
          >
            Export CSV
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          mb: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: hexToRgba(primaryDark, 0.02),
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48 },
            '& .Mui-selected': { color: primaryDark },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', bgcolor: '#00A3E0' },
          }}
        >
          {TAB_LABELS.map((label) => (
            <Tab key={label} label={label} />
          ))}
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: hexToRgba(primaryDark, 0.08),
                color: primaryDark,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <FilterListIcon fontSize="small" />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Report filters
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
            {usesDateRange ? (
              <>
                <TextField
                  label="From"
                  type="date"
                  size="small"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  label="To"
                  type="date"
                  size="small"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </>
            ) : (
              <TextField
                label="Year"
                type="number"
                size="small"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                sx={{ width: 120, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            )}
            {user.role === 'Administrator' && (
              <FormControl size="small" sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                <InputLabel>Depot</InputLabel>
                <Select
                  label="Depot"
                  value={depotId}
                  onChange={(e) => setDepotId(e.target.value as number | '')}
                >
                  <MenuItem value="">All depots</MenuItem>
                  {depots.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={load}
              disabled={loading}
              sx={{ fontWeight: 600, borderRadius: 2, minHeight: 40 }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Paper>

      {summary && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
            {summary.label}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(2, minmax(160px, 240px))' }, gap: 2 }}>
            <SummaryCard label="Total returns" value={summary.scheduled} color={primaryDark} />
            <SummaryCard label="Completed" value={summary.completed} color="#2E7D32" />
          </Box>
        </Box>
      )}

      {tab === 0 && daily && (
        <ReportTable
          loading={loading}
          headCells={
            <>
              <TableCell>Date</TableCell>
              {statusCells}
            </>
          }
        >
          {!loading && daily.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                No data for this range.
              </TableCell>
            </TableRow>
          ) : (
            daily.rows.map((row) => (
              <TableRow key={row.date} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell sx={{ fontWeight: 600 }}>{formatScheduleDate(row.date)}</TableCell>
                <TableCell align="right">{row.scheduled}</TableCell>
                <TableCell align="right">{row.confirmed}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#2E7D32' }}>
                  {row.completed}
                </TableCell>
                <TableCell align="right">{row.cancelled}</TableCell>
              </TableRow>
            ))
          )}
        </ReportTable>
      )}

      {tab === 1 && monthly && (
        <ReportTable
          loading={loading}
          headCells={
            <>
              <TableCell>Month</TableCell>
              {statusCells}
            </>
          }
        >
          {monthly.rows.map((row) => (
            <TableRow key={row.month} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
              <TableCell sx={{ fontWeight: 600 }}>{row.label}</TableCell>
              <TableCell align="right">{row.scheduled}</TableCell>
              <TableCell align="right">{row.confirmed}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: '#2E7D32' }}>
                {row.completed}
              </TableCell>
              <TableCell align="right">{row.cancelled}</TableCell>
            </TableRow>
          ))}
        </ReportTable>
      )}

      {tab === 2 && byLine && (
        <ReportTable
          loading={loading}
          headCells={
            <>
              <TableCell>Code</TableCell>
              <TableCell>Shipping line</TableCell>
              {statusCells}
            </>
          }
        >
          {!loading && byLine.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                No data for this range.
              </TableCell>
            </TableRow>
          ) : (
            byLine.rows.map((row) => (
              <TableRow key={row.shippingLineId} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell align="right">{row.scheduled}</TableCell>
                <TableCell align="right">{row.confirmed}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#2E7D32' }}>
                  {row.completed}
                </TableCell>
                <TableCell align="right">{row.cancelled}</TableCell>
              </TableRow>
            ))
          )}
        </ReportTable>
      )}

      {tab === 3 && byDepot && (
        <ReportTable
          loading={loading}
          headCells={
            <>
              <TableCell>Depot</TableCell>
              {statusCells}
            </>
          }
        >
          {!loading && byDepot.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                No data for this range.
              </TableCell>
            </TableRow>
          ) : (
            byDepot.rows.map((row) => (
              <TableRow key={row.depotId} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                <TableCell align="right">{row.scheduled}</TableCell>
                <TableCell align="right">{row.confirmed}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#2E7D32' }}>
                  {row.completed}
                </TableCell>
                <TableCell align="right">{row.cancelled}</TableCell>
              </TableRow>
            ))
          )}
        </ReportTable>
      )}
    </Box>
  )
}
