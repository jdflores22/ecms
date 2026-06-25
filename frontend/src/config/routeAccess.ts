import type { UserRole } from './dashboardConfig'

export type AppPageKey =
  | 'dashboard'
  | 'profile'
  | 'preadvice'
  | 'evaluations'
  | 'cyAllocation'
  | 'containerInventory'
  | 'reports'
  | 'depotDailyReturns'
  | 'depotSchedules'
  | 'depotPayments'
  | 'truckerReturns'
  | 'truckerPayments'
  | 'truckerQr'
  | 'truckerQrPrint'
  | 'adminUsers'
  | 'adminRoles'
  | 'adminMasterData'
  | 'adminAudit'

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
  preadvice: {
    key: 'preadvice',
    label: 'Pre-advice',
    path: '/preadvice',
    group: 'Trucker',
    description: 'Create, submit, and track pre-advice for returns to CY or Port Terminal',
    showInNav: true,
  },
  evaluations: {
    key: 'evaluations',
    label: 'Evaluations',
    path: '/evaluations',
    group: 'Evaluation',
    description: 'Review pre-advice requests and assign container yards',
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
  reports: {
    key: 'reports',
    label: 'Reports',
    path: '/reports',
    group: 'Reports',
    description: 'Operational and role-specific reports',
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
  depotPayments: {
    key: 'depotPayments',
    label: 'Verify payments',
    path: '/depot/payments',
    group: 'Depot',
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
  truckerQr: {
    key: 'truckerQr',
    label: 'Booking QR',
    path: '/trucker/qr',
    group: 'Trucker',
    description: 'LOGICTECK booking QR codes after payment verification',
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
  adminAudit: {
    key: 'adminAudit',
    label: 'Audit log',
    path: '/admin/audit',
    group: 'Admin',
    description: 'System activity and security audit trail',
    showInNav: true,
  },
}

export const REQUIRED_PAGE_KEYS: AppPageKey[] = ['dashboard', 'profile']

/** Default page pool per role — maximum pages that can be assigned. */
export const ROLE_PAGE_ACCESS: Record<UserRole, AppPageKey[]> = {
  ShippingLineEvaluator: ['dashboard', 'profile', 'evaluations', 'cyAllocation', 'containerInventory', 'reports'],
  DepotPersonnel: [
    'dashboard',
    'profile',
    'depotDailyReturns',
    'depotSchedules',
    'depotPayments',
    'reports',
  ],
  Trucker: [
    'dashboard',
    'profile',
    'preadvice',
    'reports',
    'truckerReturns',
    'truckerPayments',
    'truckerQr',
    'truckerQrPrint',
  ],
  Administrator: Object.keys(APP_PAGES) as AppPageKey[],
}

const PAGE_MATCH_ORDER: AppPageKey[] = [
  'truckerQrPrint',
  'truckerPayments',
  'truckerReturns',
  'truckerQr',
  'depotDailyReturns',
  'depotSchedules',
  'depotPayments',
  'adminUsers',
  'adminRoles',
  'adminMasterData',
  'adminAudit',
  'preadvice',
  'cyAllocation',
  'containerInventory',
  'evaluations',
  'reports',
  'profile',
  'dashboard',
]

export function isKnownRole(role: string): role is UserRole {
  return role in ROLE_PAGE_ACCESS
}

export function getAssignablePageKeys(role: string): AppPageKey[] {
  return getAccessiblePageKeys(role)
}

/** Pages administrators manage in RBAC but do not use in the trucker portal. */
const ADMIN_RUNTIME_EXCLUDE: AppPageKey[] = [
  'truckerReturns',
  'truckerPayments',
  'truckerQr',
  'truckerQrPrint',
  'preadvice',
]

export function resolveAllowedPageKeys(role: string, allowedPages?: string[] | null): AppPageKey[] {
  const normalizedRole = role === 'Broker' ? 'Trucker' : role
  const valid = (allowedPages ?? []).filter((key): key is AppPageKey => key in APP_PAGES)
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
  'preadvice',
  'reports',
  'evaluations',
  'cyAllocation',
  'containerInventory',
  'adminUsers',
  'adminRoles',
  'adminMasterData',
  'adminAudit',
  'depotDailyReturns',
  'depotSchedules',
  'depotPayments',
  'truckerReturns',
  'truckerPayments',
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
