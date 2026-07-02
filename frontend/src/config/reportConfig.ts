import type { UserRole } from './dashboardConfig'
import type { AppPageKey } from './routeAccess'

export type ReportPageKey = 'adminReports' | 'depotReports' | 'evaluatorReports' | 'truckerReports'

export const REPORT_PAGE_PATHS: Record<ReportPageKey, string> = {
  adminReports: '/admin/reports',
  depotReports: '/depot/reports',
  evaluatorReports: '/evaluations/reports',
  truckerReports: '/trucker/reports',
}

export type ReportTabId = 'daily' | 'monthly' | 'shippingLines' | 'depots'

export interface RoleReportConfig {
  role: UserRole
  title: string
  subtitle: string
  tabs: { id: ReportTabId; label: string }[]
  showDepotFilter: boolean
  showShippingLineFilter: boolean
}

export const REPORT_PAGE_CONFIG: Record<ReportPageKey, RoleReportConfig> = {
  adminReports: {
    role: 'Administrator',
    title: 'Transaction reports',
    subtitle: 'Payment activity, verification status, and collections by shipping line and yard.',
    tabs: [],
    showDepotFilter: false,
    showShippingLineFilter: false,
  },
  depotReports: {
    role: 'DepotPersonnel',
    title: 'Depot returns reports',
    subtitle:
      'Return activity at your container yard, broken down by each shipping line contract.',
    tabs: [{ id: 'shippingLines', label: 'By shipping line' }],
    showDepotFilter: false,
    showShippingLineFilter: true,
  },
  evaluatorReports: {
    role: 'ShippingLineEvaluator',
    title: 'Shipping line reports',
    subtitle: 'Return statistics for pre-forecasts under your shipping line.',
    tabs: [
      { id: 'daily', label: 'Daily' },
      { id: 'monthly', label: 'Monthly' },
      { id: 'depots', label: 'By container yard' },
    ],
    showDepotFilter: false,
    showShippingLineFilter: false,
  },
  truckerReports: {
    role: 'Trucker',
    title: 'My returns reports',
    subtitle: 'Your assigned return schedules and completion history.',
    tabs: [
      { id: 'daily', label: 'Daily' },
      { id: 'monthly', label: 'Monthly' },
    ],
    showDepotFilter: false,
    showShippingLineFilter: false,
  },
}

const ROLE_TO_REPORT_PAGE: Record<UserRole, ReportPageKey> = {
  Administrator: 'adminReports',
  DepotPersonnel: 'depotReports',
  ShippingLineEvaluator: 'evaluatorReports',
  Trucker: 'truckerReports',
}

export function isReportPageKey(key: string): key is ReportPageKey {
  return key in REPORT_PAGE_CONFIG
}

export function getReportPageKeyForRole(role: string): ReportPageKey | null {
  if (role === 'Broker') return ROLE_TO_REPORT_PAGE.Trucker
  if (role in ROLE_TO_REPORT_PAGE) return ROLE_TO_REPORT_PAGE[role as UserRole]
  return null
}

export function getReportPathForRole(role: string): string {
  const pageKey = getReportPageKeyForRole(role)
  if (!pageKey) return '/'
  return REPORT_PAGE_PATHS[pageKey]
}

export function usesDateRangeForTab(tabId: ReportTabId): boolean {
  return tabId === 'daily' || tabId === 'shippingLines' || tabId === 'depots'
}

/** Map legacy RBAC page key to the role-specific reports page. */
export function migrateLegacyReportPageKey(role: string, key: string): AppPageKey | null {
  if (key !== 'reports') return null
  const reportKey = getReportPageKeyForRole(role)
  return reportKey
}
