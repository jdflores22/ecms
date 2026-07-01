export interface AtwDocumentMetadata {
  atwNumber?: string
  issueDate?: string
  expirationDate?: string
  containerNumbers: string[]
  destination?: string
}

function toIsoDate(match: RegExpMatchArray): string | undefined {
  const [, y, m, d] = match
  if (!y || !m || !d) return undefined
  const year = y.length === 2 ? `20${y}` : y
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

export function parseAtwDocumentText(text: string): AtwDocumentMetadata {
  const upper = text.toUpperCase()
  const containerNumbers = [
    ...new Set(
      [...upper.matchAll(/\b([A-Z]{4}\d{7})\b/g)].map((m) => m[1]).filter(Boolean),
    ),
  ]

  const atwMatch =
    upper.match(/\bATW[\s\-#:]*([A-Z0-9\-]{4,24})\b/) ??
    upper.match(/\bAUTHORITY\s+TO\s+WITHDRAW[\s\S]{0,40}?([A-Z0-9\-]{5,24})\b/)

  const issueMatch =
    upper.match(/ISSUE\s*DATE[:\s]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/) ??
    upper.match(/DATE\s+ISSUED[:\s]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)

  const expiryMatch =
    upper.match(/EXPIR(?:Y|ATION)\s*DATE[:\s]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/) ??
    upper.match(/VALID\s+UNTIL[:\s]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)

  const destinationMatch = upper.match(/DESTINATION[:\s]+([A-Z0-9 ,.\-]{4,60})/)

  return {
    atwNumber: atwMatch?.[1]?.replace(/[^A-Z0-9\-]/g, ''),
    issueDate: issueMatch ? toIsoDate(issueMatch) : undefined,
    expirationDate: expiryMatch ? toIsoDate(expiryMatch) : undefined,
    containerNumbers,
    destination: destinationMatch?.[1]?.trim().replace(/\s{2,}/g, ' '),
  }
}
