/** Wording after return payment is verified — one PDF/QR, tied to approved pre-forecast(s). */
export const confirmedPreForecastCopy = {
  label: 'Confirmed pre-forecast',
  pdfTitle: 'Confirmed pre-forecast PDF',
  pdfSubtitle: 'Generated after payment approval',
  progressStepLabel: 'Confirmed pre-forecast',
  progressStepDetailSingle: 'PDF & QR published',
  progressStepDetailBackToBack: 'Container A & B · PDF & QR',
  paidAlertSingle:
    'Payment verified. Your confirmed pre-forecast PDF is ready to download, and the pre-forecast QR is published for depot gate-in.',
  paidAlertBackToBack:
    'Payment verified. Your confirmed pre-forecast PDF covers Container A and Container B. The pre-forecast QR is published for depot gate-in.',
  pilotFeeConfirm: 'Your confirmed pre-forecast PDF and QR will be issued right away.',
  downloadFailed: 'Failed to download confirmed pre-forecast PDF.',
  downloadUnavailable: 'Confirmed pre-forecast PDF is available after payment is approved.',
} as const

export type ConfirmedPreForecastLine = {
  roleLabel: string
  referenceNo: string
  containerNo: string
  sizeTypeLine?: string
}

/** One or two lines (back-to-back) for payment summary / paid cards. */
export function confirmedPreForecastLines(
  preAdvice: {
    referenceNo: string
    containerNo: string
    containerSize?: string | null
    containerType?: string | null
    isBackToBack?: boolean
    backToBackCompanionContainerNo?: string | null
    backToBackCompanionContainerSize?: string | null
    backToBackCompanionContainerType?: string | null
  },
  roleLabelPrimary: string,
  roleLabelCompanion: string,
  formatSizeType: (size: string | null | undefined, type: string | null | undefined) => string,
): ConfirmedPreForecastLine[] {
  const primary: ConfirmedPreForecastLine = {
    roleLabel: roleLabelPrimary,
    referenceNo: preAdvice.referenceNo,
    containerNo: preAdvice.containerNo,
    sizeTypeLine: formatSizeType(preAdvice.containerSize, preAdvice.containerType),
  }
  if (
    preAdvice.isBackToBack &&
    preAdvice.backToBackCompanionContainerNo?.trim()
  ) {
    return [
      primary,
      {
        roleLabel: roleLabelCompanion,
        referenceNo: preAdvice.referenceNo,
        containerNo: preAdvice.backToBackCompanionContainerNo.trim(),
        sizeTypeLine: formatSizeType(
          preAdvice.backToBackCompanionContainerSize ?? '20',
          preAdvice.backToBackCompanionContainerType,
        ),
      },
    ]
  }
  return [primary]
}

export function formatConfirmedPreForecastValue(line: ConfirmedPreForecastLine): string {
  const parts = [line.referenceNo, line.containerNo]
  if (line.sizeTypeLine?.trim()) parts.push(line.sizeTypeLine.trim())
  return parts.join(' · ')
}
