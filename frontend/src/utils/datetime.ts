/**
 * ICS system timezone — Philippines Standard Time (UTC+8).
 * All UI dates/times and calendar logic must go through this module.
 */
export const SYSTEM_TIMEZONE = {
  id: 'Asia/Manila',
  locale: 'en-PH',
  utcOffset: '+08:00',
  label: 'PHT',
  labelLong: 'Philippines Time (UTC+8)',
} as const

/** @deprecated Use SYSTEM_TIMEZONE.id */
export const PH_TIMEZONE = SYSTEM_TIMEZONE.id
/** @deprecated Use SYSTEM_TIMEZONE.locale */
export const PH_LOCALE = SYSTEM_TIMEZONE.locale
/** @deprecated Use SYSTEM_TIMEZONE.utcOffset */
export const PH_UTC_OFFSET = SYSTEM_TIMEZONE.utcOffset

const dateTimeFormatter = new Intl.DateTimeFormat(SYSTEM_TIMEZONE.locale, {
  timeZone: SYSTEM_TIMEZONE.id,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const dateFormatter = new Intl.DateTimeFormat(SYSTEM_TIMEZONE.locale, {
  timeZone: SYSTEM_TIMEZONE.id,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat(SYSTEM_TIMEZONE.locale, {
  timeZone: SYSTEM_TIMEZONE.id,
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
})

const longDateFormatter = new Intl.DateTimeFormat(SYSTEM_TIMEZONE.locale, {
  timeZone: SYSTEM_TIMEZONE.id,
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const scheduleDateFormatter = new Intl.DateTimeFormat(SYSTEM_TIMEZONE.locale, {
  timeZone: SYSTEM_TIMEZONE.id,
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const pesoFormatter = new Intl.NumberFormat(SYSTEM_TIMEZONE.locale, {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value
}

function calendarDate(value: string): Date {
  return new Date(`${value}T12:00:00${SYSTEM_TIMEZONE.utcOffset}`)
}

/** Strip browser timezone abbreviations (e.g. GMT+8) so we can apply our system label. */
function stripIntlTimezoneSuffix(value: string): string {
  return value.replace(/\s*(GMT|UTC)[+-]\d{1,2}(:\d{2})?\s*$/i, '').trimEnd()
}

/** Format UTC ISO timestamp for display in Philippines time (PHT / UTC+8). */
export function formatDateTime(value: string | Date): string {
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${dateTimeFormatter.format(d)} ${SYSTEM_TIMEZONE.label}`
}

/** Date portion only in system timezone. */
export function formatDate(value: string | Date): string {
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return '—'
  return dateFormatter.format(d)
}

/** Time portion only in system timezone. */
export function formatTime(value: string | Date): string {
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${stripIntlTimezoneSuffix(timeFormatter.format(d))} ${SYSTEM_TIMEZONE.label}`
}

/** Format API TimeOnly string (HH:mm:ss) — always zero-padded 24-hour (HH:mm). */
export function formatScheduleTime(time: string): string {
  if (!time) return '—'
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim())
  if (!match) return time
  const h = Number(match[1])
  const m = Number(match[2])
  if (h < 0 || h > 23 || m < 0 || m > 59) return time
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Normalize user-entered HH:mm to zero-padded 24-hour form. */
export function normalizeTime24Input(value: string): string {
  const trimmed = value.trim()
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (!match) return trimmed
  const h = Number(match[1])
  const m = Number(match[2])
  if (h < 0 || h > 23 || m < 0 || m > 59) return trimmed
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function isValidTime24(value: string): boolean {
  const normalized = normalizeTime24Input(value)
  if (!/^\d{2}:\d{2}$/.test(normalized)) return false
  const [h, m] = normalized.split(':').map(Number)
  return h >= 0 && h <= 23 && m >= 0 && m <= 59
}

/** Full 24-hour day — 00:00 through 23:30, 30-minute steps. */
const DEPOT_SCHEDULE_START_HOUR = 0
const DEPOT_SCHEDULE_END_HOUR = 23
const DEPOT_SCHEDULE_END_MINUTE = 30
const DEPOT_SCHEDULE_INTERVAL_MINUTES = 30

function buildScheduleTimeOptions(
  startHour: number,
  endHour: number,
  endMinute: number,
  intervalMinutes: number,
): string[] {
  const options: string[] = []
  const endMinutes = endHour * 60 + endMinute
  for (let minutes = startHour * 60; minutes <= endMinutes; minutes += intervalMinutes) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return options
}

const BASE_DEPOT_SCHEDULE_TIME_OPTIONS = buildScheduleTimeOptions(
  DEPOT_SCHEDULE_START_HOUR,
  DEPOT_SCHEDULE_END_HOUR,
  DEPOT_SCHEDULE_END_MINUTE,
  DEPOT_SCHEDULE_INTERVAL_MINUTES,
)

/** Dropdown values for depot schedule assignment; keeps legacy times already saved on a schedule. */
export function getDepotScheduleTimeOptions(existingTime?: string | null): string[] {
  const normalized = existingTime ? normalizeTime24Input(formatScheduleTime(existingTime)) : ''
  if (!normalized || !isValidTime24(normalized) || BASE_DEPOT_SCHEDULE_TIME_OPTIONS.includes(normalized)) {
    return BASE_DEPOT_SCHEDULE_TIME_OPTIONS
  }
  return [...BASE_DEPOT_SCHEDULE_TIME_OPTIONS, normalized].sort((a, b) => a.localeCompare(b))
}

/** Format calendar date (YYYY-MM-DD) for display. */
export function formatScheduleDate(dateStr: string): string {
  if (!dateStr) return '—'
  return scheduleDateFormatter.format(calendarDate(dateStr))
}

/** Combined return slot label: date · time PHT */
export function formatScheduleSlot(date: string, time?: string | null): string {
  const datePart = formatScheduleDate(date)
  if (!time) return datePart
  return `${datePart} · ${formatScheduleTime(time)} ${SYSTEM_TIMEZONE.label}`
}

/** YYYY-MM-DD for the given instant in system timezone. */
export function isoDateInTimezone(d: Date = new Date(), timeZone = SYSTEM_TIMEZONE.id): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

export function todayIsoDate(): string {
  return isoDateInTimezone(new Date())
}

export function currentPhYear(): number {
  return Number(todayIsoDate().slice(0, 4))
}

export function shiftIsoDate(dateStr: string, days: number): string {
  const d = calendarDate(dateStr)
  d.setDate(d.getDate() + days)
  return isoDateInTimezone(d)
}

/** Long weekday label for a calendar date (YYYY-MM-DD). */
export function formatDisplayDate(dateStr: string): string {
  return longDateFormatter.format(calendarDate(dateStr))
}

export function parsePhStartOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00${SYSTEM_TIMEZONE.utcOffset}`)
}

export function parsePhEndOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999${SYSTEM_TIMEZONE.utcOffset}`)
}

export function defaultReportFromDate(): string {
  return shiftIsoDate(todayIsoDate(), -30)
}

/** True when calendar date (YYYY-MM-DD) is before today in system timezone. */
export function isBeforeToday(dateStr: string): boolean {
  return Boolean(dateStr) && dateStr < todayIsoDate()
}

/** Clamp calendar date to today or later (for schedule assignment). */
export function clampMinScheduleDate(dateStr: string, minDate = todayIsoDate()): string {
  if (!dateStr || dateStr < minDate) return minDate
  return dateStr
}

/** PHP amounts using en-PH locale. */
export function formatPeso(amount: number): string {
  return pesoFormatter.format(amount)
}
