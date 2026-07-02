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

export function qrLookupStatusLabel(booking: {
  isUsed: boolean
  logicteckBookedAt?: string | null
  logicteckStatus?: string
}): LogicteckQrStatus {
  if (booking.logicteckStatus === LOGICTECK_QR.statusUsed || booking.isUsed) return LOGICTECK_QR.statusUsed
  if (booking.logicteckStatus === LOGICTECK_QR.statusBooked || booking.logicteckBookedAt)
    return LOGICTECK_QR.statusBooked
  return LOGICTECK_QR.statusActive
}

export function qrLookupStatusColor(status: LogicteckQrStatus): 'success' | 'info' | 'default' {
  if (status === LOGICTECK_QR.statusUsed) return 'default'
  if (status === LOGICTECK_QR.statusBooked) return 'info'
  return 'success'
}

export function qrLogicteckStatusFromPreAdvice(item: {
  hasQrBooking?: boolean
  logicteckStatus?: string | null
}): LogicteckQrStatus | null {
  if (!item.hasQrBooking) return null
  if (item.logicteckStatus === LOGICTECK_QR.statusUsed || item.logicteckStatus === 'Retrieved')
    return LOGICTECK_QR.statusUsed
  if (item.logicteckStatus === LOGICTECK_QR.statusBooked || item.logicteckStatus === 'Booked')
    return LOGICTECK_QR.statusBooked
  if (item.logicteckStatus === LOGICTECK_QR.statusActive || item.logicteckStatus === 'Available')
    return LOGICTECK_QR.statusActive
  return LOGICTECK_QR.statusActive
}
