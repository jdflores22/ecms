/**
 * ICS publishes a QR with approved pre-forecast data for LOGICTECK integration.
 * The empty return booking is created and held in LOGICTECK — ICS does not book returns.
 */
export const LOGICTECK_QR = {
  integrationModel:
    'ICS supplies approved pre-forecast data to LOGICTECK. You confirm the empty return booking on LOGICTECK — ICS does not auto-book.',
  menuLabel: 'Pre-forecast QR',
  pageTitle: 'Pre-forecast QR',
  sectionTitle: 'Pre-forecast QR',
  tabLabel: 'Pre-forecast QR',
  printTitle: 'PRE-FORECAST QR',
  printSubtitle: 'Approved container details from ICS',
  heroDescription:
    'After payment is verified in ICS, a QR and ICS reference are published. Open LOGICTECK to confirm the return booking on their system.',
  scheduleSectionHint:
    'This QR encodes approved pre-forecast container details. Confirm the return on LOGICTECK — ICS only transfers data.',
  integrationNote:
    'ICS is integrated with LOGICTECK. Open LOGICTECK to load this ICS reference and confirm the empty return booking.',
  readyAlert:
    'Return confirmed in ICS. Open LOGICTECK to confirm the empty return booking (ICS reference is pre-filled).',
  viewQr: 'View QR',
  openLogicteckConfirm: 'Open LOGICTECK to confirm return',
  openLogicteckLoading: 'Opening…',
  /** @deprecated Use openLogicteckConfirm */
  bookLogicteck: 'Open LOGICTECK to confirm return',
  bookLogicteckLoading: 'Opening…',
  bookSuccess: 'LOGICTECK acknowledged this return on ICS.',
  bookAlreadySubmitted: 'Already confirmed on LOGICTECK (ICS is in sync).',
  bookRetrieved: 'QR already retrieved by LOGICTECK at gate.',
  afterOpenHint:
    'After you save the booking on LOGICTECK, refresh this page to see “Booked on LOGICTECK”.',
  printFooter:
    'Pre-forecast QR from ICS — for LOGICTECK integration. Not for gate-in at ICS.',
  approveConfirmHint:
    'Confirming will mark the return as paid, confirm the schedule, and publish the pre-forecast QR.',
  approveSuccess:
    'Payment approved. Return confirmed and pre-forecast QR published.',
  validationStatusLabel: 'ICS ↔ LOGICTECK',
  statusActive: 'Confirm on LOGICTECK',
  statusActiveLegacy: 'Ready to confirm',
  statusBooked: 'Booked on LOGICTECK',
  statusUsed: 'Retrieved',
  bookingIdLabel: 'ICS QR reference',
  emptyState:
    'Pre-forecast QR not yet published. It will be available after payment is verified in ICS.',
  integrationComingSoon:
    'Pre-forecast QR is ready — open LOGICTECK to confirm the return booking.',
  statusActiveHint:
    'Payment confirmed in ICS. Open LOGICTECK, review the pre-filled data, and confirm the return booking there.',
} as const

export type LogicteckQrStatus =
  | typeof LOGICTECK_QR.statusActive
  | typeof LOGICTECK_QR.statusBooked
  | typeof LOGICTECK_QR.statusUsed

function isLogicteckActiveStatus(value: string): boolean {
  return (
    value === 'Available' ||
    value === LOGICTECK_QR.statusActive ||
    value === LOGICTECK_QR.statusActiveLegacy ||
    value === 'Book with LOGICTECK' ||
    value === 'Ready to send'
  )
}

function displayLogicteckStatus(status: string | null | undefined, fallback: LogicteckQrStatus): string {
  const value = status?.trim()
  if (!value || isLogicteckActiveStatus(value)) return fallback
  if (value === 'Retrieved' || value === LOGICTECK_QR.statusUsed) return LOGICTECK_QR.statusUsed
  if (value === 'Booked' || value === LOGICTECK_QR.statusBooked) return LOGICTECK_QR.statusBooked
  return value
}

export function qrLookupStatusLabel(booking: {
  isUsed: boolean
  logicteckBookedAt?: string | null
  logicteckStatus?: string
}): string {
  if (booking.logicteckStatus && !isLogicteckActiveStatus(booking.logicteckStatus.trim())) {
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
