import { ListLoadingState } from '../../components/layout/ListPagePrimitives'
import { Alert, Box, Button, Chip, Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined'
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
  Booked: 'warning',
  CyAssigned: 'info',
  Scheduled: 'info',
}

function statusLabel(status: string) {
  if (status === 'UnderReview') return 'Under review'
  if (status === 'CyAssigned') return 'CY assigned'
  return status
}

function getReleaseProgress(item: Withdrawal) {
  const released = item.lines.filter((line) => line.lineStatus === 'Released').length
  if (released === 0) return null
  return {
    released,
    total: item.containerCount,
    complete: released >= item.containerCount,
  }
}

function ReleaseProgressBadge({ item }: { item: Withdrawal }) {
  const progress = getReleaseProgress(item)
  if (!progress) return null
  return (
    <Chip
      size="small"
      label={`${progress.released}/${progress.total} released`}
      color={progress.complete ? 'success' : 'info'}
      sx={{ fontWeight: 600 }}
    />
  )
}

export default function EvaluatorAtwPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAppSelector((s) => s.auth.user)
  const [items, setItems] = useState<Withdrawal[]>([])
  const [awaitingCy, setAwaitingCy] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const tab = searchParams.get('tab') === 'awaiting-cy' ? 'awaiting-cy' : 'all'
  const widget = searchParams.get('widget')
  const listItems = tab === 'awaiting-cy' ? awaitingCy : items
  const filteredItems = useMemo(() => {
    const now = new Date()
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    if (widget === 'expiring48') {
      return items.filter((w) => {
        if (!['Issued', 'CyAssigned', 'Submitted', 'UnderReview', 'Approved'].includes(w.status)) return false
        if (w.status === 'CyAssigned' && w.bookedAt) return false
        const exp = new Date(`${w.expirationDate}T23:59:59`)
        return exp >= now && exp <= in48h
      })
    }
    if (widget === 'stuck24') {
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      return items.filter((w) => ['Submitted', 'UnderReview'].includes(w.status) && !!w.submittedAt && new Date(w.submittedAt) <= cutoff)
    }
    if (widget === 'rejectedReasons') return items.filter((w) => w.status === 'Rejected')
    if (widget === 'turnaround') return listItems.filter((w) => ['Approved', 'Rejected', 'Released', 'Completed'].includes(w.status))
    return listItems
  }, [listItems, widget])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([withdrawalApi.list(), withdrawalApi.awaitingCy()])
      .then(([all, cy]) => {
        setItems(all.data)
        setAwaitingCy(cy.data)
      })
      .catch(() => setError('Failed to load ATW records.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const summary = useMemo(
    () => ({
      awaitingCy: awaitingCy.length,
      issued: items.filter((i) => i.status === 'Issued' || (i.status === 'CyAssigned' && !i.bookedAt)).length,
      pending: items.filter((i) => ['Submitted', 'UnderReview'].includes(i.status)).length,
      approved: items.filter((i) => ['Approved', 'Released', 'Completed'].includes(i.status)).length,
    }),
    [items, awaitingCy],
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
              ATW &amp; ICS bookings
            </Typography>
            <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
              Assign CY to trucker bookings, or issue ATW for the legacy flow.
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

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Awaiting CY
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#ED6C02', mt: 0.5 }}>
            {summary.awaitingCy}
          </Typography>
        </Paper>
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

      <Tabs
        value={tab}
        onChange={(_, v) => setSearchParams(v === 'all' ? {} : { tab: v })}
        sx={{ mb: 2 }}
      >
        <Tab value="awaiting-cy" label={`Awaiting CY (${summary.awaitingCy})`} />
        <Tab value="all" label="All records" />
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {widget && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <Box>
              Filter active: <strong>{widget}</strong>. Showing {filteredItems.length} ATW record(s).
            </Box>
            <Button size="small" variant="outlined" onClick={() => setSearchParams({})}>
              Clear filter
            </Button>
          </Box>
        </Alert>
      )}

      {loading ? (
        <ListLoadingState />
      ) : filteredItems.length === 0 ? (
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
                    <TableCell>Booking</TableCell>
                    <TableCell>ATW</TableCell>
                    <TableCell>Trucker</TableCell>
                    <TableCell>Containers</TableCell>
                    <TableCell>CY</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                      onClick={() => navigate(`/evaluations/atw/${row.id}${tab === 'awaiting-cy' ? '?tab=awaiting-cy' : ''}`)}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>
                        {row.bookingNumber ?? row.referenceNo}
                        <Typography variant="caption" sx={{ display: 'block' }} color="text.secondary">
                          {row.referenceNo}
                        </Typography>
                      </TableCell>
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
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                          <Chip label={statusLabel(row.status)} size="small" color={statusColor[row.status] ?? 'default'} />
                          <ReleaseProgressBadge item={row} />
                        </Box>
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        {row.status === 'Booked' ? (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => navigate(`/evaluations/atw/${row.id}?tab=awaiting-cy`)}
                          >
                            Review &amp; assign
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            endIcon={<OpenInNewIcon />}
                            onClick={() => navigate(`/evaluations/atw/${row.id}${tab === 'awaiting-cy' ? '?tab=awaiting-cy' : ''}`)}
                          >
                            View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </ListDesktopOnly>

          <ListMobileOnly>
            {filteredItems.map((row) => (
              <ListMobileCard
                key={row.id}
                onClick={() => navigate(`/evaluations/atw/${row.id}${tab === 'awaiting-cy' ? '?tab=awaiting-cy' : ''}`)}
              >
                <ListMobileTitle>{row.referenceNo}</ListMobileTitle>
                <ListMobileMeta>ATW {row.atwNumber} · {row.truckerName}</ListMobileMeta>
                <ListMobileMeta>{row.containerCount} container{row.containerCount === 1 ? '' : 's'} · {row.containerSummary}</ListMobileMeta>
                <ListMobileMeta>{row.currentDepotName}</ListMobileMeta>
                <ListMobileChipRow>
                  <Chip label={statusLabel(row.status)} size="small" color={statusColor[row.status] ?? 'default'} />
                  <ReleaseProgressBadge item={row} />
                </ListMobileChipRow>
              </ListMobileCard>
            ))}
          </ListMobileOnly>
        </>
      )}
    </Box>
  )
}
