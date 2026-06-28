export type PaymentProofMetadata = {
  referenceNo: string | null
  transactionAt: string | null
}

const referencePattern =
  /(?:Ref(?:erence)?\.?\s*No\.?|Reference\s*(?:Number|No\.?)|Txn?\s*ID|Transaction\s*ID)\s*[:.]?\s*([0-9][0-9\s-]{8,})/i

const dateTimePattern =
  /((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM))/i

export function normalizeProofReferenceNo(value?: string | null): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length < 8) return null
  return digits.slice(0, 64)
}

export function formatProofReferenceNo(value?: string | null): string {
  if (!value) return '—'
  const digits = value.replace(/\D/g, '')
  if (digits.length === 12) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  return value
}

function parsePhilippinesTransactionAt(raw: string): string | null {
  const cleaned = raw.trim().replace(/\s+/g, ' ')
  const parsed = new Date(`${cleaned} GMT+0800`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export function parsePaymentProofText(text: string): PaymentProofMetadata {
  const normalized = text.replace(/[ \t]+/g, ' ')
  const refMatch = normalized.match(referencePattern)
  const dateMatch = normalized.match(dateTimePattern)

  return {
    referenceNo: refMatch ? normalizeProofReferenceNo(refMatch[1]) : null,
    transactionAt: dateMatch ? parsePhilippinesTransactionAt(dateMatch[1]) : null,
  }
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
