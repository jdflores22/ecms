import {
  applyPaymentProofExtractionHints,
  mergePaymentProofProvider,
  parsePaymentProofTexts,
  type PaymentProofExtractionHints,
  type PaymentProofMetadata,
} from './paymentProofTextParser'
import { detectPaymentProviderFromImage } from './paymentProofImageAnalysis'
import {
  preprocessPaymentProofForOcr,
  preprocessPaymentProofVariants,
  isOcrReadyBlob,
  type OcrPreprocessVariant,
  type ProofLayoutProfile,
} from './paymentProofImagePreprocess'
import { isPaddleOcrSupported, paddleOcrText } from './paymentProofPaddleOcr'
import { readImageExifDate } from './paymentProofImageExif'
import { extractStatusClockFromImage } from './paymentProofStatusClock'
import type { StatusClock } from './paymentProofDateParts'

export type { PaymentProofExtractionHints }
export { preloadPaddleOcr, isPaddleOcrSupported } from './paymentProofPaddleOcr'
export { BROWSER_OCR_ENGINES, SERVER_OCR_ENGINES, PAYMENT_PROOF_OCR_STACK } from './paymentProofOcrEngines'

function isComplete(meta: PaymentProofMetadata): boolean {
  const hasId = Boolean(meta.referenceNo || meta.paymentId)
  return Boolean(
    hasId &&
      meta.qrphInvoiceNo &&
      meta.transactionAt &&
      meta.provider &&
      meta.provider !== 'unknown',
  )
}

type OcrPassConfig = {
  source: Blob | File | string
  psm: import('tesseract.js').PSM
  passWeight: number
  variant?: OcrPreprocessVariant
  engine: 'tesseract' | 'paddle'
}

async function toBlob(source: Blob | File | string): Promise<Blob | null> {
  if (source instanceof Blob) return source
  if (typeof source === 'string') {
    try {
      const response = await fetch(source)
      if (!response.ok) return null
      return await response.blob()
    } catch {
      return null
    }
  }
  return source
}

async function ocrTextTesseract(
  worker: import('tesseract.js').Worker,
  source: Blob | File | string,
  psm: import('tesseract.js').PSM,
  whitelist?: string,
): Promise<string> {
  if (source instanceof Blob && !(await isOcrReadyBlob(source))) {
    return ''
  }
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: psm,
      preserve_interword_spaces: '1',
      ...(whitelist ? { tessedit_char_whitelist: whitelist } : {}),
    })
    const { data } = await worker.recognize(source)
    return data.text ?? ''
  } catch {
    return ''
  }
}

function passWeightForVariant(variant?: OcrPreprocessVariant, layout?: ProofLayoutProfile): number {
  if (!variant) return layout?.isZoomedMetadata ? 10 : 7
  if (variant === 'zoomedFull') return 14
  if (variant === 'zoomedDateRow') return 16
  if (variant === 'zoomedDetails') return 15
  if (variant === 'standard') return 5
  if (variant === 'enhanced') return 5
  if (variant === 'statusBand') return 7
  if (variant === 'metadataBand') return 8
  if (variant === 'dateLine') return 12
  if (variant === 'dateBand') return 9
  return 4
}

function paddleWeightForVariant(
  variant?: 'full' | OcrPreprocessVariant,
  layout?: ProofLayoutProfile,
): number {
  if (!variant || variant === 'full') return layout?.isZoomedMetadata ? 18 : 15
  if (variant === 'zoomedFull') return 20
  if (variant === 'zoomedDateRow') return 19
  if (variant === 'zoomedDetails') return 18
  if (variant === 'dateLine') return 17
  if (variant === 'metadataBand') return 13
  if (variant === 'dateBand') return 14
  if (variant === 'statusBand') return 12
  return 11
}

function psmForVariant(
  PSM: typeof import('tesseract.js').PSM,
  variant?: OcrPreprocessVariant,
): import('tesseract.js').PSM {
  if (
    variant === 'dateLine' ||
    variant === 'zoomedDateRow' ||
    variant === 'statusBand'
  ) {
    return PSM.SINGLE_LINE
  }
  if (
    variant === 'dateBand' ||
    variant === 'metadataBand' ||
    variant === 'zoomedFull' ||
    variant === 'zoomedDetails'
  ) {
    return PSM.SINGLE_BLOCK
  }
  return PSM.AUTO
}

function tesseractWhitelistForVariant(variant?: OcrPreprocessVariant): string | undefined {
  if (
    variant === 'dateLine' ||
    variant === 'dateBand' ||
    variant === 'zoomedDateRow' ||
    variant === 'zoomedFull' ||
    variant === 'zoomedDetails'
  ) {
    return '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz,:/. AMPamp₱P'
  }
  if (variant === 'statusBand') {
    return '0123456789:AMPamp. '
  }
  return undefined
}

