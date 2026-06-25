export interface RoleInfo {
  name: string
  label: string
  description: string
  capabilities: string[]
}

export const ROLE_CATALOG: RoleInfo[] = [
  {
    name: 'Administrator',
    label: 'Administrator',
    description: 'Full system access for user, master data, and audit oversight.',
    capabilities: [
      'Manage users and roles',
      'Shipping lines, depots, containers',
      'View reports and audit log',
      'All depot and evaluation functions',
    ],
  },
  {
    name: 'ShippingLineEvaluator',
    label: 'Shipping Line Evaluator',
    description: 'Reviews pre-advice for assigned shipping line and assigns CY.',
    capabilities: [
      'Approve or reject pre-advice',
      'Assign container yard on approval',
      'View evaluation history',
    ],
  },
  {
    name: 'DepotPersonnel',
    label: 'Depot Personnel',
    description: 'Schedules returns, verifies payments, and manages daily operations.',
    capabilities: [
      'Assign schedule slots',
      'Verify trucker payments',
      'Daily returns view',
      'Depot reports',
    ],
  },
  {
    name: 'Trucker',
    label: 'Trucker',
    description: 'Creates pre-advice, manages returns, uploads payment proof, and receives booking QR codes.',
    capabilities: [
      'Create and submit pre-advice',
      'Upload container identity photos',
      'View assigned return schedules',
      'Upload payment proof',
      'Download and print QR codes',
      'View operational reports',
    ],
  },
]

export function roleLabel(role: string) {
  return ROLE_CATALOG.find((r) => r.name === role)?.label ?? role
}

/** Trucker-only pre-advice access; legacy Broker JWTs are still accepted until re-login. */
export function isPreAdviceManager(role?: string | null) {
  return role === 'Trucker' || role === 'Broker'
}
