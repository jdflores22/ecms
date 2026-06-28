import { qrApi, type BookLogicteckResponse, type QrBooking } from '../services/api'

export async function bookLogicteckBooking(bookingId: number): Promise<BookLogicteckResponse> {
  const { data } = await qrApi.bookLogicteck(bookingId)
  return data
}

export function canBookLogicteck(booking: QrBooking | null | undefined): boolean {
  return Boolean(booking && !booking.isUsed && !booking.logicteckBookedAt)
}

export function applyBookLogicteckResult(
  current: QrBooking | null,
  result: BookLogicteckResponse,
): QrBooking | null {
  if (!current || !result.booking) return current
  return result.booking
}
