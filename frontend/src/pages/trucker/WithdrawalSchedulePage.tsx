import { ListLoadingState } from '../../components/layout/ListPagePrimitives'
import { Alert, Box, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined'
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
  listPageRootSx,
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'
import { isPreAdviceManager } from '../../config/roleConfig'
import { withdrawalApi, type WithdrawalSchedule } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatScheduleDate, formatScheduleTime } from '../../utils/datetime'

const primaryDark = LIST_PRIMARY

export default function TruckerWithdrawalSchedulePage() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const [items, setItems] = useState<WithdrawalSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    withdrawalApi
      .mySchedules()
      .then(({ data }) => setItems(data))
      .catch(() => setError('Failed to load pick-up schedules.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const upcoming = useMemo(() => items.filter((s) => s.status === 'Scheduled'), [items])

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
            <EventAvailableOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              ATW pick-up schedule
            </Typography>
            <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
              Container yard pick-up days assigned by the depot after CY assignment.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <ListLoadingState />
      ) : items.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No pick-up schedules yet. Book ICS and wait for CY assignment and depot scheduling.
          </Typography>
          <Button component={RouterLink} to="/trucker/withdrawals/new" variant="contained">
            Book ICS
          </Button>
        </Paper>
      ) : (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Upcoming ({upcoming.length})
          </Typography>
          <ListDesktopOnly>
            <TableContainer component={Paper} elevation={0} sx={listTablePaperSx}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Reference</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Time / slot</TableCell>
                    <TableCell>CY</TableCell>
                    <TableCell>Containers</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{row.referenceNo}</TableCell>
                      <TableCell>{formatScheduleDate(row.date)}</TableCell>
                      <TableCell>
                        {formatScheduleTime(row.time)}
                        {row.slotNo > 0 ? ` · Slot ${row.slotNo}` : ''}
                      </TableCell>
                      <TableCell>{row.depotName}</TableCell>
                      <TableCell>{row.containerSummary}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          endIcon={<OpenInNewIcon />}
                          onClick={() => navigate(`/trucker/withdrawals/${row.withdrawalRequestId}`)}
                        >
                          Details
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
              <ListMobileCard key={row.id} onClick={() => navigate(`/trucker/withdrawals/${row.withdrawalRequestId}`)}>
                <ListMobileTitle>{row.referenceNo}</ListMobileTitle>
                <ListMobileMeta>
                  {formatScheduleDate(row.date)} · {formatScheduleTime(row.time)}
                </ListMobileMeta>
                <ListMobileMeta>{row.depotName} · {row.containerSummary}</ListMobileMeta>
                <ListMobileChipRow>
                  <Chip label={row.status} size="small" color="info" />
                </ListMobileChipRow>
              </ListMobileCard>
            ))}
          </ListMobileOnly>
        </>
      )}
    </Box>
  )
}
