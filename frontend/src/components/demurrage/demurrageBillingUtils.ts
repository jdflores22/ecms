import type { DemurrageBilling, DemurrageBillingFeeInput } from '../../services/api'

export type FeeRow = DemurrageBillingFeeInput & { key: string }

export const DEFAULT_FEE_ROWS: FeeRow[] = [
  { key: 'demurrage', description: 'Demurrage', amount: 3500 },
  { key: 'detention', description: 'Detention', amount: 2500 },
]

export const FEE_PRESETS = ['Storage fee', 'Handling fee', 'Admin fee', 'Lift-off charge'] as const

export function isExpiredValidUntil(dateStr: string) {
  return dateStr < new Date().toISOString().slice(0, 10)
}

export function getBillingFeeLines(item: DemurrageBilling) {
  if (item.feeLines?.length) return item.feeLines
  return [
    ...(item.demurrageAmount > 0
      ? [{ id: 0, description: 'Demurrage', amount: item.demurrageAmount, sortOrder: 1 }]
      : []),
    ...(item.detentionAmount > 0
      ? [{ id: 0, description: 'Detention', amount: item.detentionAmount, sortOrder: 2 }]
      : []),
  ]
}

export function billingToFeeRows(billing: DemurrageBilling): FeeRow[] {
  return getBillingFeeLines(billing).map((line, index) => ({
    key: `line-${line.id || index}`,
    description: line.description,
    amount: line.amount,
  }))
}

export function feeRowsTotal(rows: FeeRow[]) {
  return rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
}

export function validateFeeRows(rows: FeeRow[]): string | null {
  const payload = rows.map(({ description, amount }) => ({
    description: description.trim(),
    amount,
  }))
  if (payload.some((line) => !line.description)) return 'Each fee line needs a description.'
  if (payload.some((line) => line.amount <= 0)) return 'Each fee amount must be greater than zero.'
  return null
}

export function feeRowsToPayload(rows: FeeRow[]): DemurrageBillingFeeInput[] {
  return rows.map(({ description, amount }) => ({
    description: description.trim(),
    amount,
  }))
}

export function summarizeBillings(items: DemurrageBilling[]) {
  const outstanding = items.filter((i) => i.status === 'Pending' || i.status === 'Rejected')
  const underReview = items.filter((i) => i.status === 'ForVerification')
  const settled = items.filter((i) => i.status === 'Paid')
  return {
    outstandingCount: outstanding.length,
    outstandingTotal: outstanding.reduce((sum, i) => sum + i.totalAmount, 0),
    underReviewCount: underReview.length,
    settledCount: settled.length,
    totalRecords: items.length,
  }
}
