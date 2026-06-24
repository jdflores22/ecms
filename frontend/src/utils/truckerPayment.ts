import type { Payment, Schedule } from '../services/api'

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
