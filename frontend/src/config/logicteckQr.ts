/**
 * ICS publishes a QR with approved pre-advice data for LOGICTECK integration.
 * The empty return booking is created and held in LOGICTECK — ICS does not book returns.
 */
export const LOGICTECK_QR = {
  integrationModel:
    'ICS supplies approved pre-advice data to LOGICTECK. The empty return booking lives in LOGICTECK — not in ICS.',
  menuLabel: 'Pre-advice QR',
  pageTitle: 'Pre-advice QR',
  sectionTitle: 'Pre-advice QR',
  tabLabel: 'Pre-advice QR',
  printTitle: 'PRE-ADVICE QR',
  printSubtitle: 'Approved container details from ICS',
  heroDescription:
    'After depot verifies payment, ICS publishes a QR with approved pre-advice details. Send to LOGICTECK when ready to create the return booking on their system.',
  scheduleSectionHint:
    'This QR encodes approved pre-advice container details. The return booking is created on the LOGICTECK side after you send the data.',
  integrationNote:
    'ICS supplies pre-advice data only. Use Send to LOGICTECK to create the booking on the LOGICTECK side.',
  readyAlert:
    'Return confirmed. Pre-advice QR is published — send to LOGICTECK to create the return booking there.',
  viewQr: 'View QR',
  bookLogicteck: 'Send to LOGICTECK',
  bookSuccess: 'Pre-advice data sent to LOGICTECK. Return booking is on the LOGICTECK side.',
  bookAlreadySubmitted: 'Already sent to LOGICTECK.',
  bookRetrieved: 'QR already retrieved by LOGICTECK at gate.',
  printFooter:
    'Pre-advice QR from ICS — for LOGICTECK integration. Not for gate-in at ICS.',
  approveConfirmHint:
    'Confirming will mark the return as paid, confirm the schedule, and publish the pre-advice QR.',
  approveSuccess:
    'Payment approved. Return confirmed and pre-advice QR published.',
  validationStatusLabel: 'LOGICTECK status',
  statusActive: 'Ready to send',
  statusBooked: 'Booked on LOGICTECK',
  statusUsed: 'Retrieved',
  bookingIdLabel: 'ICS QR reference',
  emptyState:
    'Pre-advice QR not yet published. It will be available after depot confirms payment.',
  integrationComingSoon:
    'Pre-advice QR is ready — send to LOGICTECK to create the return booking there.',
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
