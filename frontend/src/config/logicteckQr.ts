/**
 * ICS publishes a QR with approved pre-forecast data for LOGICTECK integration.
 * The empty return booking is created and held in LOGICTECK — ICS does not book returns.
 */
export const LOGICTECK_QR = {
  integrationModel:
    'ICS supplies approved pre-forecast data to LOGICTECK. The empty return booking lives in LOGICTECK — not in ICS.',
  menuLabel: 'Pre-forecast QR',
  pageTitle: 'Pre-forecast QR',
  sectionTitle: 'Pre-forecast QR',
  tabLabel: 'Pre-forecast QR',
  printTitle: 'PRE-FORECAST QR',
  printSubtitle: 'Approved container details from ICS',
  heroDescription:
    'After payment is verified in ICS, a QR with approved pre-forecast details is published. Send to LOGICTECK when ready to create the return booking on their system.',
  scheduleSectionHint:
    'This QR encodes approved pre-forecast container details. The return booking is created on the LOGICTECK side after you send the data.',
  integrationNote:
    'ICS supplies pre-forecast data only. Use Send to LOGICTECK to create the booking on the LOGICTECK side.',
  readyAlert:
    'Return confirmed. Pre-forecast QR is published — send to LOGICTECK to create the return booking there.',
  viewQr: 'View QR',
  bookLogicteck: 'Send to LOGICTECK',
  bookSuccess: 'Pre-forecast data sent to LOGICTECK. Return booking is on the LOGICTECK side.',
  bookAlreadySubmitted: 'Already sent to LOGICTECK.',
  bookRetrieved: 'QR already retrieved by LOGICTECK at gate.',
  printFooter:
    'Pre-forecast QR from ICS — for LOGICTECK integration. Not for gate-in at ICS.',
  approveConfirmHint:
    'Confirming will mark the return as paid, confirm the schedule, and publish the pre-forecast QR.',
  approveSuccess:
    'Payment approved. Return confirmed and pre-forecast QR published.',
  validationStatusLabel: 'LOGICTECK status',
  statusActive: 'Ready to send',
  statusBooked: 'Booked on LOGICTECK',
  statusUsed: 'Retrieved',
  bookingIdLabel: 'ICS QR reference',
  emptyState:
    'Pre-forecast QR not yet published. It will be available after payment is verified in ICS.',
  integrationComingSoon:
    'Pre-forecast QR is ready — send to LOGICTECK to create the return booking there.',
} as const

export type LogicteckQrStatus =
  | typeof LOGICTECK_QR.statusActive
  | typeof LOGICTECK_QR.statusBooked
  | typeof LOGICTECK_QR.statusUsed

function displayLogicteckStatus(status: string | null | undefined, fallback: LogicteckQrStatus): string {
  const value = status?.trim()
  if (!value || value === 'Available' || value === LOGICTECK_QR.statusActive) return fallback
  if (value === 'Retrieved' || value === LOGICTECK_QR.statusUsed) return LOGICTECK_QR.statusUsed
  if (value === 'Booked' || value === LOGICTECK_QR.statusBooked) return LOGICTECK_QR.statusBooked
  return value
}

export function qrLookupStatusLabel(booking: {
  isUsed: boolean
  logicteckBookedAt?: string | null
  logicteckStatus?: string
}): string {
  if (booking.logicteckStatus && booking.logicteckStatus !== 'Available' && booking.logicteckStatus !== LOGICTECK_QR.statusActive) {
    return displayLogicteckStatus(booking.logicteckStatus, LOGICTECK_QR.statusActive)
  }
  if (booking.isUsed) return LOGICTECK_QR.statusUsed
  if (booking.logicteckBookedAt) return LOGICTECK_QR.statusBooked
  return LOGICTECK_QR.statusActive
}

export function qrLookupStatusColor(status: string): 'success' | 'info' | 'warning' | 'default' {
  if (status === 'At yard') return 'success'
  if (status === 'On hold' || status === 'Cancelled') return 'warning'
  if (status === LOGICTECK_QR.statusUsed || status === 'Retrieved') return 'default'
  if (
    status === LOGICTECK_QR.statusBooked ||
    status === 'Booked' ||
    status === 'With trucker' ||
    status === 'Near yard'
  ) {
    return 'info'
  }
  if (status === LOGICTECK_QR.statusActive) return 'success'
  return 'info'
}

export function qrLogicteckStatusFromPreAdvice(item: {
  hasQrBooking?: boolean
  logicteckStatus?: string | null
}): string | null {
  if (!item.hasQrBooking) return null
  return displayLogicteckStatus(item.logicteckStatus, LOGICTECK_QR.statusActive)
}
