import type { PreAdvice } from '../services/api'
import { parseCroFreeTimeToIso, isCroFreeTimeExpired } from './croFreeTime'

/** ISO date (yyyy-MM-dd) for approve dialog — never pre-fills an expired date when a fresh one is required. */
export function initialApprovalFreeTimeDate(
  savedIso: string | null,
  draftIso: string | null,
  requireFreshAfterExpiry: boolean,
): string {
  const today = new Date().toISOString().slice(0, 10)
  const isUsable = (iso: string | null) =>
    Boolean(iso && iso >= today && !isCroFreeTimeExpired(iso))

  if (requireFreshAfterExpiry) {
    if (isUsable(draftIso)) return draftIso!
    if (isUsable(savedIso)) return savedIso!
    return ''
  }

  if (isUsable(draftIso)) return draftIso!
  if (isUsable(savedIso)) return savedIso!
  return draftIso ?? savedIso ?? ''
}

export function resolveEvaluationFreeTimeDate(item: PreAdvice): string | null {
  const raw = item.demurrageValidUntil ?? item.croEdoContext?.demurrageValidUntil ?? null
  return parseCroFreeTimeToIso(raw)
}

export function isEvaluationFreeTimeExpired(item: PreAdvice): boolean {
  return isCroFreeTimeExpired(resolveEvaluationFreeTimeDate(item))
}

export function isLegacyManualPreAdvice(item: PreAdvice): boolean {
  return item.croEdoContext?.linkType === 'LegacyUpload'
}

export function croFreeTimeLockedFromIcs(item: PreAdvice): boolean {
  return (
    item.croEdoContext?.linkType === 'IcsVerified'
    && Boolean(item.croEdoContext.demurrageValidUntil)
  )
}

/** Tab alert: free time missing, expired, or not saved yet while pre-forecast is under ICS review. */
export function croEdoTabNeedsAttention(
  item: PreAdvice,
  draftFreeTimeDate: string,
  canAct: boolean,
  detDemPaid = false,
): boolean {
  if (!canAct || detDemPaid) return false

  const saved = resolveEvaluationFreeTimeDate(item)
  const draft = parseCroFreeTimeToIso(draftFreeTimeDate.trim() || null)
  const effective = saved ?? draft

  if (!effective) return true
  if (isCroFreeTimeExpired(effective)) return true

  if (!croFreeTimeLockedFromIcs(item) && draft && draft !== saved) return true

  return false
}
