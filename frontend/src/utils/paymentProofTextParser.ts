import {
  normalizePaymentProofProvider,
  type PaymentProofProvider,
} from '../config/paymentProofProviders'
import {
  combineCalendarWithClock,
  manilaCalendarParts,
  type CalendarParts,
  type StatusClock,
} from './paymentProofDateParts'
import { parseStatusClockFromText } from './paymentProofStatusClock'

export type { PaymentProofProvider }

export type PaymentProofMetadata = {
  referenceNo: string | null
  paymentId: string | null
  qrphInvoiceNo: string | null
  transactionAt: string | null
  provider: PaymentProofProvider | null
}

export type PaymentProofExtractionHints = {
  paidAt?: string | null
  amount?: number | null
}

export type TransactionDateEvidence = {
  paidAt?: string | null
  statusClock?: StatusClock | null
  exifAt?: string | null
}

/** Ordered — first match wins. Tight captures to avoid OCR label bleed (e.g. UnionBank header). */
const PAYMENT_ID_PATTERNS: RegExp[] = [
  /Payment\s+ID\s*[:.]?\s*((?:[0-9A-Fa-f]{4}\s*){2,3}[0-9A-Fa-f]{4})\b/i,
  /Payment\s+ID\s*[:.]?\s*([0-9A-Fa-f]{10,16})\b/i,
]

const REFERENCE_PATTERNS: RegExp[] = [
  /(?:Reference\s+Number|Referencenumber)\s*(?:Transaction\s+Date|Transactiondate)?\s*(UB\d{4,12})\b/i,
  /(UB\d{4,12})/i,
  /Reference\s+ID\s*[:.]?\s*((?:[0-9A-Fa-f]{4}\s*){2,3}[0-9A-Fa-f]{4})\b/i,
  /Reference\s+Number\s*[:.]?\s*(\d{6,12})\b/i,
  /(?:Ref(?:erence)?\.?\s*No\.?)\s*[:.]?\s*(\d{6,12})\b/i,
  /Ref\.?\s*No\.?\s+(\d{6,12})\b/i,
  /\b(\d{4}\s+\d{3}\s+\d{6})\b/,
  /\b(\d{3}\s+\d{3}\s+\d{3})\b/,
]

const QRPH_INVOICE_PATTERNS: RegExp[] = [
  /QR\s*Ph?\s*Invoice\s*No\.?\s*[:.]?\s*(\d{4,12})/i,
  /QRPH\s*Invoice\s*No\.?\s*[:.]?\s*(\d{4,12})/i,
  /Invoice\s*No\.?\s*[:.]?\s*(\d{4,8})\b/i,
  /(?:QR\s*Ph?|QRPH)[^\d]{0,24}(\d{6})\b/i,
]

const DATE_PATTERNS: RegExp[] = [
  /\bDate\b\s*[:.]?\s*((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[^\n]{6,40})/i,
  /((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|eM|pM|pn))/i,
  /((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm|eM|pM|pn))/i,
  /\b(\d{2}-\d{2}-\d{2}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM|eM|pM))\b/i,
  /\b(\d{1,2}[/.-]\d{1,2}[/.-]20\d{2}\s+\d{1,2}\s*:\s*\d{2}\s*(?:AM|PM|am|pm|eM|pM|pn))/i,
  /\b(20\d{2}[/.-]\d{1,2}[/.-]\d{1,2}\s+\d{1,2}\s*:\s*\d{2}\s*(?:AM|PM|am|pm|eM|pM|pn))/i,
]

const MONTH_TOKEN =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'

