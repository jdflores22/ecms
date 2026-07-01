import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ListDesktopOnly,
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
import { isPreAdviceManager } from '../../config/roleConfig'
import { withdrawalApi, type Withdrawal } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatDateTime } from '../../utils/datetime'

const primaryDark = LIST_PRIMARY

const statusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Draft: 'default',
  Issued: 'info',
  Submitted: 'info',
  UnderReview: 'warning',
  Approved: 'success',
  Rejected: 'error',
  Released: 'success',
  Completed: 'success',
  Cancelled: 'default',
}

const statusLabel: Record<string, string> = {
  UnderReview: 'Under review',
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

export default function TruckerWithdrawalsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAppSelector((s) => s.auth.user)
  const [items, setItems] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const widget = searchParams.get('widget')
  const filteredItems = useMemo(() => {
    const now = new Date()
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    if (widget === 'expiring48') {
      return items.filter((w) => {
        if (!['Draft', 'Issued', 'Submitted', 'UnderReview', 'Approved'].includes(w.status)) return false
        const exp = new Date(`${w.expirationDate}T23:59:59`)
        return exp >= now && exp <= in48h
      })
    }
    if (widget === 'stuck24') {
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      return items.filter((w) => ['Submitted', 'UnderReview'].includes(w.status) && !!w.submittedAt && new Date(w.submittedAt) <= cutoff)
    }
    if (widget === 'rejectedReasons') return items.filter((w) => w.status === 'Rejected')
    if (widget === 'turnaround') return items.filter((w) => ['Approved', 'Rejected', 'Released', 'Completed'].includes(w.status))
    return items
  }, [items, widget])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    withdrawalApi
      .list()
      .then(({ data }) => setItems(data))
      .catch(() => setError('Failed to load withdrawal requests.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const summary = useMemo(
    () => ({
      total: items.length,
      draft: items.filter((w) => w.status === 'Draft' || w.status === 'Issued').length,
      pending: items.filter((w) => ['Submitted', 'UnderReview'].includes(w.status)).length,
      approved: items.filter((w) => ['Approved', 'Released', 'Completed'].includes(w.status)).length,
    }),
    [items],
  )

  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDeleteDraft = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Delete this draft withdrawal request?')) return
    setDeletingId(id)
    try {
      await withdrawalApi.deleteDraft(id)
      setItems((prev) => prev.filter((w) => w.id !== id))
    } catch {
      setError('Failed to delete draft.')
    } finally {
      setDeletingId(null)
    }
  }

  if (!isPreAdviceManager(user?.role)) {
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
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', minWidth: 0 }}>
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
              <UnarchiveOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                My withdrawals
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 560 }}>
                Submit Authority to Withdraw (ATW) requests for container repositioning.
              </Typography>
            </Box>
          </Box>
          <Button
            component={RouterLink}
            to="/trucker/withdrawals/new"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ ...listHeroActionSx, px: 2.5 }}
          >
            New withdrawal
          </Button>
        </Box>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <SummaryCard label="Total requests" value={summary.total} color={primaryDark} />
        <SummaryCard label="Draft / issued" value={summary.draft} color="#ed6c02" />
        <SummaryCard label="Awaiting CY review" value={summary.pending} color="#6a1b9a" />
        <SummaryCard label="Approved / released" value={summary.approved} color="#2e7d32" />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {widget && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <Box>
              Filter active: <strong>{widget}</strong>. Showing {filteredItems.length} request(s).
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
      ) : filteredItems.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No withdrawal requests yet. Create one and attach your ATW certificate.
          </Typography>
          <Button component={RouterLink} to="/trucker/withdrawals/new" variant="contained" startIcon={<AddIcon />}>
            New withdrawal
          </Button>
        </Paper>
      ) : (
        <>
          <ListDesktopOnly>
            <TableContainer component={Paper} elevation={0} sx={listTablePaperSx}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Reference</TableCell>
                    <TableCell>ATW</TableCell>
                    <TableCell>Containers</TableCell>
                    <TableCell>CY</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>ATW doc</TableCell>
                    <TableCell align="right">Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((row) => (
                    <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/trucker/withdrawals/${row.id}`)}>
                      <TableCell sx={{ fontWeight: 700 }}>{row.referenceNo}</TableCell>
                      <TableCell>{row.atwNumber}</TableCell>
                      <TableCell>
                        {row.containerCount} unit{row.containerCount === 1 ? '' : 's'}
                        <Typography variant="caption" sx={{ display: 'block' }} color="text.secondary">
                          {row.containerSummary}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.currentDepotName}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusLabel[row.status] ?? row.status}
                          color={statusColor[row.status] ?? 'default'}
                        />
                      </TableCell>
                      <TableCell>{row.hasAtwDocument ? 'Attached' : 'Missing'}</TableCell>
                      <TableCell align="right">
                        {row.status === 'Draft' && (
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteOutlinedIcon />}
                            disabled={deletingId === row.id}
                            onClick={(e) => void handleDeleteDraft(row.id, e)}
                            sx={{ mr: 1 }}
                          >
                            Delete
                          </Button>
                        )}
                        <Button size="small" endIcon={<OpenInNewIcon />} onClick={(e) => { e.stopPropagation(); navigate(`/trucker/withdrawals/${row.id}`) }}>
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </ListDesktopOnly>

          <ListMobileOnly>
            {filteredItems.map((row) => (
              <ListMobileCard key={row.id} onClick={() => navigate(`/trucker/withdrawals/${row.id}`)}>
                <ListMobileTitle>{row.referenceNo}</ListMobileTitle>
                <ListMobileMeta>ATW {row.atwNumber}</ListMobileMeta>
                <ListMobileMeta>
                  {row.containerCount} container{row.containerCount === 1 ? '' : 's'} · {row.containerSummary}
                </ListMobileMeta>
                <ListMobileMeta>{row.currentDepotName}</ListMobileMeta>
                <ListMobileChipRow>
                  <Chip size="small" label={statusLabel[row.status] ?? row.status} color={statusColor[row.status] ?? 'default'} />
                  <Chip size="small" variant="outlined" label={row.hasAtwDocument ? 'ATW attached' : 'No ATW'} />
                </ListMobileChipRow>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {formatDateTime(row.submittedAt ?? row.createdAt)}
                </Typography>
              </ListMobileCard>
            ))}
          </ListMobileOnly>
        </>
      )}
    </Box>
  )
}
