import type { PreAdvice, QrBooking } from '../services/api'
import { getPreAdviceContainerUnit } from './preAdviceContainerUnit'

export function qrPassContainerHeadline(
  preAdvice: PreAdvice | null | undefined,
  qr: QrBooking | null | undefined,
  scheduleReferenceNo?: string,
): string {
  if (preAdvice?.isBackToBack && preAdvice.backToBackCompanionContainerNo?.trim()) {
    const companion = getPreAdviceContainerUnit(preAdvice, 'Companion')
    return `${preAdvice.containerNo} + ${companion.containerNo}`
  }
  if (qr?.payload?.containerNo?.trim()) return qr.payload.containerNo
  if (preAdvice?.containerNo?.trim()) return preAdvice.containerNo
  return scheduleReferenceNo ?? '—'
}

export function qrPassPreForecastReference(
  preAdvice: PreAdvice | null | undefined,
  qr: QrBooking | null | undefined,
): string {
  return preAdvice?.referenceNo ?? qr?.payload.preAdviceReference ?? '—'
}
