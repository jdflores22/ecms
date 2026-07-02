export type StatusClock = {
  hour: number
  minute: number
  meridiem: string
}

export type CalendarParts = {
  year: number
  month: number
  day: number
}

export function normalizeMeridiem(value: string): string {
  const upper = value.toUpperCase()
  if (upper === 'EM' || upper === 'PN' || upper === 'PM') return 'PM'
  if (upper === 'AM') return 'AM'
  return value
}

export function applyMeridiem(hour: number, meridiem: string): number {
  const mer = normalizeMeridiem(meridiem)
  if (mer === 'PM' && hour < 12) return hour + 12
  if (mer === 'AM' && hour === 12) return 0
  return hour
}

export function buildPhilippinesIsoFromParts(parts: {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second?: number
}): string | null {
  const second = parts.second ?? 0
  const parsed = new Date(
    `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}:${String(second).padStart(2, '0')}+08:00`,
  )
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export function manilaCalendarParts(iso: string): CalendarParts | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '01'
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
  }
}

export function combineCalendarWithClock(
  calendar: CalendarParts,
  clock: StatusClock,
): string | null {
  const hour = applyMeridiem(clock.hour, clock.meridiem)
  return buildPhilippinesIsoFromParts({
    year: calendar.year,
    month: calendar.month,
    day: calendar.day,
    hour,
    minute: clock.minute,
  })
}
