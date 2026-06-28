/** Public LOGICTECK integration endpoints — callable outside ECMS (no JWT). */
export const LOGICTECK_API_TEST = {
  pageTitle: 'LOGICTECK API test',
  pageSubtitle:
    'Verify what LOGICTECK sees after ICS transfers pre-advice data — lookup and gate validation against ICS public APIs.',
  lookupPath: '/api/logicteck/booking',
  validatePath: '/api/logicteck/validate-qr',
  apiKeyHeader: 'X-Logicteck-Api-Key',
  defaultPublicApiBase:
    import.meta.env.VITE_LOGICTECK_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5275',
  intro:
    'ICS only transfers data — the return booking lives in LOGICTECK. After Send to LOGICTECK, lookup should show isBooked: true on the LOGICTECK side.',
  lookupHint:
    'Read-only LOGICTECK lookup — does not mark the QR as retrieved. isBooked reflects LOGICTECK, not ICS pre-advice status.',
  validateHint: 'Simulates LOGICTECK gate scan — marks the QR as Retrieved (one-time).',
  statusAvailable: 'Ready to send',
  statusBooked: 'Booked on LOGICTECK',
  statusRetrieved: 'Retrieved',
  fullDossierTitle: 'Full pre-advice from ICS (data transfer source)',
  dossierHint:
    'Source data ICS transfers to LOGICTECK — details and container identity photos. The booking record itself is not stored in ICS.',
  dossierAuthRequired: 'Sign in to ICS to view the pre-advice data and container photos being transferred.',
} as const

export type LogicteckLookupResult = {
  found: boolean
  message?: string | null
  bookingReference?: string | null
  containerNo?: string | null
  shippingLine?: string | null
  trucker?: string | null
  preAdviceReference?: string | null
  scheduledDate?: string | null
  scheduledTime?: string | null
  depot?: string | null
  isBooked: boolean
  isRetrieved: boolean
}

export type LogicteckValidateResult = {
  valid: boolean
  message?: string | null
  bookingReference?: string | null
  containerNo?: string | null
  shippingLine?: string | null
  trucker?: string | null
  preAdviceReference?: string | null
  scheduledDate?: string | null
  scheduledTime?: string | null
  depot?: string | null
}

export function resolveLogicteckExternalStatus(
  result: Pick<LogicteckLookupResult, 'found' | 'isBooked' | 'isRetrieved'>,
) {
  if (!result.found) return null
  if (result.isRetrieved) return LOGICTECK_API_TEST.statusRetrieved
  if (result.isBooked) return LOGICTECK_API_TEST.statusBooked
  return LOGICTECK_API_TEST.statusAvailable
}