async function buildPaddlePasses(
  source: Blob | File | string,
  variants: Array<{ variant: OcrPreprocessVariant; blob: Blob; layout: ProofLayoutProfile }>,
): Promise<Array<{ blob: Blob; weight: number; label: string }>> {
  if (!isPaddleOcrSupported()) return []

  const layout = variants[0]?.layout
  const passes: Array<{ blob: Blob; weight: number; label: string }> = []
  const fullBlob = await toBlob(source)
  if (fullBlob) {
    passes.push({
      blob: fullBlob,
      weight: paddleWeightForVariant('full', layout),
      label: 'full',
    })
  }

  const priority: OcrPreprocessVariant[] = layout?.isZoomedMetadata
    ? ['zoomedFull', 'zoomedDateRow', 'zoomedDetails', 'enhanced', 'standard']
    : ['dateLine', 'metadataBand', 'dateBand', 'statusBand']

  for (const name of priority) {
    const match = variants.find((item) => item.variant === name)
    if (match) {
      passes.push({
        blob: match.blob,
        weight: paddleWeightForVariant(name, layout),
        label: name,
      })
    }
  }

  return passes
}

export async function extractPaymentProofMetadata(
  source: Blob | File | string,
  hints?: PaymentProofExtractionHints,
): Promise<PaymentProofMetadata> {
  const isPdf = typeof source === 'string' && source.toLowerCase().endsWith('.pdf')
  const variants = isPdf ? [] : await preprocessPaymentProofVariants(source).catch(() => [])
  const layout = variants[0]?.layout

  const texts: string[] = []
  const weights: number[] = []
  let fromText: PaymentProofMetadata = {
    referenceNo: null,
    paymentId: null,
    qrphInvoiceNo: null,
    transactionAt: null,
    provider: null,
  }

  const mergePass = (text: string, weight: number) => {
    if (!text.trim()) return
    texts.push(text)
    weights.push(weight)
    fromText = parsePaymentProofTexts(texts, weights)
  }

  const sourceBlob = await toBlob(source)
  const exifAt = sourceBlob ? await readImageExifDate(sourceBlob) : null
  const statusBandBlob = variants.find((item) => item.variant === 'statusBand')?.blob ?? null
  const statusClock =
    !isPdf && !layout?.isZoomedMetadata
      ? await extractStatusClockFromImage(source, statusBandBlob)
      : null

  if (!isPdf) {
    const paddlePasses = await buildPaddlePasses(source, variants)
    for (const pass of paddlePasses) {
      const text = await paddleOcrText(pass.blob)
      mergePass(text, pass.weight)
      if (isComplete(fromText)) {
        return finalizeMetadata(fromText, source, variants, texts, hints, {
          statusClock,
          exifAt,
        })
      }
    }
  }

  const { createWorker, PSM } = await import('tesseract.js')
  const worker = await createWorker('eng', undefined, {
    logger: () => {
      /* Tesseract progress logs are noisy in devtools; OCR still runs normally. */
    },
  })

  try {
    const passes: OcrPassConfig[] = [
      {
        source,
        psm: PSM.AUTO,
        passWeight: passWeightForVariant(undefined, layout),
        engine: 'tesseract',
      },
      ...variants.map((item) => ({
        source: item.blob,
        psm: psmForVariant(PSM, item.variant),
        passWeight: passWeightForVariant(item.variant, layout),
        variant: item.variant,
        engine: 'tesseract' as const,
      })),
    ]

    for (const pass of passes) {
      const text = await ocrTextTesseract(
        worker,
        pass.source,
        pass.psm,
        tesseractWhitelistForVariant(pass.variant),
      )
      mergePass(text, pass.passWeight)
      if (isComplete(fromText)) break
    }
  } finally {
    await worker.terminate()
  }

  return finalizeMetadata(fromText, source, variants, texts, hints, {
    statusClock,
    exifAt,
  })
}

async function finalizeMetadata(
  fromText: PaymentProofMetadata,
  source: Blob | File | string,
  variants: Array<{ variant: string; blob: Blob }>,
  texts: string[],
  hints?: PaymentProofExtractionHints,
  evidence?: { statusClock: StatusClock | null; exifAt: string | null },
): Promise<PaymentProofMetadata> {
  const mergedOcr = texts.join('\n')
  const dateBandBlob =
    variants.find((v) => v.variant === 'dateBand')?.blob ??
    variants.find((v) => v.variant === 'zoomedDateRow')?.blob
  const metadataBandBlob =
    variants.find((v) => v.variant === 'metadataBand')?.blob ??
    variants.find((v) => v.variant === 'zoomedDetails')?.blob
  const standardBlob =
    variants.find((v) => v.variant === 'standard')?.blob ??
    variants.find((v) => v.variant === 'zoomedFull')?.blob
  const preprocessForColor =
    metadataBandBlob ??
    dateBandBlob ??
    standardBlob ??
    (await preprocessPaymentProofForOcr(source, 'enhanced').catch(() => null))
  const fromImage = await detectPaymentProviderFromImage(preprocessForColor ?? source)
  const provider = mergePaymentProofProvider(fromText.provider, fromImage, mergedOcr)

  const withHints = applyPaymentProofExtractionHints(
    {
      referenceNo: fromText.referenceNo,
      paymentId: fromText.paymentId,
      transactionAt: fromText.transactionAt,
      provider,
      qrphInvoiceNo: fromText.qrphInvoiceNo,
    },
    texts,
    hints,
    {
      paidAt: hints?.paidAt,
      statusClock: evidence?.statusClock,
      exifAt: evidence?.exifAt,
    },
  )

  return withHints
}
