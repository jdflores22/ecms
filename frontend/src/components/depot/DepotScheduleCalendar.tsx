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
  formatWeekRangeLabel,
  scheduleHourOfDay,
  shiftIsoDate,
  startOfWeekMondayIso,
  todayIsoDate,
  weekIsoDates,
} from '../../utils/datetime'

const primaryDark = LIST_PRIMARY

/** Visible hour rows in the weekly grid (inclusive start, exclusive end display label). */
const HOUR_START = 6
const HOUR_END = 18 // rows 6..17 → labels 6 AM – 5 PM, last block until 6 PM feel

const DEPOT_PALETTE = [
  { bg: '#E8F5E9', border: '#A5D6A7', text: '#1B5E20' },
  { bg: '#E3F2FD', border: '#90CAF9', text: '#0D47A1' },
  { bg: '#FFF3E0', border: '#FFCC80', text: '#E65100' },
  { bg: '#F3E5F5', border: '#CE93D8', text: '#6A1B9A' },
  { bg: '#E0F7FA', border: '#80DEEA', text: '#006064' },
  { bg: '#FCE4EC', border: '#F48FB1', text: '#880E4F' },
]

export type SlotLoadStatus = 'available' | 'partial' | 'full'

export type CalendarDayCard = {
  key: string
  depotId: number
  depotName: string
  date: string
  hour: number
  bookedCount: number
  dailyLimit: number
  remaining: number
  load: SlotLoadStatus
  scheduleIds: number[]
}

type DepotScheduleCalendarProps = {
  schedules: Schedule[]
  depots: Depot[]
  weekStart: string
  depotFilterId: number | 'all'
  onWeekStartChange: (mondayIso: string) => void
  onDepotFilterChange: (id: number | 'all') => void
  onOpenSchedule: (scheduleId: number) => void
  onOpenDay: (date: string, depotId: number) => void
}

function loadStatus(booked: number, limit: number): SlotLoadStatus {
  if (limit <= 0) return booked > 0 ? 'full' : 'available'
  if (booked <= 0) return 'available'
  if (booked >= limit) return 'full'
  return 'partial'
}

function loadAccent(load: SlotLoadStatus): string {
  switch (load) {
    case 'available':
      return '#2E7D32'
    case 'partial':
      return '#ED6C02'
    case 'full':
      return '#C62828'
  }
}

function formatHourLabel(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:00 ${suffix}`
}

function weekdayShort(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
  })
    .format(new Date(`${iso}T12:00:00+08:00`))
    .toUpperCase()
}

function dayNum(iso: string): string {
  return iso.slice(8, 10).replace(/^0/, '')
}

export function buildCalendarCards(
  schedules: Schedule[],
  depots: Depot[],
  weekDates: string[],
  depotFilterId: number | 'all',
): CalendarDayCard[] {
  const depotById = new Map(depots.map((d) => [d.id, d]))
  const weekSet = new Set(weekDates)
  const groups = new Map<string, Schedule[]>()

  for (const s of schedules) {
    if (!s.date || !weekSet.has(s.date)) continue
    if (depotFilterId !== 'all' && s.depotId !== depotFilterId) continue
    if (s.status === 'NoShow') continue
    const key = `${s.date}|${s.depotId}`
    const list = groups.get(key)
    if (list) list.push(s)
    else groups.set(key, [s])
  }

  const cards: CalendarDayCard[] = []
  for (const [key, list] of groups) {
    const [date, depotIdStr] = key.split('|')
    const depotId = Number(depotIdStr)
    const depot = depotById.get(depotId)
    const dailyLimit = Math.min(depot?.capacity ?? 20, 20)
    const bookedCount = list.length
    const remaining = Math.max(0, dailyLimit - bookedCount)

    const hours = list
      .map((s) => scheduleHourOfDay(s.time))
      .filter((h): h is number => h != null)
    const hour =
      hours.length > 0
        ? Math.min(HOUR_END - 1, Math.max(HOUR_START, Math.round(hours.reduce((a, b) => a + b, 0) / hours.length)))
        : 8

    cards.push({
      key,
      depotId,
      depotName: depot?.name ?? list[0]?.depotName ?? `Depot #${depotId}`,
      date,
      hour,
      bookedCount,
      dailyLimit,
      remaining,
      load: loadStatus(bookedCount, dailyLimit),
      scheduleIds: list.map((s) => s.id),
    })
  }

  return cards.sort((a, b) => a.depotName.localeCompare(b.depotName))
}

