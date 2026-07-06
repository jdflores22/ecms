import { ListLoadingState } from '../../components/layout/ListPagePrimitives'
import { ProgressBarSkeleton } from '../../components/layout/SkeletonPrimitives'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  LinearProgress,
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
import CalendarViewDayOutlinedIcon from '@mui/icons-material/CalendarViewDayOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SearchIcon from '@mui/icons-material/Search'
import TodayIcon from '@mui/icons-material/Today'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom'
import { hexToRgba } from '../../components/layout/DetailPagePrimitives'
import {
  depotApi,
  scheduleApi,
  type Depot,
  type Schedule,
  type SlotAvailability,
} from '../../services/api'
import { useAppSelector } from '../../store/hooks'
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
import {
  formatDisplayDate,
  formatScheduleTime,
  shiftIsoDate,
  todayIsoDate,
} from '../../utils/datetime'
import { scheduleStatusLabel } from '../../utils/scheduleStatus'

const primaryDark = LIST_PRIMARY
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

type DayStatusFilter = 'All' | 'WaitingSchedule' | 'Scheduled' | 'Confirmed' | 'Completed' | 'NoShow'

const STATUS_FILTERS: {
  key: DayStatusFilter
  label: string
  summaryColor: string
  depotHidden?: boolean
  match: (s: Schedule) => boolean
}[] = [
  { key: 'All', label: 'All returns', summaryColor: '#0B3D91', match: () => true },
  {
    key: 'WaitingSchedule',
    label: 'Waiting schedule',
    summaryColor: '#ED6C02',
    match: (s) => s.status === 'WaitingSchedule',
  },
  {
    key: 'Scheduled',
    label: 'For Payment',
    summaryColor: '#0288D1',
    depotHidden: true,
    match: (s) => s.status === 'Scheduled',
  },
  { key: 'Confirmed', label: 'Confirmed', summaryColor: '#2E7D32', match: (s) => s.status === 'Confirmed' },
  { key: 'Completed', label: 'Completed', summaryColor: '#6A1B9A', match: (s) => s.status === 'Completed' },
  { key: 'NoShow', label: 'No show', summaryColor: '#C62828', match: (s) => s.status === 'NoShow' },
]

const statusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  WaitingSchedule: 'warning',
  Scheduled: 'info',
  Confirmed: 'success',
  Completed: 'success',
  NoShow: 'error',
}

const statusLabel: Record<string, string> = {
  WaitingSchedule: 'Waiting schedule',
}

function displayScheduleStatus(status: string) {
  return statusLabel[status] ?? scheduleStatusLabel(status)
}

function matchesSearch(item: Schedule, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    item.referenceNo.toLowerCase().includes(q) ||
    (item.truckerName ?? '').toLowerCase().includes(q) ||
    item.depotName.toLowerCase().includes(q) ||
    (item.depotRemarks ?? '').toLowerCase().includes(q)
  )
}

function statusSortOrder(status: string) {
  const order: Record<string, number> = {
    WaitingSchedule: 0,
    Scheduled: 1,
    Confirmed: 2,
    Completed: 3,
    NoShow: 4,
  }
  return order[status] ?? 9
}

function SummaryCard({
  label,
  value,
  color,
  active,
  onClick,
}: {
  label: string
  value: number
  color: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        border: '2px solid',
        borderColor: active ? color : 'divider',
        bgcolor: active ? hexToRgba(color, 0.06) : '#fff',
        boxShadow: active ? `0 4px 16px ${hexToRgba(color, 0.15)}` : '0 2px 12px rgba(15, 23, 42, 0.05)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        minWidth: 0,
        '&:hover': onClick
          ? { borderColor: color, boxShadow: `0 4px 16px ${hexToRgba(color, 0.12)}` }
          : undefined,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, lineHeight: 1.3, wordBreak: 'break-word', display: 'block' }}
      >
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 0.5, fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>
        {value}
      </Typography>
    </Paper>
  )
}

