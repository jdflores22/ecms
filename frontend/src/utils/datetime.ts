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

/** Format API TimeOnly string (HH:mm:ss) — depot local schedule time. */
export function formatScheduleTime(time: string): string {
  if (!time) return '—'
  return time.length >= 5 ? time.slice(0, 5) : time
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
