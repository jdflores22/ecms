/** Payment channel detected from proof-of-payment receipt (OCR / image). */
export type PaymentProofProvider =
  | 'gcash'
  | 'maya'
  | 'unionbank'
  | 'bancnet'
  | 'grabpay'
  | 'unknown'

export interface PaymentProofProviderStyle {
  id: PaymentProofProvider
  label: string
  color: string
  bg: string
  border: string
}

export const PAYMENT_PROOF_PROVIDERS: Record<PaymentProofProvider, PaymentProofProviderStyle> = {
  gcash: {
    id: 'gcash',
    label: 'GCash',
    color: '#007DFE',
    bg: 'rgba(0, 125, 254, 0.1)',
    border: 'rgba(0, 125, 254, 0.32)',
  },
  maya: {
    id: 'maya',
    label: 'Maya',
    color: '#00B14F',
    bg: 'rgba(0, 177, 79, 0.1)',
    border: 'rgba(0, 177, 79, 0.32)',
  },
  unionbank: {
    id: 'unionbank',
    label: 'UnionBank',
    color: '#F7931E',
    bg: 'rgba(247, 147, 30, 0.12)',
    border: 'rgba(247, 147, 30, 0.35)',
  },
  grabpay: {
    id: 'grabpay',
    label: 'GrabPay',
    color: '#00B14F',
    bg: 'rgba(0, 168, 107, 0.1)',
    border: 'rgba(0, 168, 107, 0.32)',
  },
  bancnet: {
    id: 'bancnet',
    label: 'BancNet',
    color: '#1E4D8C',
    bg: 'rgba(30, 77, 140, 0.1)',
    border: 'rgba(30, 77, 140, 0.3)',
  },
  unknown: {
    id: 'unknown',
    label: 'Unknown',
    color: '#616161',
    bg: 'rgba(97, 97, 97, 0.08)',
    border: 'rgba(97, 97, 97, 0.24)',
  },
}

export function normalizePaymentProofProvider(value?: string | null): PaymentProofProvider | null {
  if (!value) return null
  const key = value.trim().toLowerCase() as PaymentProofProvider
  return key in PAYMENT_PROOF_PROVIDERS ? key : null
}

export function paymentProofProviderStyle(
  provider?: string | null,
): PaymentProofProviderStyle | null {
  const normalized = normalizePaymentProofProvider(provider)
  if (!normalized || normalized === 'unknown') return null
  return PAYMENT_PROOF_PROVIDERS[normalized]
}

export function paymentProofProviderChipSx(provider?: string | null) {
  const style = paymentProofProviderStyle(provider) ?? PAYMENT_PROOF_PROVIDERS.unknown
  return {
    fontWeight: 700,
    bgcolor: style.bg,
    color: style.color,
    border: `1px solid ${style.border}`,
  }
}
