import { todayIsoDate } from './datetime'

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
}

/** Normalize CRO / API free-time strings (yyyy-MM-dd or dd-MMM-yyyy) to ISO date. */
export function parseCroFreeTimeToIso(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const raw = value.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  const mmm = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(raw)
  if (mmm) {
    const day = Number(mmm[1])
    const month = MONTHS[mmm[2].toLowerCase()]
    const year = Number(mmm[3])
    if (!month || day < 1 || day > 31) return null
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return null
}

/** True when CRO free demurrage date is before today (Philippines calendar). */
export function isCroFreeTimeExpired(value: string | null | undefined): boolean {
  const iso = parseCroFreeTimeToIso(value)
  return Boolean(iso && iso < todayIsoDate())
}

export function croFreeTimeExpiredMessage(freeUntil: string | null | undefined): string {
  const iso = parseCroFreeTimeToIso(freeUntil)
  const when = iso ?? freeUntil ?? 'the free-time date'
  return `Free demurrage time expired on ${when}. You can still save a draft, but demurrage and detention charges must be settled before you submit this pre-forecast.`
}
