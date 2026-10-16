import { qrApi, type BookLogicteckResponse, type QrBooking, type Schedule } from '../services/api'

export type LogicteckHandoffConfig = {
  newReturnBaseUrl: string
  icsRefQueryParam: string
  pushTransferAvailable: boolean
}

let handoffConfigCache: LogicteckHandoffConfig | null = null

const BLOCKED_SCHEDULE_STATUSES = new Set(['NoShow', 'WaitingSchedule', 'Scheduled'])

export function logicteckScheduleBlockReason(schedule: Schedule | null | undefined): string | null {
  if (!schedule) return null
  if (schedule.status === 'NoShow') {
    return 'Return schedule is no show. Contact the depot for a new slot before using LOGICTECK.'
  }
  if (schedule.status === 'WaitingSchedule') {
    return 'Return schedule is not assigned yet.'
  }
  if (schedule.status === 'Scheduled') {
    return 'Complete payment in ICS before confirming on LOGICTECK.'
  }
  if (BLOCKED_SCHEDULE_STATUSES.has(schedule.status)) {
    return `Return schedule status (${schedule.status}) is not eligible for LOGICTECK.`
  }
  return null
}

export async function getLogicteckHandoffConfig(): Promise<LogicteckHandoffConfig> {
  if (handoffConfigCache) return handoffConfigCache
  const { data } = await qrApi.logicteckHandoff()
  handoffConfigCache = {
    newReturnBaseUrl: data.newReturnBaseUrl ?? '',
    icsRefQueryParam: data.icsRefQueryParam?.trim() || 'icsRef',
    pushTransferAvailable: Boolean(data.pushTransferAvailable),
  }
  return handoffConfigCache
}

export function buildLogicteckNewReturnUrl(
  baseUrl: string,
  queryParam: string,
  icsReference: string,
): string {
  const trimmed = baseUrl.trim()
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    url.searchParams.set(queryParam, icsReference.trim())
    return url.toString()
  } catch {
    const join = trimmed.includes('?') ? '&' : '?'
    return `${trimmed}${join}${queryParam}=${encodeURIComponent(icsReference.trim())}`
  }
}

/** Trucker may open LOGICTECK until gate retrieval and while return schedule is active. */
export function canOpenLogicteckConfirm(
  booking: QrBooking | null | undefined,
  schedule?: Schedule | null,
): boolean {
  if (!booking || booking.isUsed) return false
  if (logicteckScheduleBlockReason(schedule)) return false
  return true
}

/** @deprecated Use canOpenLogicteckConfirm — ICS no longer auto-books on LOGICTECK. */
export function canBookLogicteck(
  booking: QrBooking | null | undefined,
  schedule?: Schedule | null,
): boolean {
  return canOpenLogicteckConfirm(booking, schedule)
}

export async function openLogicteckNewReturn(icsReference: string): Promise<string> {
  const config = await getLogicteckHandoffConfig()
  const target = buildLogicteckNewReturnUrl(
    config.newReturnBaseUrl,
    config.icsRefQueryParam,
    icsReference,
  )
  if (!target) {
    throw new Error(
      'LOGICTECK new-return URL is not configured. Ask your administrator to set Logicteck:NewReturnUrl.',
    )
  }
  window.open(target, '_blank', 'noopener,noreferrer')
  return target
}

/** Optional push transfer when BookUrl is configured (legacy). */
export async function bookLogicteckBooking(bookingId: number): Promise<BookLogicteckResponse> {
  const { data } = await qrApi.bookLogicteck(bookingId)
  return data
}

export function applyBookLogicteckResult(
  current: QrBooking | null,
  result: BookLogicteckResponse,
): QrBooking | null {
  if (!current || !result.booking) return current
  return result.booking
}
