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
    name: 'Broker',
    label: 'Broker',
    description: 'Creates and submits pre-advice for empty containers returning to CY or Port Terminal.',
    capabilities: [
      'Create and submit pre-advice',
      'Upload supporting documents',
      'Cancel submitted requests',
      'View broker reports',
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
    description: 'Uploads payment proof and receives QR codes for container returns.',
    capabilities: [
      'View assigned schedules',
      'Upload payment proof',
      'Download and print QR codes',
    ],
  },
]

export function roleLabel(role: string) {
  return ROLE_CATALOG.find((r) => r.name === role)?.label ?? role
}
