/** LOGICTECK direct booking form — ICS pre-advice → LOGICTECK transmission. */
export function logicteckDirectBookPath(bookingId: number) {
  return `/logicteck/book?bookingId=${bookingId}`
}

export function logicteckDirectBookPathByQr(qrCode: string) {
  return `/logicteck/book?qr=${encodeURIComponent(qrCode)}`
}
