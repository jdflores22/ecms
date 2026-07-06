import type { UserRole } from './dashboardConfig'

export type AppPageKey =
  | 'dashboard'
  | 'profile'
  | 'preforecast'
  | 'evaluations'
  | 'cyAllocation'
  | 'containerInventory'
  | 'demurrageBilling'
  | 'adminReports'
  | 'depotReports'
  | 'evaluatorReports'
  | 'truckerReports'
  | 'depotDailyReturns'
  | 'depotSchedules'
  | 'adminPayments'
  | 'truckerReturns'
  | 'truckerPayments'
  | 'truckerDemurrageBilling'
  | 'truckerWithdrawals'
  | 'evaluatorAtw'
  | 'depotWithdrawals'
  | 'truckerQr'
  | 'truckerQrPrint'
  | 'adminUsers'
  | 'adminRoles'
  | 'adminMasterData'
  | 'adminCertificateTemplates'
  | 'adminAudit'
  | 'adminVersion'
  | 'adminRevenue'

export type PageGroup = 'Common' | 'Evaluation' | 'Depot' | 'Trucker' | 'Admin' | 'Reports'

export interface AppPage {
  key: AppPageKey
  label: string
  path: string
  group: PageGroup
  description: string
  showInNav: boolean
}

export const APP_PAGES: Record<AppPageKey, AppPage> = {
  dashboard: {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/',
    group: 'Common',
    description: 'Role-specific overview and quick actions',
    showInNav: true,
  },
  profile: {
    key: 'profile',
    label: 'Profile',
    path: '/profile',
    group: 'Common',
    description: 'Account details and password',
    showInNav: false,
  },
  preforecast: {
    key: 'preforecast',
    label: 'Pre-forecast',
    path: '/preforecast',
    group: 'Trucker',
    description: 'Create, submit, and track pre-forecast for returns to CY or Port Terminal',
    showInNav: true,
  },
  evaluations: {
    key: 'evaluations',
    label: 'Evaluations',
    path: '/evaluations',
    group: 'Evaluation',
    description: 'Review pre-forecast requests and assign container yards',
    showInNav: true,
  },
  cyAllocation: {
    key: 'cyAllocation',
    label: 'CY allocation',
    path: '/evaluations/cy-allocation',
    group: 'Evaluation',
    description: 'View container yard contract TEU capacity and availability',
    showInNav: true,
  },
  containerInventory: {
    key: 'containerInventory',
    label: 'CY inventory',
    path: '/evaluations/container-inventory',
    group: 'Evaluation',
    description: 'Container visibility and dwell time at container yards (CAO 08-2019)',
    showInNav: true,
  },
  demurrageBilling: {
    key: 'demurrageBilling',
    label: 'Demurrage billing',
    path: '/evaluations/demurrage-billing',
    group: 'Evaluation',
    description: 'Expired pre-forecast with outstanding demurrage and detention charges',
    showInNav: true,
  },
  adminReports: {
    key: 'adminReports',
    label: 'Reports',
    path: '/admin/reports',
    group: 'Admin',
    description: 'Payment transactions by shipping line and container yard',
    showInNav: true,
  },
  depotReports: {
    key: 'depotReports',
    label: 'Reports',
    path: '/depot/reports',
    group: 'Depot',
    description: 'Depot return reports for your assigned container yard',
    showInNav: true,
  },
  evaluatorReports: {
    key: 'evaluatorReports',
    label: 'Reports',
    path: '/evaluations/reports',
    group: 'Evaluation',
    description: 'Shipping line return statistics and CY activity',
    showInNav: true,
  },
  truckerReports: {
    key: 'truckerReports',
    label: 'Reports',
    path: '/trucker/reports',
    group: 'Trucker',
    description: 'Your return schedule and completion history',
    showInNav: true,
  },
  depotDailyReturns: {
    key: 'depotDailyReturns',
    label: 'Daily returns',
    path: '/depot/daily-returns',
    group: 'Depot',
    description: "Today's scheduled returns at the depot",
    showInNav: true,
  },
  depotSchedules: {
    key: 'depotSchedules',
    label: 'Schedules',
    path: '/depot/schedules',
    group: 'Depot',
    description: 'Assign return date, slot, and trucker',
    showInNav: true,
  },
  adminPayments: {
    key: 'adminPayments',
    label: 'Verify payments',
    path: '/admin/payments',
    group: 'Admin',
    description: 'Review and verify trucker payment proofs',
    showInNav: true,
  },
  truckerReturns: {
    key: 'truckerReturns',
    label: 'My returns',
    path: '/trucker/returns',
    group: 'Trucker',
    description: 'Assigned container return schedules',
    showInNav: true,
  },
  truckerPayments: {
    key: 'truckerPayments',
    label: 'Payments',
    path: '/trucker/payments',
    group: 'Trucker',
    description: 'Upload and track payment proofs',
    showInNav: true,
  },
  truckerDemurrageBilling: {
    key: 'truckerDemurrageBilling',
    label: 'Demurrage',
    path: '/trucker/demurrage-billing',
    group: 'Trucker',
    description: 'Settle demurrage and detention before new pre-forecast',
    showInNav: true,
  },
  truckerWithdrawals: {
    key: 'truckerWithdrawals',
    label: 'My withdrawals',
    path: '/trucker/withdrawals',
    group: 'Trucker',
    description: 'Submit ATW-backed container withdrawal requests for repositioning',
    showInNav: true,
  },
  evaluatorAtw: {
    key: 'evaluatorAtw',
    label: 'Issue ATW',
    path: '/evaluations/atw',
    group: 'Evaluation',
    description: 'Issue Authority to Withdraw for authorized truckers',
    showInNav: true,
  },
  depotWithdrawals: {
    key: 'depotWithdrawals',
    label: 'CY withdrawals',
    path: '/depot/withdrawals',
    group: 'Depot',
    description: 'Review and approve container withdrawal requests at your CY',
    showInNav: true,
  },
  truckerQr: {
    key: 'truckerQr',
    label: 'Pre-forecast QR',
    path: '/trucker/qr',
    group: 'Trucker',
    description: 'QR code for approved pre-forecast after payment verification',
    showInNav: true,
  },
  truckerQrPrint: {
    key: 'truckerQrPrint',
    label: 'Print QR pass',
    path: '/trucker/qr/print',
    group: 'Trucker',
    description: 'Printable QR pass for a confirmed return',
    showInNav: false,
  },
  adminUsers: {
    key: 'adminUsers',
    label: 'Users',
    path: '/admin/users',
    group: 'Admin',
    description: 'Create and manage system users',
    showInNav: true,
  },
  adminRoles: {
    key: 'adminRoles',
    label: 'Roles',
    path: '/admin/roles',
    group: 'Admin',
    description: 'Role definitions and page access (RBAC)',
    showInNav: true,
  },
  adminMasterData: {
    key: 'adminMasterData',
    label: 'Master data',
    path: '/admin/master-data',
    group: 'Admin',
    description: 'Shipping lines, depots, and container reference data',
    showInNav: true,
  },
  adminCertificateTemplates: {
    key: 'adminCertificateTemplates',
    label: 'Certificates',
    path: '/admin/certificate-templates',
    group: 'Admin',
    description: 'ATW and other certificate layout templates per shipping line',
    showInNav: true,
  },
  adminAudit: {
    key: 'adminAudit',
    label: 'Audit log',
    path: '/admin/audit',
    group: 'Admin',
    description: 'System activity and security audit trail',
    showInNav: true,
  },
  adminVersion: {
    key: 'adminVersion',
    label: 'Version',
    path: '/admin/version',
    group: 'Admin',
    description: 'Release notes, what is new, and previous versions',
    showInNav: true,
  },
  adminRevenue: {
    key: 'adminRevenue',
    label: 'Revenue',
    path: '/admin/revenue',
    group: 'Admin',
    description: 'Verified pre-forecast fee collections from approved trucker payments',
    showInNav: true,
  },
}

