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

export function resolveEvaluationFreeTimeDate(item: PreAdvice | null | undefined): string | null {
  if (!item) return null
  const raw = item.demurrageValidUntil ?? item.croEdoContext?.demurrageValidUntil ?? null
  return parseCroFreeTimeToIso(raw)
}

export function resolveCompanionEvaluationFreeTimeDate(item: PreAdvice | null | undefined): string | null {
  if (!item) return null
  return parseCroFreeTimeToIso(item.backToBackCompanionDemurrageValidUntil ?? null)
}

export function isEvaluationFreeTimeExpired(item: PreAdvice | null | undefined): boolean {
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
function unitFreeTimeNeedsAttention(
  item: PreAdvice,
  saved: string | null,
  draftFreeTimeDate: string,
): boolean {
  const draft = parseCroFreeTimeToIso(draftFreeTimeDate.trim() || null)
  const effective = saved ?? draft

  if (!effective) return true
  if (isCroFreeTimeExpired(effective)) return true

  if (!croFreeTimeLockedFromIcs(item) && draft && draft !== saved) return true

  return false
}

export type CroEdoApproveUnit = 'primary' | 'companion'

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function croEdoFreeTimeDraftUnsaved(
  saved: string | null,
  draftFreeTimeDate: string,
): boolean {
  const draft = parseCroFreeTimeToIso(draftFreeTimeDate.trim() || null)
  return Boolean(draft && draft !== saved)
}

function croEdoApproveUnitLabel(item: PreAdvice, unit: CroEdoApproveUnit): string {
  if (!item.isBackToBack) return 'Container'
  return unit === 'primary' ? 'Container A' : 'Container B'
}

/** User-facing blocker when free time must be set on the CRO / eDO tab (not in approve modal). */
export function croEdoFreeTimeApproveMessage(
  item: PreAdvice | null | undefined,
  unit: CroEdoApproveUnit,
  draftFreeTimeDate: string,
  detDemPaid: boolean,
): string | null {
  if (!item) return 'Pre-forecast not loaded.'
  const saved =
    unit === 'primary'
      ? resolveEvaluationFreeTimeDate(item)
      : resolveCompanionEvaluationFreeTimeDate(item)
  const label = croEdoApproveUnitLabel(item, unit)

  if (croEdoFreeTimeDraftUnsaved(saved, draftFreeTimeDate)) {
    return `Save ${label} free time on the CRO / eDO tab before approving.`
  }

  if (!saved) {
    return `Set and save ${label} free time on the CRO / eDO tab before approving.`
  }

  const today = todayIsoDate()
  if (!detDemPaid && isCroFreeTimeExpired(saved)) {
    return `${label} free time expired — update on the CRO / eDO tab or resolve DET-DEM before approving.`
  }

  if (detDemPaid && (saved < today || isCroFreeTimeExpired(saved))) {
    return `After DET-DEM settlement, set a new ${label} free time (today or later) on the CRO / eDO tab and save.`
  }

  return null
}

export function croEdoFreeTimeReadyForApprove(
  item: PreAdvice | null | undefined,
  unit: CroEdoApproveUnit,
  draftFreeTimeDate: string,
  detDemPaid: boolean,
): boolean {
  return croEdoFreeTimeApproveMessage(item, unit, draftFreeTimeDate, detDemPaid) === null
}

export function croEdoTabNeedsAttention(
  item: PreAdvice,
  draftFreeTimeDate: string,
  draftCompanionFreeTimeDate: string,
  canAct: boolean,
  detDemPaid = false,
): boolean {
  if (!canAct || detDemPaid) return false

  if (unitFreeTimeNeedsAttention(item, resolveEvaluationFreeTimeDate(item), draftFreeTimeDate)) {
    return true
  }

  if (
    item.isBackToBack
    && unitFreeTimeNeedsAttention(
      item,
      resolveCompanionEvaluationFreeTimeDate(item),
      draftCompanionFreeTimeDate,
    )
  ) {
    return true
  }

  return false
}
