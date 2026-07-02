import type { SvgIconComponent } from '@mui/icons-material'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CalendarViewDayIcon from '@mui/icons-material/CalendarViewDay'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import HistoryIcon from '@mui/icons-material/History'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PaymentsIcon from '@mui/icons-material/Payments'
import PeopleIcon from '@mui/icons-material/People'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import { LOGICTECK_QR } from './logicteckQr'

export type UserRole =
  | 'ShippingLineEvaluator'
  | 'DepotPersonnel'
  | 'Trucker'
  | 'Administrator'

export interface DashboardStatDef {
  key: string
  label: string
  description: string
  icon: SvgIconComponent
  color: string
  highlightWhenPositive?: boolean
}

export interface QuickAction {
  label: string
  path: string
  icon: SvgIconComponent
}

export interface RoleDashboardConfig {
  title: string
  subtitle: string
  workflow: string[]
  stats: DashboardStatDef[]
  actions: QuickAction[]
}

export const dashboardConfig: Record<UserRole, RoleDashboardConfig> = {
  ShippingLineEvaluator: {
    title: 'Evaluation queue',
    subtitle: 'Review pre-forecast requests and assign container yards',
    workflow: [
      'Open the pending queue for new submissions',
      'Approve with a CY assignment or reject with remarks',
      'Review evaluation history for audit reference',
    ],
    stats: [
      { key: 'pendingEvaluations', label: 'Pending evaluations', description: 'Awaiting your decision', icon: FactCheckIcon, color: '#ed6c02', highlightWhenPositive: true },
      { key: 'approvedToday', label: 'Approved today', description: 'Decisions made today', icon: CheckCircleIcon, color: '#2e7d32' },
      { key: 'rejectedToday', label: 'Rejected today', description: 'Rejected today', icon: CancelIcon, color: '#d32f2f' },
      { key: 'assignedCyCount', label: 'CY assigned', description: 'Approved with yard assignment', icon: WarehouseIcon, color: '#1565c0' },
    ],
    actions: [
      { label: 'Open evaluations', path: '/evaluations', icon: FactCheckIcon },
      { label: 'CY allocation', path: '/evaluations/cy-allocation', icon: WarehouseIcon },
      { label: 'CY inventory', path: '/evaluations/container-inventory', icon: WarehouseIcon },
    ],
  },
  DepotPersonnel: {
    title: 'Depot operations',
    subtitle: "Today's returns, slot capacity, and payment verification",
    workflow: [
      'Schedule approved returns with date, slot, and trucker',
      'Verify trucker payment proofs before LOGICTECK booking QR generation',
      'Monitor slot occupancy to avoid overbooking',
    ],
    stats: [
      { key: 'todaysReturns', label: "Today's returns", description: 'Scheduled for today', icon: CalendarMonthIcon, color: '#1565c0' },
      { key: 'occupiedSlots', label: 'Occupied slots', description: 'Slots already booked', icon: HourglassEmptyIcon, color: '#ed6c02' },
    ],
    actions: [
      { label: 'Daily returns', path: '/depot/daily-returns', icon: CalendarViewDayIcon },
      { label: 'Manage schedules', path: '/depot/schedules', icon: CalendarMonthIcon },
    ],
  },
  Trucker: {
    title: 'Trucker overview',
    subtitle: 'Pre-forecast, withdrawals, returns, payments, and booking QR',
    workflow: [
      'Create and submit pre-forecast for empty returns',
      'Submit ATW withdrawal requests for repositioning',
      'Review assigned return schedules',
      'Upload payment proof',
      'Download booking QR after verification',
    ],
    stats: [
      { key: 'pendingRequests', label: 'Pending pre-forecast', description: 'Draft or awaiting evaluation', icon: HourglassEmptyIcon, color: '#ed6c02', highlightWhenPositive: true },
      { key: 'draftWithdrawals', label: 'Draft withdrawals', description: 'Saved but not submitted', icon: UnarchiveOutlinedIcon, color: '#ed6c02', highlightWhenPositive: true },
      { key: 'issuedWithdrawalsAwaitingUpload', label: 'Issued ATW — upload', description: 'Shipping line issued ATW awaiting certificate', icon: UnarchiveOutlinedIcon, color: '#6a1b9a', highlightWhenPositive: true },
      { key: 'submittedWithdrawals', label: 'Awaiting CY review', description: 'Submitted to container yard', icon: HourglassEmptyIcon, color: '#1565c0', highlightWhenPositive: true },
      { key: 'upcomingReturns', label: 'Upcoming returns', description: 'Scheduled, not yet confirmed', icon: CalendarMonthIcon, color: '#6a1b9a', highlightWhenPositive: true },
      { key: 'pendingPayments', label: 'Pending payments', description: 'Awaiting upload or verification', icon: PaymentsIcon, color: '#ed6c02', highlightWhenPositive: true },
      { key: 'confirmedReturns', label: 'Confirmed returns', description: 'Payment verified, QR available', icon: CheckCircleIcon, color: '#2e7d32' },
      { key: 'approvedWithdrawals', label: 'Approved withdrawals', description: 'Released or completed repositioning', icon: CheckCircleIcon, color: '#2e7d32' },
    ],
    actions: [
      { label: 'Pre-forecast', path: '/preforecast', icon: AssignmentIcon },
      { label: 'New pre-forecast', path: '/preforecast/new', icon: AssignmentIcon },
      { label: 'My withdrawals', path: '/trucker/withdrawals', icon: AssignmentIcon },
      { label: 'My returns', path: '/trucker/returns', icon: LocalShippingIcon },
      { label: 'Payments', path: '/trucker/payments', icon: PaymentsIcon },
      { label: LOGICTECK_QR.menuLabel, path: '/trucker/qr', icon: QrCode2Icon },
    ],
  },
  Administrator: {
    title: 'System overview',
    subtitle: 'Cross-role metrics and operational health',
    workflow: [
      'Review audit log for critical system actions',
      'Use admin tools to verify payments and manage slots',
      'Create and manage users with role-specific assignments',
    ],
    stats: [
      { key: 'totalUsers', label: 'Total users', description: 'Registered system users', icon: PeopleIcon, color: '#1565c0' },
      { key: 'totalPreAdvices', label: 'Pre-forecasts', description: 'All pre-forecast requests', icon: AssignmentIcon, color: '#6a1b9a' },
      { key: 'pendingEvaluations', label: 'Pending evaluations', description: 'Awaiting shipping line action', icon: FactCheckIcon, color: '#ed6c02', highlightWhenPositive: true },
      { key: 'activeSchedules', label: 'Active schedules', description: 'Scheduled or confirmed returns', icon: CalendarMonthIcon, color: '#2e7d32' },
    ],
    actions: [
      { label: 'Manage users', path: '/admin/users', icon: PeopleIcon },
      { label: 'Roles', path: '/admin/roles', icon: AdminPanelSettingsIcon },
      { label: 'Master data', path: '/admin/master-data', icon: WarehouseIcon },
      { label: 'Reports', path: '/admin/reports', icon: TrendingUpIcon },
      { label: 'Revenue', path: '/admin/revenue', icon: PaymentsIcon },
      { label: 'Audit log', path: '/admin/audit', icon: HistoryIcon },
      { label: 'Verify payments', path: '/admin/payments', icon: PaymentsIcon },
    ],
  },
}

export function isUserRole(role: string): role is UserRole {
  return role in dashboardConfig
}