export const REQUIRED_PAGE_KEYS: AppPageKey[] = ['dashboard', 'profile']

/** Admin portal pages — oversight and configuration, not operational depot/evaluation workflows. */
export const ADMINISTRATOR_PAGES: AppPageKey[] = [
  'dashboard',
  'profile',
  'adminReports',
  'adminPayments',
  'adminUsers',
  'adminRoles',
  'adminMasterData',
  'adminCertificateTemplates',
  'adminAudit',
  'adminVersion',
  'adminRevenue',
]

/** Default page pool per role — maximum pages that can be assigned. */
export const ROLE_PAGE_ACCESS: Record<UserRole, AppPageKey[]> = {
  ShippingLineEvaluator: [
    'dashboard',
    'profile',
    'evaluations',
    'evaluatorAtw',
    'cyAllocation',
    'containerInventory',
    'demurrageBilling',
    'evaluatorReports',
  ],
  DepotPersonnel: [
    'dashboard',
    'profile',
    'depotDailyReturns',
    'depotSchedules',
    'depotWithdrawals',
    'depotReports',
  ],
  Trucker: [
    'dashboard',
    'profile',
    'preforecast',
    'truckerReports',
    'truckerReturns',
    'truckerPayments',
    'truckerDemurrageBilling',
    'truckerWithdrawals',
    'truckerQr',
    'truckerQrPrint',
  ],
  Administrator: ADMINISTRATOR_PAGES,
}

