import {
  Alert,
  Box,
  Button,
  Chip,
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
  Typography,
} from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  LIST_PRIMARY,
  listPageRootSx,
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'
import { withdrawalApi, type Withdrawal } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatDateTime } from '../../utils/datetime'

const primaryDark = LIST_PRIMARY

const STATUS_TABS = [
  { key: 'Submitted', label: 'Submitted', summaryColor: '#0288D1' },
  { key: 'UnderReview', label: 'Under review', summaryColor: '#ED6C02' },
  { key: 'Approved', label: 'Approved', summaryColor: '#2E7D32' },
  { key: 'Released', label: 'Released', summaryColor: '#1565C0' },
  { key: 'Rejected', label: 'Rejected', summaryColor: '#D32F2F' },
] as const

type WithdrawalStatusTab = (typeof STATUS_TABS)[number]['key']

const statusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Submitted: 'info',
  UnderReview: 'warning',
  Approved: 'success',
  Rejected: 'error',
  Released: 'success',
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        minWidth: 0,
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

export default function DepotWithdrawalsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAppSelector((s) => s.auth.user)
  const [activeStatus, setActiveStatus] = useState<WithdrawalStatusTab>('Submitted')
  const [items, setItems] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const widget = searchParams.get('widget')

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message
    if (message) {
      setSuccessMessage(message)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    withdrawalApi
      .list()
      .then(({ data }) => setItems(data))
      .catch(() => setError('Failed to load withdrawal queue.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (widget === 'stuck24') setActiveStatus('UnderReview')
    else if (widget === 'rejectedReasons') setActiveStatus('Rejected')
    else if (widget === 'turnaround') setActiveStatus('Released')
    else if (widget === 'expiring48') setActiveStatus('Submitted')
  }, [widget])

  const filtered = useMemo(() => {
    const base = items.filter((item) => item.status === activeStatus)
    if (widget !== 'expiring48') return base
    const now = new Date()
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    return base.filter((w) => {
      const exp = new Date(`${w.expirationDate}T23:59:59`)
      return exp >= now && exp <= in48h
    })
  }, [items, activeStatus, widget])

  const counts = useMemo(
    () =>
      STATUS_TABS.reduce(
        (acc, tab) => {
          acc[tab.key] = items.filter((i) => i.status === tab.key).length
          return acc
        },
        {} as Record<WithdrawalStatusTab, number>,
      ),
    [items],
  )

  if (user?.role !== 'DepotPersonnel') {
    return null
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
            }}
          >
            <UnarchiveOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              CY withdrawal review
            </Typography>
            <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
              Validate ATW documents and approve or reject container withdrawals at your yard.
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(5, 1fr)' }, gap: 1.5, mb: 2 }}>
        {STATUS_TABS.map((tab) => (
          <SummaryCard key={tab.key} label={tab.label} value={counts[tab.key]} color={tab.summaryColor} />
        ))}
      </Box>

      <Paper elevation={0} sx={{ mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeStatus}
          onChange={(_, value: WithdrawalStatusTab) => setActiveStatus(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {STATUS_TABS.map((tab) => (
            <Tab key={tab.key} value={tab.key} label={`${tab.label} (${counts[tab.key]})`} />
          ))}
        </Tabs>
      </Paper>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {widget && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <Box>
              Filter active: <strong>{widget}</strong>. Showing {filtered.length} request(s).
            </Box>
            <Button size="small" variant="outlined" onClick={() => setSearchParams({})}>
              Clear filter
            </Button>
          </Box>
        </Alert>
      )}

      {loading ? (
        <Paper elevation={0} sx={{ py: 8, textAlign: 'center', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CircularProgress sx={{ color: primaryDark }} />
        </Paper>
      ) : filtered.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography color="text.secondary">No {activeStatus === 'UnderReview' ? 'under review' : activeStatus.toLowerCase()} requests.</Typography>
        </Paper>
      ) : (
        <>
          <ListDesktopOnly>
            <TableContainer component={Paper} elevation={0} sx={listTablePaperSx}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Reference</TableCell>
                    <TableCell>ATW</TableCell>
                    <TableCell>Trucker</TableCell>
                    <TableCell>Containers</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/depot/withdrawals/${row.id}`)}>
                      <TableCell sx={{ fontWeight: 600 }}>{row.referenceNo}</TableCell>
                      <TableCell>{row.atwNumber}</TableCell>
                      <TableCell>{row.truckerName}</TableCell>
                      <TableCell>
                        {row.containerCount} unit{row.containerCount === 1 ? '' : 's'}
                        <Typography variant="caption" sx={{ display: 'block' }} color="text.secondary">
                          {row.containerSummary}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.submittedAt ? formatDateTime(row.submittedAt) : '—'}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant={row.status === 'Submitted' ? 'contained' : 'outlined'}
                          endIcon={<OpenInNewIcon />}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/depot/withdrawals/${row.id}`)
                          }}
                        >
                          {row.status === 'Approved' ? 'Release' : 'Review'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </ListDesktopOnly>

          <ListMobileOnly>
            {filtered.map((row) => (
              <ListMobileCard key={row.id} onClick={() => navigate(`/depot/withdrawals/${row.id}`)}>
                <ListMobileTitle>{row.referenceNo}</ListMobileTitle>
                <ListMobileMeta>ATW {row.atwNumber} · {row.truckerName}</ListMobileMeta>
                <ListMobileMeta>{row.containerCount} container{row.containerCount === 1 ? '' : 's'} · {row.containerSummary}</ListMobileMeta>
                <ListMobileChipRow>
                  <Chip label={row.status === 'UnderReview' ? 'Under review' : row.status} size="small" color={statusColor[row.status] ?? 'default'} />
                </ListMobileChipRow>
              </ListMobileCard>
            ))}
          </ListMobileOnly>
        </>
      )}
    </Box>
  )
}
