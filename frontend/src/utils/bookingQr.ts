/** Normalize a scanned trucker booking QR payload or ICS reference. */
export function normalizeBookingQrReference(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { bookingId?: string; BookingId?: string }
      const id = parsed.bookingId?.trim() || parsed.BookingId?.trim()
      if (id) return id.toUpperCase()
    } catch {
      // Fall through — partial JSON from a bad camera read may still contain ICS-…
    }
  }

  const match = trimmed.match(/ICS-\d+/i)
  if (match) return match[0].toUpperCase()

  // Avoid sending huge corrupted scan payloads to the API.
  if (trimmed.length > 64) return ''

  return trimmed
}
