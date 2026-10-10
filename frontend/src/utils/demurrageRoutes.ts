export type DemurrageBillingAudience = 'trucker' | 'evaluator' | 'admin'

export function demurrageBillingListPath(audience: DemurrageBillingAudience): string {
  switch (audience) {
    case 'trucker':
      return '/trucker/demurrage-billing'
    case 'admin':
      return '/admin/det-dem'
    default:
      return '/evaluations/demurrage-billing'
  }
}

export function demurrageBillingDetailPath(id: number, audience: DemurrageBillingAudience): string {
  return `${demurrageBillingListPath(audience)}/${id}`
}

export function demurrageAudienceForRole(role?: string | null): DemurrageBillingAudience {
  if (role === 'Administrator') return 'admin'
  if (role === 'Trucker' || role === 'Broker') return 'trucker'
  return 'evaluator'
}

export function demurrageAudienceFromPath(pathname: string): DemurrageBillingAudience {
  if (pathname.startsWith('/trucker/demurrage-billing')) return 'trucker'
  if (pathname.startsWith('/admin/det-dem')) return 'admin'
  return 'evaluator'
}
