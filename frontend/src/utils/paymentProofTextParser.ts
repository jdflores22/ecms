import {
  normalizePaymentProofProvider,
  type PaymentProofProvider,
} from '../config/paymentProofProviders'

export type { PaymentProofProvider }

export type PaymentProofMetadata = {
  referenceNo: string | null
  qrphInvoiceNo: string | null
  transactionAt: string | null
  provider: PaymentProofProvider | null
}

/** Ordered — first match wins. Tight captures to avoid OCR label bleed (e.g. UnionBank header). */
const REFERENCE_PATTERNS: RegExp[] = [
  /(?:Reference\s+Number|Referencenumber)\s*(?:Transaction\s+Date|Transactiondate)?\s*(UB\d{4,12})\b/i,
  /(UB\d{4,12})/i,
  /Reference\s+ID\s*[:.]?\s*((?:[0-9A-Fa-f]{4}\s*){2,3}[0-9A-Fa-f]{4})\b/i,
  /Reference\s+Number\s*[:.]?\s*(\d{6,12})\b/i,
  /(?:Ref(?:erence)?\.?\s*No\.?)\s*[:.]?\s*(\d{6,12})\b/i,
  /Ref\.?\s*No\.?\s+(\d{6,12})\b/i,
  /\b(\d{4}\s+\d{3}\s+\d{6})\b/,
]

const QRPH_INVOICE_PATTERNS: RegExp[] = [
  /QR\s*Ph?\s*Invoice\s*No\.?\s*[:.]?\s*(\d{4,12})/i,
  /QRPH\s*Invoice\s*No\.?\s*[:.]?\s*(\d{4,12})/i,
]

const DATE_PATTERNS: RegExp[] = [
  /((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm))/i,
  /((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM))/i,
  /\b(\d{2}-\d{2}-\d{2}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM))\b/i,
]

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

export function normalizeProofQrphInvoiceNo(value?: string | null): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
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

function extractReferenceNo(text: string): string | null {
  for (const pattern of REFERENCE_PATTERNS) {
    const match = text.match(pattern)
    if (match?.[1]) {
      const normalized = normalizeProofReferenceNo(match[1])
      if (normalized) return normalized
    }
  }
  return null
}

function extractQrphInvoiceNo(text: string): string | null {
  for (const pattern of QRPH_INVOICE_PATTERNS) {
    const match = text.match(pattern)
    if (match?.[1]) {
      const normalized = normalizeProofQrphInvoiceNo(match[1])
      if (normalized) return normalized
    }
  }
  return null
}

function parseMonthDateTime(raw: string): string | null {
  const cleaned = raw.trim().replace(/\s+/g, ' ').replace(/,\s*(?=\d{1,2}:)/, ' ')
  const parsed = new Date(`${cleaned} GMT+0800`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
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

  const parsed = new Date(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}+08:00`,
  )
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function extractTransactionAt(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern)
    if (!match?.[1]) continue
    const value = match[1]
    if (/\d{2}-\d{2}-\d{2}/.test(value)) {
      const short = parseShortPhilippinesDateTime(value)
      if (short) return short
    } else {
      const monthDate = parseMonthDateTime(value)
      if (monthDate) return monthDate
    }
  }
  return null
}

export function detectPaymentProofProvider(text: string): PaymentProofProvider {
  const winner = winnerFromProviderScores(scorePaymentProofProviders(text))
  return winner ?? 'unknown'
}

export function parsePaymentProofText(text: string): PaymentProofMetadata {
  const normalized = preprocessOcrText(text)
  return {
    referenceNo: extractReferenceNo(normalized),
    qrphInvoiceNo: extractQrphInvoiceNo(normalized),
    transactionAt: extractTransactionAt(normalized),
    provider: detectPaymentProofProvider(normalized),
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
