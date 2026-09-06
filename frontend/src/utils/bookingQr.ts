/** Normalize a scanned trucker booking QR payload or ICS reference. */
export function normalizeBookingQrReference(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { bookingId?: string }
      if (parsed.bookingId?.trim()) return parsed.bookingId.trim()
    } catch {
      // Fall through to plain reference parsing.
    }
  }

  const match = trimmed.match(/ICS-\d+/i)
  if (match) return match[0].toUpperCase()
  return trimmed
}
