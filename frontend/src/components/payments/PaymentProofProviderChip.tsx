import { Chip } from '@mui/material'
import {
  PAYMENT_PROOF_PROVIDERS,
  paymentProofProviderChipSx,
  paymentProofProviderStyle,
} from '../../config/paymentProofProviders'

export default function PaymentProofProviderChip({
  provider,
  size = 'small',
}: {
  provider?: string | null
  size?: 'small' | 'medium'
}) {
  const style = paymentProofProviderStyle(provider)
  if (!style) return null

  return (
    <Chip
      label={style.label}
      size={size}
      variant="outlined"
      sx={paymentProofProviderChipSx(provider)}
    />
  )
}

export function PaymentProofProviderLabel({ provider }: { provider?: string | null }) {
  const normalized = provider?.trim().toLowerCase()
  if (!normalized || normalized === 'unknown') return null
  const label = PAYMENT_PROOF_PROVIDERS[normalized as keyof typeof PAYMENT_PROOF_PROVIDERS]?.label
  return label ? <>{label}</> : null
}
