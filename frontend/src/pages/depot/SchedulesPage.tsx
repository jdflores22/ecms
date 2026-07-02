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
import { useAppSelector } from '../../store/hooks'
import { formatScheduleDate } from '../../utils/datetime'
import { scheduleStatusLabel } from '../../utils/scheduleStatus'

const primaryDark = LIST_PRIMARY

const STATUS_TABS = [
  { key: 'WaitingSchedule', label: 'Waiting schedule', summaryColor: '#ED6C02' },
  { key: 'Scheduled', label: 'For Payment', summaryColor: '#0288D1' },
  { key: 'Confirmed', label: 'Confirmed', summaryColor: '#2E7D32' },
  { key: 'Completed', label: 'Completed', summaryColor: '#1565C0' },
  { key: 'NoShow', label: 'No show', summaryColor: '#C62828' },
] as const

type ScheduleStatusTab = (typeof STATUS_TABS)[number]['key']

/** Payment verification is admin-only — depot staff do not manage this queue. */
const DEPOT_HIDDEN_STATUS_TABS = new Set<ScheduleStatusTab>(['Scheduled'])

const statusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  WaitingSchedule: 'warning',
  Scheduled: 'info',
  Confirmed: 'success',
  Completed: 'success',
  NoShow: 'error',
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
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
        minWidth: 0,
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

function ScheduleRowActions({ item }: { item: Schedule }) {
  const isWaiting = item.status === 'WaitingSchedule'
  return (
    <Button
      component={RouterLink}
      to={`/depot/schedules/${item.id}`}
      size="small"
      variant={isWaiting ? 'contained' : 'outlined'}
      startIcon={<OpenInNewIcon />}
      sx={{ fontWeight: 600, borderRadius: 2 }}
    >
      {isWaiting ? 'Assign' : 'View'}
    </Button>
  )
}

export default function DepotSchedulesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAppSelector((s) => s.auth.user)
  const isDepotView = user?.role === 'DepotPersonnel'
  const [activeStatus, setActiveStatus] = useState<ScheduleStatusTab>('WaitingSchedule')
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

  const visibleStatusTabs = useMemo(
    () => STATUS_TABS.filter((tab) => !isDepotView || !DEPOT_HIDDEN_STATUS_TABS.has(tab.key)),
    [isDepotView],
  )

  useEffect(() => {
    if (isDepotView && DEPOT_HIDDEN_STATUS_TABS.has(activeStatus)) {
      setActiveStatus('WaitingSchedule')
    }
  }, [isDepotView, activeStatus])

  const countByStatus = useMemo(() => {
    const counts = Object.fromEntries(STATUS_TABS.map((t) => [t.key, 0])) as Record<ScheduleStatusTab, number>
    for (const s of schedules) {
      if (s.status in counts) counts[s.status as ScheduleStatusTab]++
    }
    return counts
  }, [schedules])

  const filtered = useMemo(() => {
    return schedules
      .filter((s) => s.status === activeStatus)
      .sort((a, b) => {
        const byDate = b.date.localeCompare(a.date)
        if (byDate !== 0) return byDate
        return b.id - a.id
      })
  }, [schedules, activeStatus])

  const activeTabMeta = visibleStatusTabs.find((t) => t.key === activeStatus) ?? visibleStatusTabs[0]

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
                Assign return date — validated against depot daily capacity.
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
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, 1fr)',
            lg: `repeat(${visibleStatusTabs.length}, 1fr)`,
          },
          gap: { xs: 1.5, sm: 2 },
          mb: 3,
        }}
      >
        {visibleStatusTabs.map((tab) => (
          <SummaryCard
            key={tab.key}
            label={tab.label}
            value={countByStatus[tab.key]}
            color={tab.summaryColor}
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
          value={activeStatus}
          onChange={(_, v) => setActiveStatus(v)}
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
          {visibleStatusTabs.map((tab) => (
            <Tab
              key={tab.key}
              value={tab.key}
              label={`${tab.label} (${countByStatus[tab.key]})`}
            />
          ))}
        </Tabs>
      </Paper>

      <Paper elevation={0} sx={listTablePaperSx}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: primaryDark }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary', px: 2 }}>
            No {activeTabMeta.label.toLowerCase()} schedules for this depot.
          </Typography>
        ) : (
          <>
            <ListMobileOnly>
              {filtered.map((item) => (
                <ListMobileCard key={item.id} onClick={() => navigate(`/depot/schedules/${item.id}`)}>
                  <ListMobileTitle>{item.referenceNo}</ListMobileTitle>
                  <ListMobileMeta>{item.depotName}</ListMobileMeta>
                  <ListMobileMeta>
                    {item.date ? formatScheduleDate(item.date) : 'Date not set'}
                  </ListMobileMeta>
                  {item.truckerName && <ListMobileMeta>Trucker: {item.truckerName}</ListMobileMeta>}
                  {item.depotRemarks && (
                    <ListMobileMeta>Depot remarks: {item.depotRemarks}</ListMobileMeta>
                  )}
                  <ListMobileChipRow>
                    <Chip
                      label={scheduleStatusLabel(item.status)}
                      color={statusColor[item.status] ?? 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </ListMobileChipRow>
                  <Box sx={listMobileActionsSx} onClick={(e) => e.stopPropagation()}>
                    <ScheduleRowActions item={item} />
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
                      <TableCell>Return date</TableCell>
                      <TableCell>Trucker</TableCell>
                      <TableCell>Depot remarks</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((item) => (
                      <TableRow
                        key={item.id}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 }, cursor: 'pointer' }}
                        onClick={() => navigate(`/depot/schedules/${item.id}`)}
                      >
                        <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{item.referenceNo}</TableCell>
                        <TableCell>{item.depotName}</TableCell>
                        <TableCell>{item.date ? formatScheduleDate(item.date) : '—'}</TableCell>
                        <TableCell>{item.truckerName ?? '—'}</TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 220,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: item.depotRemarks ? 'text.primary' : 'text.secondary',
                          }}
                          title={item.depotRemarks ?? undefined}
                        >
                          {item.depotRemarks || '—'}
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <ScheduleRowActions item={item} />
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