const PAGE_MATCH_ORDER: AppPageKey[] = [
  'truckerQrPrint',
  'truckerPayments',
  'truckerDemurrageBilling',
  'truckerReturns',
  'truckerReports',
  'truckerQr',
  'truckerWithdrawals',
  'evaluatorAtw',
  'evaluatorReports',
  'depotReports',
  'depotDailyReturns',
  'depotSchedules',
  'depotWithdrawals',
  'adminReports',
  'adminRevenue',
  'adminPayments',
  'adminUsers',
  'adminRoles',
  'adminMasterData',
  'adminCertificateTemplates',
  'adminAudit',
  'adminVersion',
  'adminRevenue',
  'preforecast',
  'cyAllocation',
  'containerInventory',
  'demurrageBilling',
  'evaluations',
  'profile',
  'dashboard',
]

export function isKnownRole(role: string): role is UserRole {
  return role in ROLE_PAGE_ACCESS
}

export function getAssignablePageKeys(role: string): AppPageKey[] {
  return getAccessiblePageKeys(role)
}

/** Legacy or mis-assigned pages stripped from the admin runtime session. */
const ADMIN_RUNTIME_EXCLUDE: AppPageKey[] = [
  'truckerReturns',
  'truckerPayments',
  'truckerQr',
  'truckerQrPrint',
  'preforecast',
  'evaluations',
  'cyAllocation',
  'containerInventory',
  'depotDailyReturns',
  'depotSchedules',
]

import { migrateLegacyReportPageKey } from './reportConfig'

function migrateLegacyAppPageKey(key: string): string {
  if (key === 'preadvice') return 'preforecast'
  return key
}

export function resolveAllowedPageKeys(role: string, allowedPages?: string[] | null): AppPageKey[] {
  const normalizedRole = role === 'Broker' ? 'Trucker' : role
  const valid = (allowedPages ?? [])
    .map((key) => {
      const migrated = migrateLegacyAppPageKey(key)
      return migrateLegacyReportPageKey(normalizedRole, migrated) ?? migrated
    })
    .filter((key): key is AppPageKey => key in APP_PAGES)
  let keys: AppPageKey[]
  if (valid.length > 0) {
    const withRequired = [...new Set<AppPageKey>([...REQUIRED_PAGE_KEYS, ...valid])]
    if (withRequired.includes('truckerQr') && !withRequired.includes('truckerQrPrint')) {
      withRequired.push('truckerQrPrint')
    }
    const pool = new Set(getAssignablePageKeys(normalizedRole))
    keys = withRequired.filter((key) => pool.has(key))
    if (normalizedRole === 'Trucker') {
      for (const key of ROLE_PAGE_ACCESS.Trucker) {
        if (!keys.includes(key)) keys.push(key)
      }
    }
  } else {
    keys = getAccessiblePageKeys(normalizedRole)
  }
  if (normalizedRole === 'Administrator') {
    keys = keys.filter((key) => !ADMIN_RUNTIME_EXCLUDE.includes(key))
    for (const key of ROLE_PAGE_ACCESS.Administrator) {
      if (!ADMIN_RUNTIME_EXCLUDE.includes(key) && !keys.includes(key)) {
        keys.push(key)
      }
    }
  }
  return keys
}

export function resolveAccessiblePages(role: string, allowedPages?: string[] | null): AppPage[] {
  return resolveAllowedPageKeys(role, allowedPages).map((key) => APP_PAGES[key])
}

