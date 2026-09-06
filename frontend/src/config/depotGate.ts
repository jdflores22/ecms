/** CY gate scanner copy for empty-return check-in. */
export const DEPOT_GATE = {
  pageTitle: 'Gate scan',
  menuLabel: 'Gate scan',
  heroTitle: 'Empty return gate scan',
  heroDescription:
    'Scan the trucker’s pre-forecast QR at the container yard gate. Review the full dossier — container details, documents, and identity photos — then accept when valid.',
  scannerTitle: 'Scan booking QR',
  scannerHint: 'Point the camera at the trucker’s ICS booking QR, or enter the reference manually.',
  manualLabel: 'ICS QR reference',
  manualPlaceholder: 'ICS-202600018',
  scanButton: 'Look up',
  acceptButton: 'Accept empty return',
  acceptSuccess: 'Trucker checked in for empty return.',
  alreadyCheckedIn: 'Already checked in at the gate.',
  invalidQr: 'QR is not valid for empty return. Trucker must file a new pre-forecast.',
  notFound: 'Booking reference not found.',
  cameraPermissionDenied: 'Camera access is required to scan booking QR codes at the gate.',
  cameraUnavailable: 'Camera is not available on this device. Enter the ICS reference manually.',
  stopCamera: 'Stop camera',
  startCamera: 'Start camera',
} as const

export type DepotGateIssueSeverity = 'error' | 'warning' | 'info'

export function depotGateIssueColor(severity: DepotGateIssueSeverity): 'error' | 'warning' | 'info' {
  if (severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'
  return 'info'
}
