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
import CalendarViewDayOutlinedIcon from '@mui/icons-material/CalendarViewDayOutlined'
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { hexToRgba } from '../../components/layout/DetailPagePrimitives'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  LIST_PRIMARY,
  listHeroActionSx,
  listMobileActionsSx,
  listPageRootSx,
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'
import { scheduleApi, type Schedule } from '../../services/api'
import { formatScheduleDate, formatScheduleTime } from '../../utils/datetime'

const primaryDark = LIST_PRIMARY

const statusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  WaitingSchedule: 'warning',
  Scheduled: 'info',
  Confirmed: 'success',
  Completed: 'success',
  Cancelled: 'default',
}

const statusLabel: Record<string, string> = {
  WaitingSchedule: 'Waiting schedule',
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


export default function DepotSchedulesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message
    if (message) {
      setSuccessMessage(message)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  const load = useCallback(() => {
    setLoading(true)
    scheduleApi
      .list()
      .then(({ data }) => setSchedules(data))
      .catch(() => setError('Failed to load schedules.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const summary = useMemo(() => {
    const counts = { total: schedules.length, waiting: 0, scheduled: 0, confirmed: 0 }
    for (const s of schedules) {
      if (s.status === 'WaitingSchedule') counts.waiting++
      else if (s.status === 'Scheduled') counts.scheduled++
      else if (s.status === 'Confirmed') counts.confirmed++
    }
    return counts
  }, [schedules])

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
              <EventNoteOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                Depot Scheduling
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 520 }}>
                Assign return date, slot, and trucker — slots are validated against depot daily capacity.
              </Typography>
            </Box>
          </Box>
          <Button
            component={RouterLink}
            to="/depot/daily-returns"
            variant="contained"
            startIcon={<CalendarViewDayOutlinedIcon />}
            sx={listHeroActionSx}
          >
            Daily returns
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <SummaryCard label="Total schedules" value={summary.total} color={primaryDark} />
        <SummaryCard label="Waiting" value={summary.waiting} color="#ED6C02" />
        <SummaryCard label="Scheduled" value={summary.scheduled} color="#0288D1" />
        <SummaryCard label="Confirmed" value={summary.confirmed} color="#2E7D32" />
      </Box>

      <Paper elevation={0} sx={listTablePaperSx}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: primaryDark }} />
          </Box>
        ) : schedules.length === 0 ? (
          <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary', px: 2 }}>
            No schedules for this depot.
          </Typography>
        ) : (
          <>
            <ListMobileOnly>
              {schedules.map((item) => (
                <ListMobileCard key={item.id} onClick={() => navigate(`/depot/schedules/${item.id}`)}>
                  <ListMobileTitle>{item.referenceNo}</ListMobileTitle>
                  <ListMobileMeta>{item.depotName}</ListMobileMeta>
                  <ListMobileMeta>
                    {item.date
                      ? `${formatScheduleDate(item.date)} · ${formatScheduleTime(item.time)}${item.slotNo ? ` · Slot ${item.slotNo}` : ''}`
                      : 'Date not set'}
                  </ListMobileMeta>
                  {item.truckerName && <ListMobileMeta>Trucker: {item.truckerName}</ListMobileMeta>}
                  <ListMobileChipRow>
                    <Chip
                      label={statusLabel[item.status] ?? item.status}
                      color={statusColor[item.status] ?? 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </ListMobileChipRow>
                  <Box sx={listMobileActionsSx} onClick={(e) => e.stopPropagation()}>
                    <Button
                      component={RouterLink}
                      to={`/depot/schedules/${item.id}`}
                      size="small"
                      variant={item.status === 'WaitingSchedule' ? 'contained' : 'outlined'}
                      startIcon={<OpenInNewIcon />}
                      sx={{ fontWeight: 600, borderRadius: 2 }}
                    >
                      {item.status === 'WaitingSchedule' ? 'Assign' : 'View'}
                    </Button>
                  </Box>
                </ListMobileCard>
              ))}
            </ListMobileOnly>

            <ListDesktopOnly>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        bgcolor: hexToRgba(primaryDark, 0.04),
                        '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
                      }}
                    >
                      <TableCell>Reference</TableCell>
                      <TableCell>Depot</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Slot</TableCell>
                      <TableCell>Trucker</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {schedules.map((item) => (
                      <TableRow
                        key={item.id}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 }, cursor: 'pointer' }}
                        onClick={() => navigate(`/depot/schedules/${item.id}`)}
                      >
                        <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{item.referenceNo}</TableCell>
                        <TableCell>{item.depotName}</TableCell>
                        <TableCell>{item.date ? formatScheduleDate(item.date) : '—'}</TableCell>
                        <TableCell>{item.time ? formatScheduleTime(item.time) : '—'}</TableCell>
                        <TableCell>
                          {item.slotNo ? (
                            <Chip label={`Slot ${item.slotNo}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>{item.truckerName ?? '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabel[item.status] ?? item.status}
                            color={statusColor[item.status] ?? 'default'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            component={RouterLink}
                            to={`/depot/schedules/${item.id}`}
                            size="small"
                            variant={item.status === 'WaitingSchedule' ? 'contained' : 'outlined'}
                            startIcon={<OpenInNewIcon />}
                            sx={{ fontWeight: 600, borderRadius: 2 }}
                          >
                            {item.status === 'WaitingSchedule' ? 'Assign' : 'View'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ListDesktopOnly>
          </>
        )}
      </Paper>
    </Box>
  )
}
