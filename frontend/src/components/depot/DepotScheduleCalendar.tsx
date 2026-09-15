import {
  Box,
  Button,
  ButtonGroup,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'
import { useMemo } from 'react'
import { hexToRgba } from '../layout/DetailPagePrimitives'
import { LIST_PRIMARY } from '../layout/ListPagePrimitives'
import type { Depot, Schedule } from '../../services/api'
import {
  endOfMonthIso,
  formatMonthYearLabel,
  monthCalendarGridDates,
  shiftMonth,
  startOfMonthIso,
  todayIsoDate,
} from '../../utils/datetime'

const primaryDark = LIST_PRIMARY

const PENDING_COLOR = '#ED6C02'
const SCHEDULED_COLOR = '#2E7D32'

const WEEKDAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export type CalendarDaySummary = {
  date: string
  pendingCount: number
  scheduledCount: number
  scheduleIds: number[]
}

type DepotScheduleCalendarProps = {
  schedules: Schedule[]
  depots: Depot[]
  monthStart: string
  depotFilterId: number | 'all'
  onMonthStartChange: (monthStart: string) => void
  onDepotFilterChange: (id: number | 'all') => void
  onOpenSchedule: (scheduleId: number) => void
  onOpenDay: (date: string, depotId: number) => void
}

function isPendingStatus(status: string): boolean {
  return status === 'WaitingSchedule'
}

function isScheduledStatus(status: string): boolean {
  return status === 'Scheduled' || status === 'Confirmed' || status === 'Completed'
}

export function buildMonthDaySummaries(
  schedules: Schedule[],
  monthStart: string,
  depotFilterId: number | 'all',
): Map<string, CalendarDaySummary> {
  const monthEnd = endOfMonthIso(monthStart)
  const map = new Map<string, CalendarDaySummary>()

  for (const schedule of schedules) {
    if (!schedule.date || schedule.date < monthStart || schedule.date > monthEnd) continue
    if (depotFilterId !== 'all' && schedule.depotId !== depotFilterId) continue
    if (schedule.status === 'NoShow') continue

    const existing = map.get(schedule.date) ?? {
      date: schedule.date,
      pendingCount: 0,
      scheduledCount: 0,
      scheduleIds: [],
    }

    if (isPendingStatus(schedule.status)) existing.pendingCount += 1
    else if (isScheduledStatus(schedule.status)) existing.scheduledCount += 1

    existing.scheduleIds.push(schedule.id)
    map.set(schedule.date, existing)
  }

  return map
}

function CountBadge({ count, color }: { count: number; color: string }) {
  if (count <= 0) return null
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 22,
        height: 22,
        px: 0.75,
        borderRadius: 999,
        bgcolor: color,
        color: '#fff',
        fontSize: '0.7rem',
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {count}
    </Box>
  )
}

