import { formatDate } from './datetime'

export type EvaluationRejectRemarksContext = {
  referenceNo: string
  containerNo: string
  freeTimeIso: string | null
  freeTimeExpired: boolean
}

export type EvaluationRejectCannedRemark = {
  id: string
  label: string
  text: string
}

function formatFreeTimeLabel(iso: string): string {
  return formatDate(iso.includes('T') ? iso : `${iso}T12:00:00`)
}

export function buildEvaluationRejectCannedRemarks(
  ctx: EvaluationRejectRemarksContext,
): EvaluationRejectCannedRemark[] {
  const ref = ctx.referenceNo.trim() || 'this pre-forecast'
  const container = ctx.containerNo.trim() || 'the container'

  if (ctx.freeTimeIso && ctx.freeTimeExpired) {
    const until = formatFreeTimeLabel(ctx.freeTimeIso)
    return [
      {
        id: 'expired-det-dem',
        label: 'Expired · DET-DEM',
        text:
          `Pre-forecast ${ref} (${container}) is rejected because CRO/eDO free time expired on ${until}. `
          + 'A DET-DEM record is opened for shipping line payment proof. Upload the receipt in DET-DEM and wait for ICS verification before resubmitting.',
      },
      {
        id: 'expired-short',
        label: 'Expired · short',
        text:
          `Rejected: CRO/eDO free time ended ${until} for ${ref}. Complete DET-DEM (shipping line payment proof) before filing again.`,
      },
    ]
  }

  if (ctx.freeTimeIso && !ctx.freeTimeExpired) {
    const until = formatFreeTimeLabel(ctx.freeTimeIso)
    return [
      {
        id: 'valid-docs',
        label: 'Valid free time · docs',
        text:
          `Pre-forecast ${ref} (${container}) is rejected. CRO/eDO free time is valid until ${until}, `
          + 'but the submission does not meet shipping line requirements. Correct the documents or container details and resubmit.',
      },
      {
        id: 'valid-cro',
        label: 'Valid free time · CRO/eDO',
        text:
          `Rejected for ${ref}: CRO/eDO or supporting documents need correction. Free time remains until ${until}; resubmit once updated.`,
      },
    ]
  }

  return [
    {
      id: 'no-free-time',
      label: 'No free time date',
      text:
        `Pre-forecast ${ref} (${container}) is rejected because CRO/eDO free time is not set or could not be verified. `
        + 'Provide a valid CRO/eDO with a clear free time date, then file again.',
    },
    {
      id: 'no-free-time-compliance',
      label: 'Incomplete CRO/eDO',
      text:
        `Rejected: ${ref} — missing or unclear CRO/eDO free time. Update the CRO/eDO tab and resubmit when complete.`,
    },
  ]
}

export function defaultEvaluationRejectRemark(ctx: EvaluationRejectRemarksContext): string {
  return buildEvaluationRejectCannedRemarks(ctx)[0]?.text ?? ''
}
