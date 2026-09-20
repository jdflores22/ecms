import type { Payment } from '../services/api'

/** Provider key for Paid via chip (ewallet from proof/OCR or PayMongo). */
export function paymentPaidViaProvider(payment: Payment): string | null {
  const provider = payment.proofProvider?.trim().toLowerCase()
  if (provider && provider !== 'unknown') return provider
  if (payment.paymentChannel === 'PayMongo') return 'paymongo'
  return null
}

export function paymentDisplayReferenceNo(payment: Payment): string | null {
  if (payment.proofReferenceNo) return payment.proofReferenceNo
  if (payment.payMongoPaymentIntentId) {
    const id = payment.payMongoPaymentIntentId
    return id.startsWith('pi_') ? id.slice(3) : id
  }
  return null
}

export function paymentDisplayPaymentId(payment: Payment): string | null {
  if (payment.proofPaymentId) return payment.proofPaymentId
  if (payment.payMongoPaymentIntentId) return payment.payMongoPaymentIntentId
  return null
}