export function getAccessiblePages(role: string): AppPage[] {
  if (!isKnownRole(role)) return [APP_PAGES.dashboard, APP_PAGES.profile]
  return ROLE_PAGE_ACCESS[role].map((key) => APP_PAGES[key])
}

export function getAccessiblePageKeys(role: string): AppPageKey[] {
  if (!isKnownRole(role)) return ['dashboard', 'profile']
  return ROLE_PAGE_ACCESS[role]
}

export function resolvePageKey(pathname: string): AppPageKey | null {
  for (const key of PAGE_MATCH_ORDER) {
    const page = APP_PAGES[key]
    if (page.path === '/') {
      if (pathname === '/') return key
      continue
    }
    if (pathname === page.path || pathname.startsWith(`${page.path}/`)) {
      return key
    }
  }
  return null
}

export function canAccessPage(role: string, pageKey: AppPageKey, allowedPages?: string[] | null): boolean {
  const keys = resolveAllowedPageKeys(role, allowedPages)
  return keys.includes(pageKey)
}

export function canAccessPath(role: string, pathname: string, allowedPages?: string[] | null): boolean {
  const pageKey = resolvePageKey(pathname)
  if (!pageKey) return true
  return canAccessPage(role, pageKey, allowedPages)
}

export function getDefaultPathForRole(role: string, allowedPages?: string[] | null): string {
  const pages = resolveAccessiblePages(role, allowedPages).filter((p) => p.showInNav)
  return pages[0]?.path ?? '/'
}

const GROUP_COLORS: Record<PageGroup, { bg: string; color: string; border: string }> = {
  Common: { bg: 'rgba(11, 61, 145, 0.08)', color: '#0B3D91', border: 'rgba(11, 61, 145, 0.2)' },
  Evaluation: { bg: 'rgba(237, 108, 2, 0.1)', color: '#E65100', border: 'rgba(237, 108, 2, 0.25)' },
  Depot: { bg: 'rgba(46, 125, 50, 0.1)', color: '#2E7D32', border: 'rgba(46, 125, 50, 0.25)' },
  Trucker: { bg: 'rgba(106, 27, 154, 0.08)', color: '#6A1B9A', border: 'rgba(106, 27, 154, 0.22)' },
  Admin: { bg: 'rgba(198, 40, 40, 0.08)', color: '#C62828', border: 'rgba(198, 40, 40, 0.22)' },
  Reports: { bg: 'rgba(0, 163, 224, 0.1)', color: '#0088B5', border: 'rgba(0, 163, 224, 0.25)' },
}

export function pageGroupChipSx(group: PageGroup) {
  const palette = GROUP_COLORS[group]
  return {
    fontWeight: 600,
    bgcolor: palette.bg,
    color: palette.color,
    border: `1px solid ${palette.border}`,
  }
}

export const PAGE_GROUPS_ORDER: PageGroup[] = [
  'Common',
  'Evaluation',
  'Depot',
  'Trucker',
  'Reports',
  'Admin',
]

/** Sidebar display order (subset of pages with showInNav). */
export const NAV_PAGE_ORDER: AppPageKey[] = [
  'dashboard',
  'preforecast',
  'truckerWithdrawals',
  'evaluatorAtw',
  'evaluatorReports',
  'depotReports',
  'truckerReports',
  'adminReports',
  'evaluations',
  'cyAllocation',
  'containerInventory',
  'demurrageBilling',
  'adminUsers',
  'adminRoles',
  'adminMasterData',
  'adminCertificateTemplates',
  'adminRevenue',
  'adminPayments',
  'adminAudit',
  'adminVersion',
  'depotDailyReturns',
  'depotSchedules',
  'depotWithdrawals',
  'truckerReturns',
  'truckerPayments',
  'truckerDemurrageBilling',
  'truckerQr',
]

export function getNavPagesForRole(role: string, allowedPages?: string[] | null): AppPage[] {
  const keys = new Set(resolveAllowedPageKeys(role, allowedPages))
  return NAV_PAGE_ORDER.filter((key) => APP_PAGES[key].showInNav && keys.has(key)).map(
    (key) => APP_PAGES[key],
  )
}

export function groupPagesBySection(pages: AppPage[]): { group: PageGroup; pages: AppPage[] }[] {
  return PAGE_GROUPS_ORDER.map((group) => ({
    group,
    pages: pages.filter((p) => p.group === group),
  })).filter((section) => section.pages.length > 0)
}
