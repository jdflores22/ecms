import type { Payment, PreAdvice, Schedule } from '../services/api'
import { getPreAdviceContainerUnit } from './preAdviceContainerUnit'

export const paymentStatusLabel: Record<string, string> = {
  Pending: 'Payment due',
  ForVerification: 'Under review',
  Paid: 'Paid',
  Rejected: 'Rejected — re-upload',
}

export const paymentStatusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Pending: 'warning',
  ForVerification: 'info',
  Paid: 'success',
  Rejected: 'error',
}

export function resolvePaymentStatus(schedule: Schedule, payment: Payment | null): string {
  if (payment) return payment.status
  if (schedule.paymentStatus) return schedule.paymentStatus
  if (schedule.status === 'Confirmed' || schedule.status === 'Completed') return 'Paid'
  if (schedule.status === 'Scheduled') return 'Pending'
  return 'Pending'
}

export function needsPaymentUpload(schedule: Schedule, payment: Payment | null): boolean {
  if (schedule.status !== 'Scheduled') return false
  const status = resolvePaymentStatus(schedule, payment)
  return status === 'Pending' || status === 'Rejected'
}

export function showPaymentStatus(schedule: Schedule, payment: Payment | null): boolean {
  return (
    schedule.status === 'Scheduled' ||
    schedule.status === 'Confirmed' ||
    schedule.status === 'Completed' ||
    payment != null
  )
}

export function truckerPaymentPath(scheduleId: number) {
  return `/trucker/payments/${scheduleId}`
}

/** Compact hero line for payment pages — B2B tag is shown separately on the chip row. */
export function paymentHeroSubtitle(item: PreAdvice): string {
  const line = item.shippingLineName?.trim() || 'Shipping line'
  if (item.isBackToBack && item.backToBackCompanionContainerNo?.trim()) {
    const companion = getPreAdviceContainerUnit(item, 'Companion')
    return `${line} · ${item.containerNo} + ${companion.containerNo}`
  }
  return `${line} · ${item.containerNo}`
}

/** Amount shown to truckers (₱0 while pilot testing is active and payment is still due). */
export function truckerPaymentDisplayAmount(
  payment: Payment | null,
  options: {
    effectiveReturnFeeAmount: number
    returnFeeAmount: number
    pilotTestingActive: boolean
    uploadNeeded: boolean
  },
): number {
  if (payment && !(options.pilotTestingActive && options.uploadNeeded)) {
    return payment.amount
  }
  const effective = options.effectiveReturnFeeAmount
  if (Number.isFinite(effective)) return effective
  return options.returnFeeAmount
}