function fixOcrDateText(text: string): string {
  return text
    .replace(/\b(?:D|0)ate\b/gi, 'Date')
    .replace(/\blun\b/gi, 'Jun')
    .replace(/\biun\b/gi, 'Jun')
    .replace(/\b0un\b/gi, 'Jun')
    .replace(/\b3un\b/gi, 'Jun')
    .replace(/\bJnn\b/gi, 'Jun')
    .replace(/\bJu\s*n\b/gi, 'Jun')
    .replace(/\bMav\b/gi, 'May')
    .replace(/\bFe6\b/gi, 'Feb')
    .replace(/\bJu1\b/g, 'Jul')
    .replace(/\bJui\b/g, 'Jul')
    .replace(/\bAua\b/gi, 'Aug')
    .replace(/\bSeo\b/gi, 'Sep')
    .replace(/(\d)\s*[oO]\s*(\d)/g, '$1:$2')
    .replace(/(20)\s*[oO]\s*(\d{2})/g, '$1$2')
    .replace(/\b(\d{1,2})\s*:\s*(\d{2})\s*eM\b/gi, '$1:$2 PM')
    .replace(/\b(\d{1,2})\s*:\s*(\d{2})\s*pn\b/gi, '$1:$2 PM')
    .replace(/\b(\d{1,2})\s*:\s*(\d{2})\s*pM\b/g, '$1:$2 PM')
    .replace(/\b(\d{1,2})\s*:\s*(\d{2})\s*aM\b/g, '$1:$2 AM')
    .replace(/\b(\d{1,2})\s+(\d{2})\s*(AM|PM|am|pm|eM|pM|pn)\b/g, '$1:$2 $3')
    .replace(/\b(10)\s*(05)\s*(PM|eM|pM|pn)\b/gi, '$1:$2 $3')
    .replace(/(\d{1,2}),?\s*(20\d{2})\s+(\d{1,2})\s*:\s*(\d{2})/g, '$1, $2 $3:$4')
}

function normalizeMeridiem(value: string): string {
  const upper = value.toUpperCase()
  if (upper === 'EM' || upper === 'PN' || upper === 'PM') return 'PM'
  if (upper === 'AM') return 'AM'
  return value
}

function buildPhilippinesIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): string | null {
  const parsed = new Date(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}+08:00`,
  )
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function applyMeridiem(hour: number, meridiem: string): number {
  const mer = normalizeMeridiem(meridiem)
  if (mer === 'PM' && hour < 12) return hour + 12
  if (mer === 'AM' && hour === 12) return 0
  return hour
}

function monthNameToNumber(month: string): number | null {
  const key = month.slice(0, 3).toLowerCase()
  const map: Record<string, number> = {
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
  return map[key] ?? null
}

const E_WALLET_PREFERENCE: PaymentProofProvider[] = ['maya', 'gcash', 'grabpay', 'unionbank', 'bancnet']

function emptyProviderScores(): Record<PaymentProofProvider, number> {
  return { gcash: 0, maya: 0, unionbank: 0, bancnet: 0, grabpay: 0, unknown: 0 }
}

/** Weighted signals — e-wallet receipt layout beats merchant settlement bank name. */
export function scorePaymentProofProviders(text: string): Record<PaymentProofProvider, number> {
  const t = preprocessOcrText(text)
  const scores = emptyProviderScores()

  if (/\bmaya\b/i.test(t)) scores.maya += 12
  if (/paymaya/i.test(t)) scores.maya += 12
  if (/purchased\s+from/i.test(t)) scores.maya += 10
  if (/reference\s+id/i.test(t)) scores.maya += 9
  if (/payment\s+id/i.test(t)) scores.maya += 7
  if (/merchant\s+id/i.test(t)) scores.maya += 5
  if (/paid\s+using\s+qr/i.test(t)) scores.maya += 6
  if (/qr\s*ph\s+invoice\s+no/i.test(t)) scores.maya += 4

  if (/gcash/i.test(t)) scores.gcash += 12
  if (/paid\s+via\s+gcash/i.test(t)) scores.gcash += 10
  if (/sent\s+via\s+gcash/i.test(t)) scores.gcash += 10
  if (/successful\s+payment\s+via\s+qr/i.test(t)) scores.gcash += 6
  if (/your\s+payment\s+was\s+successfully\s+processed/i.test(t)) scores.gcash += 5
  if (/\bpayment\b/i.test(t) && /transnetsoftwaredevelop/i.test(t)) scores.gcash += 8
  if (/\bqrph\b/i.test(t) && /invoice/i.test(t)) scores.gcash += 4

  if (/grab\s*pay/i.test(t)) scores.grabpay += 12
  if (/paid\s+(?:via|using|with)\s+grab/i.test(t)) scores.grabpay += 10

  if (/transaction\s+details/i.test(t)) scores.unionbank += 5
  if (/reference\s+number\s+ub\d/i.test(t)) scores.unionbank += 15
  if (/p2m\s+on\s+us/i.test(t)) scores.unionbank += 8
  if (/transfer\s+to\s+another\s+unionbank/i.test(t)) scores.unionbank += 10
  if (/from\s+account/i.test(t) && /to\s+account/i.test(t)) scores.unionbank += 6

  if (/bancnet/i.test(t)) scores.bancnet += 10
  if (/payment\s+to\s+bancnet/i.test(t)) scores.bancnet += 8
  if (/p2m\s+send/i.test(t)) scores.bancnet += 10

  const ewalletStrong = scores.maya >= 9 || scores.gcash >= 10 || scores.grabpay >= 10
  if (/bank\s+name/i.test(t) && /union\s*bank/i.test(t)) {
    if (!ewalletStrong) scores.unionbank += 3
  } else if (/union\s*bank/i.test(t) && !ewalletStrong) {
    scores.unionbank += 2
  }

  return scores
}

function winnerFromProviderScores(
  scores: Record<PaymentProofProvider, number>,
): PaymentProofProvider | null {
  const ranked = (Object.entries(scores) as [PaymentProofProvider, number][])
    .filter(([id]) => id !== 'unknown')
    .sort((a, b) => b[1] - a[1])

  if (!ranked.length || ranked[0][1] < 5) return null

  const top = ranked[0][1]
  const tied = ranked.filter(([, score]) => score === top).map(([id]) => id)
  if (tied.length === 1) return tied[0]

  for (const id of E_WALLET_PREFERENCE) {
    if (tied.includes(id)) return id
  }
  return tied[0]
}

export function normalizeProofReferenceNo(value?: string | null): string | null {
  if (!value) return null
  const raw = value.trim()

  const ubDirect = raw.match(/(UB\d{4,12})/i)
  if (ubDirect) return ubDirect[1].toUpperCase()

  let normalized = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')

  const ubEmbedded = normalized.match(/UB\d{4,12}/)
  if (ubEmbedded) return ubEmbedded[0]

  normalized = normalized
    .replace(/^(?:REFERENCENUMBER|TRANSACTIONDATE|REFERENCENO)+/i, '')
    .replace(/(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{2,}$/i, '')

  if (normalized.length < 6) return null
  return normalized.slice(0, 64)
}

export function normalizeProofPaymentId(value?: string | null): string | null {
  if (!value) return null
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (normalized.length < 10 || normalized.length > 16) return null
  if (!/^[0-9A-F]+$/.test(normalized)) return null
  return normalized
}

export function formatProofPaymentId(value?: string | null): string {
  if (!value) return '—'
  const raw = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (/^[0-9A-F]{12}$/.test(raw)) {
    return `${raw.slice(0, 4)} ${raw.slice(4, 8)} ${raw.slice(8)}`
  }
  return raw || value
}

export function normalizeProofQrphInvoiceNo(value?: string | null): string | null {
  if (!value) return null
  let digits = value.replace(/\D/g, '')
  if (digits.length === 7 && digits.endsWith('0')) {
    digits = digits.slice(0, 6)
  }
  if (digits.length < 4 || digits.length > 12) return null
  return digits
}

export function formatProofReferenceNo(value?: string | null): string {
  if (!value) return '—'
  const raw = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (/^\d{12}$/.test(raw)) {
    return `${raw.slice(0, 4)} ${raw.slice(4, 7)} ${raw.slice(7)}`
  }
  if (/^[0-9A-F]{12}$/.test(raw)) {
    return `${raw.slice(0, 4)} ${raw.slice(4, 8)} ${raw.slice(8)}`
  }
  return raw || value
}

function preprocessOcrText(text: string): string {
  let normalized = text.replace(/[ \t]+/g, ' ')
  normalized = normalized.replace(/(\d)(AM|PM)\b/gi, '$1 $2')
  return normalized
}

function isGcashPaymentScreenContext(text: string): boolean {
  const scores = scorePaymentProofProviders(text)
  return (
    scores.gcash >= 8 ||
    (/\bpayment\b/i.test(text) && /transnetsoftwaredevelop/i.test(text)) ||
    /paid\s+via\s+gcash/i.test(text)
  )
}

/** GCash QR receipts often use 9-digit refs and 6-digit QRPH invoice numbers. */
function extractGcashNumericFallback(
  text: string,
): { referenceNo: string | null; qrphInvoiceNo: string | null } {
  if (!isGcashPaymentScreenContext(text)) {
    return { referenceNo: null, qrphInvoiceNo: null }
  }

  const nineDigitRefs = [...text.matchAll(/(?:^|[^\d])(\d{9})(?:[^\d]|$)/gm)].map((m) => m[1])
  const sixDigitInvoices = [...text.matchAll(/(?:^|[^\d])(\d{6,7})(?:[^\d]|$)/gm)].map((m) => m[1])

  const referenceNo =
    nineDigitRefs.find((digits) => normalizeProofReferenceNo(digits)) ??
    nineDigitRefs[0] ??
    null

  const refDigits = referenceNo?.replace(/\D/g, '') ?? ''
  const qrphInvoiceNo =
    sixDigitInvoices.find((digits) => {
      if (refDigits && refDigits.includes(digits)) return false
      return normalizeProofQrphInvoiceNo(digits) !== null
    }) ?? null

  return {
    referenceNo: referenceNo ? normalizeProofReferenceNo(referenceNo) : null,
    qrphInvoiceNo: qrphInvoiceNo ? normalizeProofQrphInvoiceNo(qrphInvoiceNo) : null,
  }
}

function extractPaymentId(text: string): string | null {
  for (const pattern of PAYMENT_ID_PATTERNS) {
    const match = text.match(pattern)
    if (match?.[1]) {
      const normalized = normalizeProofPaymentId(match[1])
      if (normalized) return normalized
    }
  }
  return null
}

function extractReferenceNo(text: string): string | null {
  for (const pattern of REFERENCE_PATTERNS) {
    const match = text.match(pattern)
    if (match?.[1]) {
      const normalized = normalizeProofReferenceNo(match[1])
      if (normalized) return normalized
    }
  }
  return extractGcashNumericFallback(text).referenceNo
}

function extractQrphInvoiceNo(text: string): string | null {
  for (const pattern of QRPH_INVOICE_PATTERNS) {
    const match = text.match(pattern)
    if (match?.[1]) {
      const normalized = normalizeProofQrphInvoiceNo(match[1])
      if (normalized) return normalized
    }
  }
  return extractGcashNumericFallback(text).qrphInvoiceNo
}

function parseMonthDateTime(raw: string): string | null {
  const cleaned = fixOcrDateText(raw.trim())
    .replace(/\s+/g, ' ')
    .replace(/,\s*(?=\d{1,2}:)/, ' ')
    .replace(/(\d)(AM|PM|eM|pM|pn)\b/gi, (_, d, mer) => `${d} ${normalizeMeridiem(mer)}`)
  const parsed = new Date(`${cleaned} GMT+0800`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function findMonthNearIndex(text: string, index: number): number | null {
  const window = text.slice(Math.max(0, index - 48), index + 12)
  const match = window.match(
    new RegExp(`\\b(${MONTH_TOKEN})\\b`, 'i'),
  )
  return match ? monthNameToNumber(match[1]) : null
}

function parseSlashDateTime(raw: string): string | null {
  const cleaned = fixOcrDateText(raw.trim())
  const dmy = cleaned.match(
    /^(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\s+(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM|am|pm|eM|pM|pn)/i,
  )
  if (dmy) {
    const day = Number(dmy[1])
    const month = Number(dmy[2])
    const year = Number(dmy[3])
    const hour = applyMeridiem(Number(dmy[4]), dmy[6])
    const minute = Number(dmy[5])
    return buildPhilippinesIso(year, month, day, hour, minute)
  }

  const ymd = cleaned.match(
    /^(20\d{2})[/.-](\d{1,2})[/.-](\d{1,2})\s+(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM|am|pm|eM|pM|pn)/i,
  )
  if (ymd) {
    const year = Number(ymd[1])
    const month = Number(ymd[2])
    const day = Number(ymd[3])
    const hour = applyMeridiem(Number(ymd[4]), ymd[6])
    const minute = Number(ymd[5])
    return buildPhilippinesIso(year, month, day, hour, minute)
  }

  return null
}

function extractStatusBarTime(text: string): StatusClock | null {
  return parseStatusClockFromText(text)
}

function extractPartialCalendarDate(text: string): CalendarParts | null {
  const fixed = fixOcrDateText(preprocessOcrText(text))

  const monthMatch = fixed.match(
    new RegExp(`\\b(${MONTH_TOKEN})\\b\\.?\\s+(\\d{1,2}),?\\s+(20\\d{2})`, 'i'),
  )
  if (monthMatch) {
    const month = monthNameToNumber(monthMatch[1])
    const day = Number(monthMatch[2])
    const year = Number(monthMatch[3])
    if (month && day && year) return { year, month, day }
  }

  const dayYearMatch =
    fixed.match(/\b(\d{1,2})\s*,\s*(20[2-9]\d)\b/) ??
    fixed.match(/\b(\d{1,2})\s+(20[2-9]\d)\b/)
  if (dayYearMatch) {
    const day = Number(dayYearMatch[1])
    const year = Number(dayYearMatch[2])
    const month = findMonthNearIndex(fixed, dayYearMatch.index ?? 0)
    if (month && day && year) return { year, month, day }
  }

  const slashDate = fixed.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b/)
  if (slashDate) {
    return {
      year: Number(slashDate[3]),
      month: Number(slashDate[2]),
      day: Number(slashDate[1]),
    }
  }

  return null
}

export function resolveTransactionAt(
  meta: PaymentProofMetadata,
  texts: string[],
  evidence?: TransactionDateEvidence,
): string | null {
  if (meta.transactionAt) return meta.transactionAt

  const merged = texts.filter(Boolean).join('\n')
  const fromOcr =
    extractTransactionAt(merged) ?? extractTransactionAtFromFragments(merged)
  if (fromOcr) return fromOcr

  const hasProofIds = Boolean(meta.referenceNo || meta.paymentId || meta.qrphInvoiceNo)
  const statusClock = evidence?.statusClock ?? extractStatusBarTime(merged)
  const partialCalendar = extractPartialCalendarDate(merged)

  if (hasProofIds) {
    if (statusClock && partialCalendar) {
      const combined = combineCalendarWithClock(partialCalendar, statusClock)
      if (combined) return combined
    }

    if (statusClock && evidence?.exifAt) {
      const calendar = manilaCalendarParts(evidence.exifAt)
      if (calendar) {
        const combined = combineCalendarWithClock(calendar, statusClock)
        if (combined) return combined
      }
    }

    if (evidence?.exifAt) {
      const exif = new Date(evidence.exifAt)
      if (!Number.isNaN(exif.getTime())) return exif.toISOString()
    }

    if (statusClock && evidence?.paidAt) {
      const combined = combinePaidAtWithStatusBarTime(evidence.paidAt, statusClock)
      if (combined) return combined
    }
  }

  return resolveReceiptDateFallback(meta, evidence?.paidAt)
}

/** Use payment receipt upload time when OCR cannot read the printed transaction date. */
export function resolveReceiptDateFallback(
  meta: Pick<PaymentProofMetadata, 'referenceNo' | 'paymentId' | 'qrphInvoiceNo' | 'transactionAt' | 'provider'>,
  paidAt: string | null | undefined,
): string | null {
  if (meta.transactionAt) return meta.transactionAt
  if (!paidAt) return null

  const hasEvidence = Boolean(
    meta.referenceNo ||
      meta.paymentId ||
      meta.qrphInvoiceNo ||
      (meta.provider && meta.provider !== 'unknown'),
  )
  if (!hasEvidence) return null

  const paid = new Date(paidAt)
  if (Number.isNaN(paid.getTime())) return null
  return paid.toISOString()
}

function combinePaidAtWithStatusBarTime(paidAt: string, statusBar: { hour: number; minute: number; meridiem: string }): string | null {
  const paid = new Date(paidAt)
  if (Number.isNaN(paid.getTime())) return null

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(paid)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '01'
  const year = Number(get('year'))
  const month = Number(get('month'))
  const day = Number(get('day'))
  const hour = applyMeridiem(statusBar.hour, statusBar.meridiem)
  return buildPhilippinesIso(year, month, day, hour, statusBar.minute)
}

export function applyPaymentProofExtractionHints(
  meta: PaymentProofMetadata,
  texts: string[],
  hints?: PaymentProofExtractionHints,
  evidence?: TransactionDateEvidence,
): PaymentProofMetadata {
  const resolved = resolveTransactionAt(meta, texts, {
    paidAt: hints?.paidAt,
    statusClock: evidence?.statusClock,
    exifAt: evidence?.exifAt,
  })
  if (!resolved) return meta
  return { ...meta, transactionAt: resolved }
}

function extractTransactionAtFromFragments(text: string): string | null {
  const fixed = fixOcrDateText(text)

  const combined = fixed.match(
    new RegExp(
      `\\b(${MONTH_TOKEN})\\b\\.?\\s+(\\d{1,2}),?\\s+(20\\d{2})\\s+\\d{1,2}\\s*:\\s*\\d{2}`,
      'i',
    ),
  )
  if (combined) {
    const parsed = parseMonthDateTime(combined[0])
    if (parsed) return parsed
  }

  const monthMatch = fixed.match(
    new RegExp(`\\b(${MONTH_TOKEN})\\b\\.?\\s+(\\d{1,2}),?\\s+(20\\d{2})`, 'i'),
  )
  const timeMatch = fixed.match(/\b(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM|am|pm|eM|pM|pn)\b/i)
  if (monthMatch && timeMatch) {
    const month = monthNameToNumber(monthMatch[1])
    const day = Number(monthMatch[2])
    const year = Number(monthMatch[3])
    let hour = applyMeridiem(Number(timeMatch[1]), timeMatch[3])
    const minute = Number(timeMatch[2])
    if (month && day && year) {
      return buildPhilippinesIso(year, month, day, hour, minute)
    }
  }

  if (monthMatch && !timeMatch) {
    const statusBar = extractStatusBarTime(fixed)
    if (statusBar) {
      const month = monthNameToNumber(monthMatch[1])
      const day = Number(monthMatch[2])
      const year = Number(monthMatch[3])
      if (month && day && year) {
        const hour = applyMeridiem(statusBar.hour, statusBar.meridiem)
        return buildPhilippinesIso(year, month, day, hour, statusBar.minute)
      }
    }
  }

  const dayYearMatch = fixed.match(/\b(\d{1,2})\s*,\s*(20[2-9]\d)\b/)
  const dayYearSpaced = fixed.match(/\b(\d{1,2})\s+(20[2-9]\d)\b/)
  const activeDayYear = dayYearMatch ?? dayYearSpaced
  if (activeDayYear && timeMatch) {
    const day = Number(activeDayYear[1])
    const year = Number(activeDayYear[2])
    const month =
      findMonthNearIndex(fixed, activeDayYear.index ?? 0) ??
      (monthMatch ? monthNameToNumber(monthMatch[1]) : null)
    let hour = applyMeridiem(Number(timeMatch[1]), timeMatch[3])
    const minute = Number(timeMatch[2])
    if (month && day && year) {
      return buildPhilippinesIso(year, month, day, hour, minute)
    }
  }

  const statusBar = extractStatusBarTime(fixed)
  if (statusBar && monthMatch) {
    const month = monthNameToNumber(monthMatch[1])
    const day = Number(monthMatch[2])
    const year = Number(monthMatch[3])
    if (month && day && year) {
      const hour = applyMeridiem(statusBar.hour, statusBar.meridiem)
      return buildPhilippinesIso(year, month, day, hour, statusBar.minute)
    }
  }

  return null
}

function extractTransactionAt(text: string): string | null {
  const fixed = fixOcrDateText(preprocessOcrText(text))
  for (const pattern of DATE_PATTERNS) {
    const match = fixed.match(pattern)
    if (!match?.[1]) continue
    const value = match[1]
    if (/\d{2}-\d{2}-\d{2}/.test(value)) {
      const short = parseShortPhilippinesDateTime(value)
      if (short) return short
    } else if (/[/.-]/.test(value) && /\d{4}/.test(value)) {
      const slash = parseSlashDateTime(value)
      if (slash) return slash
    } else {
      const monthDate = parseMonthDateTime(value)
      if (monthDate) return monthDate
    }
  }
  return extractTransactionAtFromFragments(fixed)
}

function parseShortPhilippinesDateTime(raw: string): string | null {
  const match = raw
    .trim()
    .match(/^(\d{2})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null

  const month = Number(match[1])
  const day = Number(match[2])
  const year = 2000 + Number(match[3])
  let hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const meridiem = match[7].toUpperCase()

  if (meridiem === 'PM' && hour < 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0

  return buildPhilippinesIso(year, month, day, hour, minute, second)
}

export function detectPaymentProofProvider(text: string): PaymentProofProvider {
  const winner = winnerFromProviderScores(scorePaymentProofProviders(text))
  return winner ?? 'unknown'
}

export function parsePaymentProofText(text: string): PaymentProofMetadata {
  const normalized = preprocessOcrText(text)
  return {
    referenceNo: extractReferenceNo(normalized),
    paymentId: extractPaymentId(normalized),
    qrphInvoiceNo: extractQrphInvoiceNo(normalized),
    transactionAt: extractTransactionAt(normalized),
    provider: detectPaymentProofProvider(normalized),
  }
}

type ScoredValue<T> = { value: T; score: number }

function pickBestScored<T>(items: ScoredValue<T>[]): T | null {
  if (!items.length) return null
  return items.sort((a, b) => b.score - a.score)[0]?.value ?? null
}

function scoreReference(value: string, text: string, passWeight: number): number {
  let score = passWeight
  const digits = value.replace(/\D/g, '')
  if (/ref(?:erence)?\.?\s*no/i.test(text)) score += 14
  if (/reference\s+number/i.test(text)) score += 12
  if (/^UB\d+/i.test(value)) score += 16
  if (digits.length === 9) score += 4
  if (digits.length >= 6 && digits.length <= 12) score += 2
  return score
}

function scorePaymentId(value: string, text: string, passWeight: number): number {
  let score = passWeight
  if (/payment\s+id/i.test(text)) score += 16
  if (value.length >= 10 && value.length <= 16) score += 4
  return score
}

function scoreQrph(value: string, text: string, passWeight: number): number {
  let score = passWeight
  if (/qr\s*ph?\s*invoice/i.test(text)) score += 14
  if (value.length === 6) score += 5
  if (value.length >= 4 && value.length <= 8) score += 2
  return score
}

function scoreTransactionAt(iso: string, text: string, passWeight: number): number {
  let score = passWeight
  if (/\bdate\b/i.test(text)) score += 12
  if (/transaction\s+date/i.test(text)) score += 8
  if (/\bdate\b/i.test(text) && /reference\s+no/i.test(text)) score += 10
  if (/\btotal\b/i.test(text) && /\bdate\b/i.test(text)) score += 8
  const year = new Date(iso).getFullYear()
  const nowYear = new Date().getFullYear()
  if (year >= nowYear - 1 && year <= nowYear + 1) score += 4
  return score
}

function scoreProvider(provider: PaymentProofProvider, text: string, passWeight: number): number {
  if (provider === 'unknown') return 0
  const scores = scorePaymentProofProviders(text)
  return passWeight + (scores[provider] ?? 0)
}

export function parsePaymentProofTexts(
  texts: string[],
  passWeights?: number[],
): PaymentProofMetadata {
  const merged = texts.filter(Boolean).join('\n')
  const sources = [...texts, merged]
  const weights = [
    ...(passWeights ?? texts.map((_, index) => (index === 0 ? 6 : 4))),
    Math.max(...(passWeights ?? [6]), 7),
  ]

  const referenceCandidates: ScoredValue<string>[] = []
  const paymentIdCandidates: ScoredValue<string>[] = []
  const qrphCandidates: ScoredValue<string>[] = []
  const dateCandidates: ScoredValue<string>[] = []
  const providerCandidates: ScoredValue<PaymentProofProvider>[] = []

  sources.forEach((text, index) => {
    const weight = weights[index] ?? 4
    const normalized = preprocessOcrText(text)
    const parsed = parsePaymentProofText(text)

    if (parsed.referenceNo) {
      referenceCandidates.push({
        value: parsed.referenceNo,
        score: scoreReference(parsed.referenceNo, normalized, weight),
      })
    }
    if (parsed.paymentId) {
      paymentIdCandidates.push({
        value: parsed.paymentId,
        score: scorePaymentId(parsed.paymentId, normalized, weight),
      })
    }
    if (parsed.qrphInvoiceNo) {
      qrphCandidates.push({
        value: parsed.qrphInvoiceNo,
        score: scoreQrph(parsed.qrphInvoiceNo, normalized, weight),
      })
    }
    if (parsed.transactionAt) {
      dateCandidates.push({
        value: parsed.transactionAt,
        score: scoreTransactionAt(parsed.transactionAt, normalized, weight),
      })
    }
    if (parsed.provider && parsed.provider !== 'unknown') {
      providerCandidates.push({
        value: parsed.provider,
        score: scoreProvider(parsed.provider, normalized, weight),
      })
    }
  })

  return {
    referenceNo: pickBestScored(referenceCandidates),
    paymentId: pickBestScored(paymentIdCandidates),
    qrphInvoiceNo: pickBestScored(qrphCandidates),
    transactionAt: pickBestScored(dateCandidates),
    provider: pickBestScored(providerCandidates) ?? detectPaymentProofProvider(merged),
  }
}

export function mergePaymentProofProvider(
  fromText: PaymentProofProvider | null,
  fromImage: PaymentProofProvider | null,
  ocrText: string,
): PaymentProofProvider | null {
  const scores = scorePaymentProofProviders(ocrText)
  const textWinner = winnerFromProviderScores(scores)

  if (textWinner && scores[textWinner] >= 8) return textWinner

  if (fromText && fromText !== 'unknown' && scores[fromText] >= 5) return fromText

  if (fromImage && fromImage !== 'unknown') {
    if (fromImage === 'maya' && /grab/i.test(ocrText)) return 'grabpay'
    const ewalletStrong = scores.maya >= 9 || scores.gcash >= 10
    if (fromImage === 'unionbank' && ewalletStrong) {
      if (scores.maya >= scores.gcash && scores.maya >= 9) return 'maya'
      if (scores.gcash >= 10) return 'gcash'
      return textWinner
    }
    return fromImage
  }

  return textWinner
}

export function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

export function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null
  const parsed = new Date(`${value}:00+08:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export { normalizePaymentProofProvider }
