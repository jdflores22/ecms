/**
 * ICS publishes a transfer QR with approved pre-advice data for LOGICTECK.
 * The empty return booking is created and held in LOGICTECK — ICS does not book returns.
 */
export const LOGICTECK_QR = {
  integrationModel:
    'ICS only transfers approved pre-advice data to LOGICTECK. The empty return booking lives in LOGICTECK — not in ICS.',
  menuLabel: 'LOGICTECK transfer',
  pageTitle: 'Pre-advice transfer QR',
  sectionTitle: 'Pre-advice transfer QR',
  tabLabel: 'LOGICTECK transfer',
  printTitle: 'PRE-ADVICE TRANSFER QR',
  printSubtitle: 'Approved container details · data transfer to LOGICTECK',
  heroDescription:
    'After depot verifies payment, ICS publishes a QR reference with approved pre-advice details for LOGICTECK. Send the data to LOGICTECK to create the return booking on their system.',
  scheduleSectionHint:
    'This QR carries approved pre-advice container details from ICS to LOGICTECK. ICS does not hold the return booking — LOGICTECK does after you transfer the data.',
  integrationNote:
    'ICS supplies pre-advice data only. Use Send to LOGICTECK to transfer details and create the booking on the LOGICTECK side.',
  readyAlert:
    'Return confirmed. Transfer QR published — send pre-advice data to LOGICTECK to create the return booking there.',
  viewQr: 'View transfer QR',
  bookLogicteck: 'Send to LOGICTECK',
  bookSuccess: 'Pre-advice data sent to LOGICTECK. Return booking is on the LOGICTECK side.',
  bookAlreadySubmitted: 'Already sent to LOGICTECK.',
  bookRetrieved: 'QR already retrieved by LOGICTECK at gate.',
  printFooter:
    'For LOGICTECK integration only — transfers approved pre-advice data from ICS. Not for gate-in at ICS.',
  approveConfirmHint:
    'Confirming will mark the return as paid, confirm the schedule, and publish the transfer QR so LOGICTECK can receive pre-advice details.',
  approveSuccess:
    'Payment approved. Return confirmed and transfer QR published for LOGICTECK.',
  validationStatusLabel: 'LOGICTECK status',
  statusActive: 'Ready to send',
  statusBooked: 'Booked on LOGICTECK',
  statusUsed: 'Retrieved',
  bookingIdLabel: 'ICS QR reference',
  emptyState:
    'Transfer QR not yet published. After depot confirmation, ICS will supply approved pre-advice data to LOGICTECK.',
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
