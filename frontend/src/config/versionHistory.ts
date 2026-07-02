export const APP_VERSION = '1.7.0'

export interface ReleaseNote {
  version: string
  releasedOn: string
  title: string
  highlights: string[]
}

/** Newest first. First entry should match APP_VERSION. */
export const RELEASE_HISTORY: ReleaseNote[] = [
  {
    version: '1.7.0',
    releasedOn: '2026-07-02',
    title: 'Payment proof OCR ensemble and trucker push notifications',
    highlights: [
      'Multi-engine payment proof OCR: browser PaddleOCR + Tesseract with layout-aware preprocessing',
      'Server Python OCR ensemble (Tesseract, PaddleOCR, EasyOCR, and optional engines) for admin detect',
      'Receipt date fallback uses proof upload time when OCR cannot read faint GCash transaction dates',
      'Zoomed-crop and photo-of-screen layouts for monitor screenshots with gray date text',
      'Trucker Android app: Firebase Cloud Messaging push alerts for ECMS events',
    ],
  },
  {
    version: '1.6.0',
    releasedOn: '2026-07-01',
    title: 'Depot operations, withdrawal UX, and schedule workflow refinements',
    highlights: [
      'Trucker withdrawal detail: two-column layout (summary + ATW certificate) with compact status timeline',
      'Gate pass shown only after CY approval; fixed empty placeholder card on submitted withdrawals',
      'Depot withdrawals: Needs review default tab, search, richer table, and clickable summary filters',
      'Depot daily returns: status filters, search, depot remarks column, and schedule detail links',
      'Depot schedules and daily returns hide For Payment tab for depot personnel (admin still sees all)',
      'Schedule status renamed Cancelled to No show across API and UI (enum value unchanged)',
      'Depot remarks on schedules saved via API and shown to truckers on return and payment pages',
      'Optional Others container photo slot; seven standard views still required for submit',
      'LOGICTECK dossier includes Others photos with consistent display ordering',
    ],
  },
  {
    version: '1.5.0',
    releasedOn: '2026-07-01',
    title: 'Payment proof QRPH invoice, provider detection, and withdrawal workflow',
    highlights: [
      'QRPH invoice number stored separately from payment reference (Maya, GCash); blank when absent (e.g. UnionBank)',
      'Payment proof OCR detects provider (GCash, Maya, UnionBank, GrabPay, BancNet) with colored admin chips',
      'Improved reference extraction for garbled UnionBank OCR and spaced GCash/Maya reference IDs',
      'Pre-forecast detail: unified status badge, Go to payment link, and shared schedule status helpers',
      'Withdrawal wizard with progress checklist, gate pass card, bulk container paste, and draft persistence',
      'ATW document OCR and parser for faster evaluation data entry',
      'Admin payments table and verify dialog show QRPH invoice alongside reference number',
    ],
  },
  {
    version: '1.4.0',
    releasedOn: '2026-06-30',
    title: 'Production auth, signed uploads, and performance',
    highlights: [
      'Signed asset URLs for all cross-origin upload images (photos, payment proofs, ATW documents)',
      'Auth reliability: JWT key sync, split login/refresh rate limits, proactive token refresh',
      'Frontend code-splitting and deferred polling to reduce navigation jank in production',
      'One-command deploy script: Hostinger frontend upload plus git push for Railway API redeploy',
      'Batch asset signing API for evaluation photos and dossier views on Hostinger + Railway split',
    ],
  },
  {
    version: '1.3.0',
    releasedOn: '2026-06-29',
    title: 'Demurrage billing, security, and pre-forecast UX',
    highlights: [
      'Demurrage and detention billing for expired pre-forecast with outstanding charges',
      'Trucker demurrage settlement gate before new pre-forecast submissions',
      'Pre-advice renamed to pre-forecast across routes, API, and UI copy',
      'Evaluation detail adds a full overview tab aligned with trucker pre-forecast dossier',
      'Upload protection with signed URLs and HttpOnly auth cookie on login',
      'IDOR fixes on QR endpoints and payment status; rate limiting on auth endpoints',
      'Secrets moved to environment configuration for production deployments',
      'Performance: batched audit logs, payment settings cache, nav count APIs, DB indexes',
      'New admin version page listing release notes and previous versions',
    ],
  },
  {
    version: '1.2.0',
    releasedOn: '2026-06-28',
    title: 'LOGICTECK integration, payment OCR, and profile',
    highlights: [
      'LOGICTECK dossier API with API key auth and QR publish transfer flow',
      'Standalone public LOGICTECK test page and permanent transfer link',
      'Payment proof OCR for production and Railway cross-origin setups',
      'Profile photo upload and redesigned profile settings page',
      'Depot date-only scheduling and sidebar nav badge counts',
    ],
  },
  {
    version: '1.1.0',
    releasedOn: '2026-06-26',
    title: 'CY allocation, container inventory, and ICS branding',
    highlights: [
      'CY allocation dashboard with TEU capacity and contract visibility',
      'Container yard inventory and dwell-time tracking (CAO 08-2019)',
      'Shipping line depot contracts and container size/type master data',
      'Trucker-first pre-advice workflows and admin fee settings',
      'Rebrand to ICS (Intelligent Container Solutions)',
      'Role-based reports for admin, depot, evaluator, and trucker portals',
    ],
  },
  {
    version: '1.0.0',
    releasedOn: '2026-06-24',
    title: 'Initial ECMS platform',
    highlights: [
      'Pre-advice submission with container photos and workflow statuses',
      'Shipping line evaluation and CY assignment',
      'Depot scheduling, daily returns, and trucker return assignments',
      'Payment proof upload and admin verification',
      'QR pass generation after verified payment',
      'User, role, and master data administration with audit logging',
    ],
  },
]

export function getCurrentRelease(): ReleaseNote {
  return RELEASE_HISTORY[0]
}

export function getPreviousReleases(): ReleaseNote[] {
  return RELEASE_HISTORY.slice(1)
}

export function formatReleaseDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