export default function DepotScheduleCalendar({
  schedules,
  depots,
  monthStart,
  depotFilterId,
  onMonthStartChange,
  onDepotFilterChange,
  onOpenSchedule,
  onOpenDay,
}: DepotScheduleCalendarProps) {
  const today = todayIsoDate()
  const monthEnd = endOfMonthIso(monthStart)
  const gridDates = useMemo(() => monthCalendarGridDates(monthStart), [monthStart])
  const daySummaries = useMemo(
    () => buildMonthDaySummaries(schedules, monthStart, depotFilterId),
    [schedules, monthStart, depotFilterId],
  )

  const scheduleById = useMemo(() => new Map(schedules.map((s) => [s.id, s])), [schedules])

  const goToday = () => onMonthStartChange(startOfMonthIso(todayIsoDate()))
  const goPrev = () => onMonthStartChange(shiftMonth(monthStart, -1))
  const goNext = () => onMonthStartChange(shiftMonth(monthStart, 1))

  const handleDayClick = (date: string, summary: CalendarDaySummary | undefined) => {
    if (!summary || summary.scheduleIds.length === 0) return
    if (summary.scheduleIds.length === 1) {
      onOpenSchedule(summary.scheduleIds[0])
      return
    }
    const first = scheduleById.get(summary.scheduleIds[0])
    const depotId = depotFilterId !== 'all' ? depotFilterId : (first?.depotId ?? 0)
    if (depotId) onOpenDay(date, depotId)
  }

  const hasAnyInMonth = daySummaries.size > 0

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          alignItems: 'center',
          mb: 2,
        }}
      >
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="depot-cal-filter">Depot</InputLabel>
          <Select
            labelId="depot-cal-filter"
            label="Depot"
            value={depotFilterId === 'all' ? 'all' : String(depotFilterId)}
            onChange={(e) => {
              const v = e.target.value
              onDepotFilterChange(v === 'all' ? 'all' : Number(v))
            }}
            sx={{ borderRadius: 2, bgcolor: '#fff' }}
          >
            <MenuItem value="all">All Depots</MenuItem>
            {depots.map((d) => (
              <MenuItem key={d.id} value={String(d.id)}>
                {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
          }}
        >
          <Button size="small" onClick={goPrev} sx={{ minWidth: 36, borderRadius: 1.5 }}>
            <ChevronLeftIcon fontSize="small" />
          </Button>
          <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 160, textAlign: 'center', px: 1 }}>
            {formatMonthYearLabel(monthStart)}
          </Typography>
          <Button size="small" onClick={goNext} sx={{ minWidth: 36, borderRadius: 1.5 }}>
            <ChevronRightIcon fontSize="small" />
          </Button>
        </Paper>

        <Button
          size="small"
          variant="outlined"
          startIcon={<TodayIcon />}
          onClick={goToday}
          sx={{ fontWeight: 600, borderRadius: 2 }}
        >
          Today
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          bgcolor: '#fff',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: hexToRgba(primaryDark, 0.03),
          }}
        >
          {WEEKDAY_HEADERS.map((label) => (
            <Box
              key={label}
              sx={{
                py: 1.25,
                textAlign: 'center',
                borderLeft: '1px solid',
                borderColor: 'divider',
                '&:first-of-type': { borderLeft: 'none' },
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.4, color: 'text.secondary' }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          }}
        >
          {gridDates.map((iso) => {
            const inMonth = iso >= monthStart && iso <= monthEnd
            const isToday = iso === today
            const summary = daySummaries.get(iso)
            const hasPending = (summary?.pendingCount ?? 0) > 0
            const hasScheduled = (summary?.scheduledCount ?? 0) > 0
            const clickable = Boolean(summary && summary.scheduleIds.length > 0)

            let cellBg = 'transparent'
            if (inMonth && hasPending && hasScheduled) {
              cellBg = `linear-gradient(135deg, ${hexToRgba(PENDING_COLOR, 0.14)} 0%, ${hexToRgba(SCHEDULED_COLOR, 0.14)} 100%)`
            } else if (inMonth && hasPending) {
              cellBg = hexToRgba(PENDING_COLOR, 0.12)
            } else if (inMonth && hasScheduled) {
              cellBg = hexToRgba(SCHEDULED_COLOR, 0.12)
            } else if (isToday) {
              cellBg = hexToRgba('#00A3E0', 0.06)
            }

            return (
              <Box
                key={iso}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={() => handleDayClick(iso, summary)}
                onKeyDown={(e) => {
                  if (!clickable) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleDayClick(iso, summary)
                  }
                }}
                sx={{
                  minHeight: { xs: 72, sm: 88 },
                  p: 1,
                  borderLeft: '1px solid',
                  borderBottom: '1px solid',
                  borderColor: hexToRgba(primaryDark, 0.08),
                  bgcolor: cellBg,
                  opacity: inMonth ? 1 : 0.4,
                  cursor: clickable ? 'pointer' : 'default',
                  transition: 'box-shadow 0.15s',
                  '&:hover': clickable
                    ? { boxShadow: 'inset 0 0 0 2px rgba(11, 61, 145, 0.2)' }
                    : undefined,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isToday ? 800 : 600,
                    color: isToday ? primaryDark : inMonth ? 'text.primary' : 'text.secondary',
                    mb: 0.75,
                  }}
                >
                  {Number(iso.slice(8, 10))}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                  <CountBadge count={summary?.pendingCount ?? 0} color={PENDING_COLOR} />
                  <CountBadge count={summary?.scheduledCount ?? 0} color={SCHEDULED_COLOR} />
                </Box>
              </Box>
            )
          })}
        </Box>

        {!hasAnyInMonth && (
          <Typography sx={{ py: 6, textAlign: 'center', color: 'text.secondary', px: 2 }}>
            No return container schedules this month
            {depotFilterId !== 'all' ? ' for the selected depot' : ''}.
          </Typography>
        )}
      </Paper>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2.5,
          alignItems: 'center',
          mt: 2,
          px: 0.5,
        }}
      >
        {(
          [
            { label: 'Pending (waiting schedule)', color: PENDING_COLOR },
            { label: 'Scheduled / confirmed', color: SCHEDULED_COLOR },
          ] as const
        ).map((item) => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CountBadge count={1} color={item.color} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: 'calendar' | 'list'
  onChange: (mode: 'calendar' | 'list') => void
}) {
  return (
    <ButtonGroup variant="outlined" size="small" sx={{ borderRadius: 2 }}>
      <Button
        onClick={() => onChange('calendar')}
        variant={mode === 'calendar' ? 'contained' : 'outlined'}
        sx={{
          fontWeight: 700,
          textTransform: 'none',
          borderRadius: '8px 0 0 8px',
          ...(mode === 'calendar'
            ? {
                bgcolor: hexToRgba(primaryDark, 0.12),
                color: primaryDark,
                boxShadow: 'none',
                '&:hover': { bgcolor: hexToRgba(primaryDark, 0.18) },
              }
            : { color: 'text.secondary' }),
        }}
      >
        Calendar view
      </Button>
      <Button
        onClick={() => onChange('list')}
        variant={mode === 'list' ? 'contained' : 'outlined'}
        sx={{
          fontWeight: 700,
          textTransform: 'none',
          borderRadius: '0 8px 8px 0',
          ...(mode === 'list'
            ? {
                bgcolor: hexToRgba(primaryDark, 0.12),
                color: primaryDark,
                boxShadow: 'none',
                '&:hover': { bgcolor: hexToRgba(primaryDark, 0.18) },
              }
            : { color: 'text.secondary' }),
        }}
      >
        List view
      </Button>
    </ButtonGroup>
  )
}