export default function DepotScheduleCalendar({
  schedules,
  depots,
  weekStart,
  depotFilterId,
  onWeekStartChange,
  onDepotFilterChange,
  onOpenSchedule,
  onOpenDay,
}: DepotScheduleCalendarProps) {
  const weekDates = useMemo(() => weekIsoDates(weekStart), [weekStart])
  const today = todayIsoDate()
  const cards = useMemo(
    () => buildCalendarCards(schedules, depots, weekDates, depotFilterId),
    [schedules, depots, weekDates, depotFilterId],
  )

  const cardsByCell = useMemo(() => {
    const map = new Map<string, CalendarDayCard[]>()
    for (const card of cards) {
      const cellKey = `${card.date}|${card.hour}`
      const list = map.get(cellKey)
      if (list) list.push(card)
      else map.set(cellKey, [card])
    }
    return map
  }, [cards])

  const depotColorIndex = useMemo(() => {
    const map = new Map<number, number>()
    depots.forEach((d, i) => map.set(d.id, i % DEPOT_PALETTE.length))
    return map
  }, [depots])

  const hours = useMemo(
    () => Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i),
    [],
  )

  const goToday = () => onWeekStartChange(startOfWeekMondayIso(todayIsoDate()))
  const goPrev = () => onWeekStartChange(shiftIsoDate(weekStart, -7))
  const goNext = () => onWeekStartChange(shiftIsoDate(weekStart, 7))

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
            {formatWeekRangeLabel(weekStart)}
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
            gridTemplateColumns: `64px repeat(7, minmax(0, 1fr))`,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: hexToRgba(primaryDark, 0.03),
          }}
        >
          <Box sx={{ p: 1.25 }} />
          {weekDates.map((iso) => {
            const isToday = iso === today
            return (
              <Box
                key={iso}
                sx={{
                  p: 1.25,
                  textAlign: 'center',
                  borderLeft: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    color: isToday ? primaryDark : 'text.secondary',
                    display: 'block',
                  }}
                >
                  {weekdayShort(iso)} {dayNum(iso)}
                </Typography>
                {isToday && (
                  <Box
                    sx={{
                      mx: 'auto',
                      mt: 0.5,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: '#00A3E0',
                    }}
                  />
                )}
              </Box>
            )
          })}
        </Box>

        <Box sx={{ maxHeight: { xs: 520, md: 640 }, overflow: 'auto' }}>
          {hours.map((hour) => (
            <Box
              key={hour}
              sx={{
                display: 'grid',
                gridTemplateColumns: `64px repeat(7, minmax(0, 1fr))`,
                minHeight: 72,
                borderBottom: '1px solid',
                borderColor: hexToRgba(primaryDark, 0.06),
              }}
            >
              <Box
                sx={{
                  px: 1,
                  py: 1,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {formatHourLabel(hour)}
                </Typography>
              </Box>
              {weekDates.map((iso) => {
                const cellCards = cardsByCell.get(`${iso}|${hour}`) ?? []
                return (
                  <Box
                    key={`${iso}-${hour}`}
                    sx={{
                      borderLeft: '1px solid',
                      borderColor: hexToRgba(primaryDark, 0.06),
                      p: 0.5,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                      bgcolor: iso === today ? hexToRgba('#00A3E0', 0.03) : 'transparent',
                    }}
                  >
                    {cellCards.map((card) => {
                      const palette = DEPOT_PALETTE[depotColorIndex.get(card.depotId) ?? 0]
                      const accent = loadAccent(card.load)
                      return (
                        <Box
                          key={card.key}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (card.scheduleIds.length === 1) onOpenSchedule(card.scheduleIds[0])
                            else onOpenDay(card.date, card.depotId)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              if (card.scheduleIds.length === 1) onOpenSchedule(card.scheduleIds[0])
                              else onOpenDay(card.date, card.depotId)
                            }
                          }}
                          sx={{
                            borderRadius: 1.5,
                            px: 1,
                            py: 0.75,
                            bgcolor: palette.bg,
                            border: '1px solid',
                            borderColor: palette.border,
                            borderLeft: `3px solid ${accent}`,
                            cursor: 'pointer',
                            transition: 'box-shadow 0.15s, transform 0.15s',
                            '&:hover': {
                              boxShadow: '0 2px 8px rgba(15,23,42,0.12)',
                              transform: 'translateY(-1px)',
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              color: palette.text,
                              display: 'block',
                              lineHeight: 1.2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {card.depotName}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: palette.text, opacity: 0.85, fontWeight: 600 }}
                          >
                            {card.remaining} slot{card.remaining === 1 ? '' : 's'}
                          </Typography>
                        </Box>
                      )
                    })}
                  </Box>
                )
              })}
            </Box>
          ))}
        </Box>

        {cards.length === 0 && (
          <Typography sx={{ py: 6, textAlign: 'center', color: 'text.secondary', px: 2 }}>
            No return slots scheduled this week
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
            { key: 'available', label: 'Available', color: '#2E7D32' },
            { key: 'partial', label: 'Partially booked', color: '#ED6C02' },
            { key: 'full', label: 'Fully booked', color: '#C62828' },
          ] as const
        ).map((item) => (
          <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
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
            ? { bgcolor: hexToRgba(primaryDark, 0.12), color: primaryDark, boxShadow: 'none', '&:hover': { bgcolor: hexToRgba(primaryDark, 0.18) } }
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
            ? { bgcolor: hexToRgba(primaryDark, 0.12), color: primaryDark, boxShadow: 'none', '&:hover': { bgcolor: hexToRgba(primaryDark, 0.18) } }
            : { color: 'text.secondary' }),
        }}
      >
        List view
      </Button>
    </ButtonGroup>
  )
}
