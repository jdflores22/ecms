import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
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
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { listPageRootSx, LIST_PRIMARY } from '../../components/layout/ListPagePrimitives'
import { reportApi, type RevenueReport } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { currentPhYear, formatPeso } from '../../utils/datetime'

const primaryDark = LIST_PRIMARY

type RevenuePeriod = 'weekly' | 'monthly' | 'yearly'

const PERIOD_TABS: { key: RevenuePeriod; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
]

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
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

export default function AdminRevenuePage() {
  const user = useAppSelector((s) => s.auth.user)
  const [period, setPeriod] = useState<RevenuePeriod>('monthly')
  const [year, setYear] = useState(currentPhYear())
  const [report, setReport] = useState<RevenueReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    if (user?.role !== 'Administrator') return
    setLoading(true)
    setError('')
    reportApi
      .revenue({ period, year: period === 'monthly' ? year : undefined })
      .then(({ data }) => setReport(data))
      .catch(() => setError('Failed to load revenue report.'))
      .finally(() => setLoading(false))
  }, [user?.role, period, year])

  useEffect(() => {
    load()
  }, [load])

  const periodLabel = useMemo(() => {
    if (!report) return ''
    if (report.period === 'weekly') return `Last 12 weeks · ${report.from} to ${report.to}`
    if (report.period === 'monthly') return `Year ${year}`
    return `${report.from.slice(0, 4)} – ${report.to.slice(0, 4)}`
  }, [report, year])

  if (user?.role !== 'Administrator') {
    return <Navigate to="/" replace />
  }

  return (
    <Box sx={listPageRootSx}>
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
        <Box sx={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <TrendingUpIcon />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Revenue
              </Typography>
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.88)', maxWidth: 560 }}>
              Verified pre-forecasted fee collections from trucker payments approved by depot personnel.
            </Typography>
          </Box>
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
              '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Refresh
          </Button>
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
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <TextField
              label="Year"
              type="number"
              size="small"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || currentPhYear())}
              slotProps={{ htmlInput: { min: 2000, max: 2100 } }}
              sx={{ width: 140, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {report && !loading && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <SummaryCard label="Total revenue" value={formatPeso(report.totalRevenue)} color={primaryDark} />
          <SummaryCard label="Verified payments" value={String(report.totalPayments)} color="#2E7D32" />
          <SummaryCard
            label="Average per payment"
            value={formatPeso(report.averagePayment)}
            color="#6A1B9A"
          />
        </Box>
      )}

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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: primaryDark }} />
          </Box>
        ) : report && report.rows.length > 0 ? (
          <TableContainer>
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
                </TableRow>
              </TableHead>
              <TableBody>
                {report.rows.map((row) => (
                  <TableRow key={`${row.periodStart}-${row.periodEnd}`} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{row.label}</TableCell>
                    <TableCell align="right">{row.paymentCount}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: primaryDark }}>
                      {formatPeso(row.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: hexToRgba(primaryDark, 0.03) }}>
                  <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {report.totalPayments}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: primaryDark }}>
                    {formatPeso(report.totalRevenue)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No verified payments in this period yet. Revenue appears after depot approves trucker payment proofs.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
