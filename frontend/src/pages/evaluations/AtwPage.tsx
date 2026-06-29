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
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom'
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
import { withdrawalApi, type Withdrawal } from '../../services/api'
import { useAppSelector } from '../../store/hooks'

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

function statusLabel(status: string) {
  return status === 'UnderReview' ? 'Under review' : status
}

export default function EvaluatorAtwPage() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const [items, setItems] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    withdrawalApi
      .list()
      .then(({ data }) => setItems(data))
      .catch(() => setError('Failed to load issued ATW records.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const summary = useMemo(
    () => ({
      issued: items.filter((i) => i.status === 'Issued').length,
      pending: items.filter((i) => ['Submitted', 'UnderReview'].includes(i.status)).length,
      approved: items.filter((i) => ['Approved', 'Released', 'Completed'].includes(i.status)).length,
    }),
    [items],
  )

  if (user?.role !== 'ShippingLineEvaluator') {
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
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
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
            <AssignmentTurnedInOutlinedIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Issue ATW
            </Typography>
            <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
              Issue Authority to Withdraw for authorized truckers at your shipping line.
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/evaluations/atw/new"
            variant="contained"
            startIcon={<AddIcon />}
            sx={listHeroActionSx}
          >
            Issue new ATW
          </Button>
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Awaiting trucker
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0288D1', mt: 0.5 }}>
            {summary.issued}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            At CY review
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#ED6C02', mt: 0.5 }}>
            {summary.pending}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Approved / released
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#2E7D32', mt: 0.5 }}>
            {summary.approved}
          </Typography>
        </Paper>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Paper elevation={0} sx={{ py: 8, textAlign: 'center', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CircularProgress sx={{ color: primaryDark }} />
        </Paper>
      ) : items.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No ATW records yet. Issue one for an authorized trucker.
          </Typography>
          <Button component={RouterLink} to="/evaluations/atw/new" variant="contained" startIcon={<AddIcon />}>
            Issue new ATW
          </Button>
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
                    <TableCell>CY</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{row.referenceNo}</TableCell>
                      <TableCell>{row.atwNumber}</TableCell>
                      <TableCell>{row.truckerName}</TableCell>
                      <TableCell>
                        {row.containerCount} unit{row.containerCount === 1 ? '' : 's'}
                        <Typography variant="caption" sx={{ display: 'block' }} color="text.secondary">
                          {row.containerSummary}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.currentDepotName}</TableCell>
                      <TableCell>
                        <Chip label={statusLabel(row.status)} size="small" color={statusColor[row.status] ?? 'default'} />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          endIcon={<OpenInNewIcon />}
                          onClick={() => navigate(`/evaluations/atw/${row.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </ListDesktopOnly>

          <ListMobileOnly>
            {items.map((row) => (
              <ListMobileCard key={row.id} onClick={() => navigate(`/evaluations/atw/${row.id}`)}>
                <ListMobileTitle>{row.referenceNo}</ListMobileTitle>
                <ListMobileMeta>ATW {row.atwNumber} · {row.truckerName}</ListMobileMeta>
                <ListMobileMeta>{row.containerCount} container{row.containerCount === 1 ? '' : 's'} · {row.containerSummary}</ListMobileMeta>
                <ListMobileMeta>{row.currentDepotName}</ListMobileMeta>
                <ListMobileChipRow>
                  <Chip label={statusLabel(row.status)} size="small" color={statusColor[row.status] ?? 'default'} />
                </ListMobileChipRow>
              </ListMobileCard>
            ))}
          </ListMobileOnly>
        </>
      )}
    </Box>
  )
}
