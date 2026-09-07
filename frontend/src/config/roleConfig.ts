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
    description: 'System administration: users, master data, payments, revenue, and audit.',
    capabilities: [
      'Manage users and roles',
      'Shipping lines, depots, and container reference data',
      'Verify trucker payment proofs',
      'Payment transaction and revenue reports',
      'Audit log and security oversight',
    ],
  },
  {
    name: 'ShippingLineEvaluator',
    label: 'Shipping Line Evaluator',
    description: 'Reviews pre-forecast for assigned shipping line and assigns CY.',
    capabilities: [
      'Approve or reject pre-forecast',
      'Assign container yard on approval',
      'View evaluation history',
    ],
  },
  {
    name: 'DepotPersonnel',
    label: 'Depot Personnel',
    description: 'Schedules returns and manages daily depot operations.',
    capabilities: [
      'Assign schedule slots',
      'Daily returns view',
      'Send depot broadcasts to truckers',
      'Depot reports',
    ],
  },
  {
    name: 'Trucker',
    label: 'Trucker',
    description: 'Creates pre-forecast, manages returns, uploads payment proof, and receives booking QR codes.',
    capabilities: [
      'Create and submit pre-forecast',
      'Upload container identity photos',
      'View assigned return schedules',
      'Upload payment proof',
      'Download and print QR codes',
      'View operational reports',
    ],
  },
  {
    name: 'Broker',
    label: 'Broker',
    description: 'Same trucker workflow for now: pre-forecast, returns, payments, withdrawals, and booking QR.',
    capabilities: [
      'Create and submit pre-forecast',
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

/** Trucker and broker pre-forecast access (same workflow for now). */
export function isTruckerOrBroker(role?: string | null) {
  return role === 'Trucker' || role === 'Broker'
}

export function isPreAdviceManager(role?: string | null) {
  return isTruckerOrBroker(role)
}