export default function DailyReturnsPage() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const today = todayIsoDate()
  const [selectedDate, setSelectedDate] = useState(today)
  const [activeFilter, setActiveFilter] = useState<DayStatusFilter>('All')
  const [search, setSearch] = useState('')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [depotId, setDepotId] = useState<number | ''>('')
  const [capacityInfo, setCapacityInfo] = useState<SlotAvailability | null>(null)
  const [loading, setLoading] = useState(true)
  const [capacityLoading, setCapacityLoading] = useState(false)
  const [error, setError] = useState('')

  const allowed = user?.role === 'DepotPersonnel' || user?.role === 'Administrator'
  const isDepotView = user?.role === 'DepotPersonnel'

  const visibleFilters = useMemo(
    () => STATUS_FILTERS.filter((f) => !isDepotView || !f.depotHidden),
    [isDepotView],
  )

  useEffect(() => {
    if (isDepotView && activeFilter === 'Scheduled') {
      setActiveFilter('All')
    }
  }, [isDepotView, activeFilter])

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

  const depotName = useMemo(() => {
    if (capacityInfo?.depotName) return capacityInfo.depotName
    if (effectiveDepotId) {
      const match = depots.find((d) => d.id === effectiveDepotId)
      if (match) return match.name
      const fromSchedule = schedules.find((s) => s.depotId === effectiveDepotId)
      if (fromSchedule) return fromSchedule.depotName
    }
    return null
  }, [capacityInfo, effectiveDepotId, depots, schedules])

  useEffect(() => {
    if (!effectiveDepotId) {
      setCapacityInfo(null)
      return
    }
    setCapacityLoading(true)
    scheduleApi
      .slots(effectiveDepotId, selectedDate)
      .then(({ data }) => setCapacityInfo(data))
      .catch(() => setCapacityInfo(null))
      .finally(() => setCapacityLoading(false))
  }, [effectiveDepotId, selectedDate])

  const dayReturns = useMemo(() => {
    return schedules
      .filter((s) => s.date === selectedDate && (effectiveDepotId === null || s.depotId === effectiveDepotId))
      .sort((a, b) => {
        const byStatus = statusSortOrder(a.status) - statusSortOrder(b.status)
        if (byStatus !== 0) return byStatus
        return a.referenceNo.localeCompare(b.referenceNo)
      })
  }, [schedules, selectedDate, effectiveDepotId])

  const counts = useMemo(
    () =>
      visibleFilters.reduce(
        (acc, filter) => {
          acc[filter.key] = dayReturns.filter(filter.match).length
          return acc
        },
        {} as Record<DayStatusFilter, number>,
      ),
    [dayReturns, visibleFilters],
  )

  const waitingCount = counts.WaitingSchedule ?? 0

  const filtered = useMemo(() => {
    const filter = visibleFilters.find((f) => f.key === activeFilter) ?? visibleFilters[0]
    return dayReturns.filter((item) => filter.match(item) && matchesSearch(item, search))
  }, [dayReturns, activeFilter, search, visibleFilters])

  const capacityPct = capacityInfo
    ? Math.min(100, Math.round((capacityInfo.bookedCount / capacityInfo.dailyLimit) * 100))
    : 0

  const capacityColor = capacityPct >= 90 ? '#D32F2F' : capacityPct >= 70 ? '#ED6C02' : '#2E7D32'

  if (!allowed) {
    return <Navigate to="/" replace />
  }

  const dateContext =
    selectedDate === today ? 'Today' : selectedDate < today ? 'Past date' : 'Upcoming date'

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
            alignItems: { xs: 'flex-start', sm: 'center' },
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
              <CalendarViewDayOutlinedIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', sm: '1.75rem' } }}>
                Daily returns
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.88)', mt: 0.5, maxWidth: 520, lineHeight: 1.5 }}>
                {depotName ? `${depotName} · ` : ''}
                Yard gate view — returns booked for the selected day and depot capacity.
              </Typography>
              {dayReturns.length > 0 && (
                <Chip
                  label={`${dayReturns.length} return${dayReturns.length === 1 ? '' : 's'} on ${formatDisplayDate(selectedDate)}`}
                  size="small"
                  sx={{
                    mt: 1.25,
                    fontWeight: 700,
                    bgcolor: 'rgba(255,255,255,0.16)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.28)',
                  }}
                />
              )}
            </Box>
          </Box>
          <Button
            component={RouterLink}
            to="/depot/schedules"
            variant="contained"
            startIcon={<EventNoteOutlinedIcon />}
            sx={listHeroActionSx}
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

      {waitingCount > 0 && selectedDate >= today && (
        <Alert
          severity="warning"
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button
              component={RouterLink}
              to="/depot/schedules"
              color="inherit"
              size="small"
              sx={{ fontWeight: 600 }}
            >
              Assign dates
            </Button>
          }
        >
          {waitingCount} return{waitingCount === 1 ? '' : 's'} on this day still need a schedule assignment.
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
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
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: primaryDark }}>
              {formatDisplayDate(selectedDate)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dateContext}
            </Typography>
          </Box>
          {capacityInfo && !capacityLoading && (
            <Chip
              label={`${capacityInfo.bookedCount} / ${capacityInfo.dailyLimit} capacity used`}
              sx={{
                fontWeight: 700,
                bgcolor: hexToRgba(capacityColor, 0.1),
                color: capacityColor,
              }}
            />
          )}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, auto)', md: 'repeat(5, auto)' },
            gap: 1.5,
            alignItems: 'center',
            mb: capacityInfo ? 2 : 0,
          }}
        >
          <Button
            fullWidth
            startIcon={<ChevronLeftIcon />}
            onClick={() => setSelectedDate(shiftIsoDate(selectedDate, -1))}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Previous
          </Button>
          <Button
            fullWidth
            startIcon={<TodayIcon />}
            variant={selectedDate === today ? 'contained' : 'outlined'}
            onClick={() => setSelectedDate(today)}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Today
          </Button>
          <Button
            fullWidth
            endIcon={<ChevronRightIcon />}
            onClick={() => setSelectedDate(shiftIsoDate(selectedDate, 1))}
            sx={{ fontWeight: 600, borderRadius: 2, gridColumn: { xs: '1 / -1', sm: 'auto' } }}
          >
            Next
          </Button>
          <TextField
            fullWidth
            label="Date"
            type="date"
            size="small"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            sx={{ ...fieldSx, gridColumn: { xs: '1 / -1', sm: 'auto' } }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {user?.role === 'Administrator' && (
            <FormControl fullWidth size="small" sx={{ ...fieldSx, gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
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

        {capacityInfo && (
          <>
            {capacityLoading ? (
              <ProgressBarSkeleton height={8} />
            ) : (
              <LinearProgress
                variant="determinate"
                value={capacityPct}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: hexToRgba(primaryDark, 0.08),
                  '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: capacityColor },
                }}
              />
            )}
          </>
        )}
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, 1fr)',
            lg: `repeat(${visibleFilters.length}, 1fr)`,
          },
          gap: { xs: 1.5, sm: 2 },
          mb: 2,
        }}
      >
        {visibleFilters.map((filter) => (
          <SummaryCard
            key={filter.key}
            label={filter.label}
            value={counts[filter.key]}
            color={filter.summaryColor}
            active={activeFilter === filter.key}
            onClick={() => setActiveFilter(filter.key)}
          />
        ))}
      </Box>

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
          value={activeFilter}
          onChange={(_, value: DayStatusFilter) => setActiveFilter(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
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
          {visibleFilters.map((filter) => (
            <Tab
              key={filter.key}
              value={filter.key}
              label={`${filter.label} (${counts[filter.key]})`}
            />
          ))}
        </Tabs>
      </Paper>

      <TextField
        fullWidth
        size="small"
        placeholder="Search reference, trucker, depot remarks…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ ...fieldSx, mb: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          },
        }}
      />

      <Paper elevation={0} sx={listTablePaperSx}>
        {loading ? (
          <ListLoadingState />
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
            <CalendarViewDayOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
              {search.trim()
                ? 'No returns match your search for this day.'
                : dayReturns.length === 0
                  ? 'No returns scheduled for this day.'
                  : `No ${visibleFilters.find((f) => f.key === activeFilter)?.label.toLowerCase()} returns.`}
            </Typography>
            {dayReturns.length === 0 && selectedDate >= today && (
              <Button
                component={RouterLink}
                to="/depot/schedules"
                variant="outlined"
                sx={{ mt: 2, fontWeight: 600, borderRadius: 2 }}
              >
                Open schedule queue
              </Button>
            )}
          </Box>
        ) : (
          <>
            <ListMobileOnly>
              {filtered.map((item) => (
                <ListMobileCard key={item.id} onClick={() => navigate(`/depot/schedules/${item.id}`)}>
                  <ListMobileTitle>{item.referenceNo}</ListMobileTitle>
                  <ListMobileMeta>{item.truckerName ?? '—'}</ListMobileMeta>
                  <ListMobileMeta>
                    {formatScheduleTime(item.time)}
                    {item.slotNo > 0 ? ` · Slot ${item.slotNo}` : ''}
                  </ListMobileMeta>
                  {item.depotRemarks && (
                    <ListMobileMeta>Depot remarks: {item.depotRemarks}</ListMobileMeta>
                  )}
                  <ListMobileChipRow>
                    <Chip
                      label={displayScheduleStatus(item.status)}
                      color={statusColor[item.status] ?? 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </ListMobileChipRow>
                  <Box sx={listMobileActionsSx} onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="small"
                      variant={item.status === 'WaitingSchedule' ? 'contained' : 'outlined'}
                      endIcon={<OpenInNewIcon />}
                      onClick={() => navigate(`/depot/schedules/${item.id}`)}
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
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        bgcolor: hexToRgba(primaryDark, 0.04),
                        '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
                      }}
                    >
                      <TableCell>Reference</TableCell>
                      <TableCell>Trucker</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Depot remarks</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((item) => (
                      <TableRow
                        key={item.id}
                        hover
                        sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                        onClick={() => navigate(`/depot/schedules/${item.id}`)}
                      >
                        <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{item.referenceNo}</TableCell>
                        <TableCell>{item.truckerName ?? '—'}</TableCell>
                        <TableCell>
                          {formatScheduleTime(item.time)}
                          {item.slotNo > 0 ? ` · Slot ${item.slotNo}` : ''}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={displayScheduleStatus(item.status)}
                            color={statusColor[item.status] ?? 'default'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 200,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: item.depotRemarks ? 'text.primary' : 'text.secondary',
                          }}
                          title={item.depotRemarks ?? undefined}
                        >
                          {item.depotRemarks || '—'}
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="small"
                            variant={item.status === 'WaitingSchedule' ? 'contained' : 'outlined'}
                            endIcon={<OpenInNewIcon />}
                            onClick={() => navigate(`/depot/schedules/${item.id}`)}
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
