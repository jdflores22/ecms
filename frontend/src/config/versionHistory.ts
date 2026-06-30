export const APP_VERSION = '1.4.0'

export interface ReleaseNote {
  version: string
  releasedOn: string
  title: string
  highlights: string[]
}

/** Newest first. First entry should match APP_VERSION. */
export const RELEASE_HISTORY: ReleaseNote[] = [
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
