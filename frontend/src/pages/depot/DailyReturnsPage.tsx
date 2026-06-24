import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import CalendarViewDayOutlinedIcon from '@mui/icons-material/CalendarViewDayOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined'
import TodayIcon from '@mui/icons-material/Today'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate } from 'react-router-dom'
import {
  depotApi,
  scheduleApi,
  type Depot,
  type Schedule,
  type SlotAvailability,
} from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import {
  formatDisplayDate,
  formatScheduleTime,
  shiftIsoDate,
  todayIsoDate,
} from '../../utils/datetime'

const primaryDark = '#0B3D91'
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

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

const tablePaperSx = {
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: '#fff',
  boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
  overflow: 'hidden',
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
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

export default function DailyReturnsPage() {
  const user = useAppSelector((s) => s.auth.user)
  const today = todayIsoDate()
  const [selectedDate, setSelectedDate] = useState(today)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [depotId, setDepotId] = useState<number | ''>('')
  const [slotInfo, setSlotInfo] = useState<SlotAvailability | null>(null)
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError] = useState('')

  const allowed = user?.role === 'DepotPersonnel' || user?.role === 'Administrator'

  const loadSchedules = useCallback(() => {
    setLoading(true)
    setError('')
    scheduleApi
      .list()
      .then(({ data }) => setSchedules(data))
      .catch(() => setError('Failed to load returns.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!allowed) return
    loadSchedules()
    if (user?.role === 'Administrator') {
      depotApi.list().then(({ data }) => setDepots(data)).catch(() => {})
    }
  }, [allowed, loadSchedules, user?.role])

  useEffect(() => {
    if (user?.role === 'DepotPersonnel' && user.depotId) {
      setDepotId(user.depotId)
    } else if (user?.role === 'Administrator' && depots.length > 0 && depotId === '') {
      setDepotId(depots[0].id)
    }
  }, [user, depots, depotId])

  const effectiveDepotId = useMemo(() => {
    if (depotId !== '') return depotId
    if (user?.depotId) return user.depotId
    const fromSchedule = schedules.find((s) => s.date === selectedDate)?.depotId
    return fromSchedule ?? null
  }, [depotId, user?.depotId, schedules, selectedDate])

  useEffect(() => {
    if (!effectiveDepotId) {
      setSlotInfo(null)
      return
    }
    setSlotsLoading(true)
    scheduleApi
      .slots(effectiveDepotId, selectedDate)
      .then(({ data }) => setSlotInfo(data))
      .catch(() => setSlotInfo(null))
      .finally(() => setSlotsLoading(false))
  }, [effectiveDepotId, selectedDate])

  const dayReturns = useMemo(() => {
    return schedules
      .filter((s) => s.date === selectedDate && (effectiveDepotId === null || s.depotId === effectiveDepotId))
      .sort((a, b) => a.slotNo - b.slotNo || formatScheduleTime(a.time).localeCompare(formatScheduleTime(b.time)))
  }, [schedules, selectedDate, effectiveDepotId])

  const stats = useMemo(() => {
    const counts = { total: dayReturns.length, scheduled: 0, confirmed: 0, completed: 0, waiting: 0 }
    for (const s of dayReturns) {
      if (s.status === 'Scheduled') counts.scheduled++
      else if (s.status === 'Confirmed') counts.confirmed++
      else if (s.status === 'Completed') counts.completed++
      else if (s.status === 'WaitingSchedule') counts.waiting++
    }
    return counts
  }, [dayReturns])

  if (!allowed) {
    return <Navigate to="/" replace />
  }

  const capacityPct = slotInfo
    ? Math.min(100, Math.round((slotInfo.bookedCount / slotInfo.dailyLimit) * 100))
    : 0

  const capacityColor =
    capacityPct >= 90 ? '#D32F2F' : capacityPct >= 70 ? '#ED6C02' : '#2E7D32'

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
              <CalendarViewDayOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                Daily Returns
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 520 }}>
                Slot occupancy and return schedule for the selected day.
              </Typography>
            </Box>
          </Box>
          <Button
            component={RouterLink}
            to="/depot/schedules"
            variant="contained"
            startIcon={<EventNoteOutlinedIcon />}
            sx={{
              bgcolor: '#fff',
              color: primaryDark,
              fontWeight: 700,
              flexShrink: 0,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
            }}
          >
            Manage schedules
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
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: primaryDark, mb: 0.5 }}>
          {formatDisplayDate(selectedDate)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {selectedDate === today ? 'Viewing today' : selectedDate < today ? 'Past date' : 'Upcoming date'}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <Button
            startIcon={<ChevronLeftIcon />}
            onClick={() => setSelectedDate(shiftIsoDate(selectedDate, -1))}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Previous
          </Button>
          <Button
            startIcon={<TodayIcon />}
            variant={selectedDate === today ? 'contained' : 'outlined'}
            onClick={() => setSelectedDate(today)}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Today
          </Button>
          <Button
            endIcon={<ChevronRightIcon />}
            onClick={() => setSelectedDate(shiftIsoDate(selectedDate, 1))}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Next
          </Button>
          <TextField
            label="Date"
            type="date"
            size="small"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            sx={{ ...fieldSx, minWidth: 160 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {user?.role === 'Administrator' && (
            <FormControl size="small" sx={{ minWidth: 180, ...fieldSx }}>
              <InputLabel>Depot</InputLabel>
              <Select
                label="Depot"
                value={depotId}
                onChange={(e) => setDepotId(e.target.value as number)}
              >
                {depots.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
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
        <SummaryCard label="Total returns" value={stats.total} color={primaryDark} />
        <SummaryCard label="Scheduled" value={stats.scheduled} color="#0288D1" />
        <SummaryCard label="Confirmed" value={stats.confirmed} color="#2E7D32" />
        <SummaryCard label="Completed" value={stats.completed} color="#6A1B9A" />
      </Box>

      {slotInfo && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
            boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 1,
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: primaryDark }}>
                {slotInfo.depotName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Daily slot capacity
              </Typography>
            </Box>
            <Chip
              label={`${slotInfo.bookedCount} / ${slotInfo.dailyLimit} booked`}
              sx={{
                fontWeight: 700,
                bgcolor: hexToRgba(capacityColor, 0.1),
                color: capacityColor,
              }}
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={capacityPct}
            sx={{
              mb: 2.5,
              height: 10,
              borderRadius: 5,
              bgcolor: hexToRgba(primaryDark, 0.08),
              '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: capacityColor },
            }}
          />
          {slotsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} sx={{ color: primaryDark }} />
            </Box>
          ) : (
            <Grid container spacing={1.5}>
              {slotInfo.slots.map((slot) => (
                <Grid key={slot.slotNo} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: slot.available ? hexToRgba('#2E7D32', 0.35) : 'divider',
                      bgcolor: slot.available ? hexToRgba('#2E7D32', 0.06) : hexToRgba(primaryDark, 0.03),
                      minHeight: 76,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Slot {slot.slotNo}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: slot.available ? '#2E7D32' : primaryDark,
                        mt: 0.25,
                        wordBreak: 'break-word',
                      }}
                    >
                      {slot.available ? 'Available' : slot.referenceNo ?? 'Booked'}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      <Typography variant="h6" sx={{ fontWeight: 700, color: primaryDark, mb: 1.5 }}>
        Return schedule
      </Typography>
      <Paper elevation={0} sx={tablePaperSx}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: primaryDark }} />
          </Box>
        ) : (
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
                  <TableCell>Time</TableCell>
                  <TableCell>Slot</TableCell>
                  <TableCell>Trucker</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dayReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                      No returns scheduled for this day.
                    </TableCell>
                  </TableRow>
                ) : (
                  dayReturns.map((item) => (
                    <TableRow key={item.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{item.referenceNo}</TableCell>
                      <TableCell>{formatScheduleTime(item.time)}</TableCell>
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  )
}
