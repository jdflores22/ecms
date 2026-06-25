/**
 * ICS booking QR — supplies approved pre-advice container details to LOGICTECK only.
 * LOGICTECK will call POST /api/logicteck/validate-qr when integration goes live.
 *
 * This QR is not for trucker gate-in. It exists solely for the upcoming LOGICTECK integration.
 */
export const LOGICTECK_QR = {
  menuLabel: 'Booking QR',
  pageTitle: 'Pre-advice booking QR',
  sectionTitle: 'Pre-advice booking QR',
  tabLabel: 'Pre-advice booking QR',
  printTitle: 'PRE-ADVICE BOOKING QR',
  printSubtitle: 'Approved container details · for LOGICTECK integration',
  integrationComingSoon: 'LOGICTECK integration coming soon',
  heroDescription:
    'After depot verifies payment, ICS publishes a booking QR that supplies approved pre-advice container details to LOGICTECK only. Full LOGICTECK integration is coming soon.',
  scheduleSectionHint:
    'This QR provides approved pre-advice container details to the LOGICTECK system via the ICS validation API. It is not used for gate-in — LOGICTECK integration is coming soon.',
  integrationNote:
    'ICS supplies pre-advice container details to LOGICTECK only. LOGICTECK integration is coming soon.',
  readyAlert:
    'Return confirmed. Booking QR published — provides approved pre-advice details for LOGICTECK integration (coming soon).',
  viewQr: 'View booking QR',
  bookLogicteck: 'Book LOGICTECK',
  printFooter:
    'For LOGICTECK integration only — supplies approved pre-advice container details from ICS. Not for gate-in.',
  approveConfirmHint:
    'Confirming will mark the return as paid, confirm the schedule, and publish the booking QR for LOGICTECK to retrieve pre-advice details.',
  approveSuccess:
    'Payment approved. Return confirmed and booking QR published for LOGICTECK integration.',
  validationStatusLabel: 'LOGICTECK lookup status',
  statusActive: 'Available',
  statusUsed: 'Retrieved',
  bookingIdLabel: 'Booking reference',
  emptyState:
    'Booking QR not yet published. After depot confirmation, ICS will provide approved pre-advice container details to LOGICTECK.',
} as const

export function qrLookupStatusLabel(isUsed: boolean) {
  return isUsed ? LOGICTECK_QR.statusUsed : LOGICTECK_QR.statusActive
}
