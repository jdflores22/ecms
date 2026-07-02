import type { StatusClock } from './paymentProofDateParts'
import { normalizeMeridiem } from './paymentProofDateParts'
import { preprocessPaymentProofForOcr, isOcrReadyBlob } from './paymentProofImagePreprocess'
import { paddleOcrText } from './paymentProofPaddleOcr'

function defaultMeridiem(hour: number, explicit?: string): string {
  if (explicit) return normalizeMeridiem(explicit)
  if (hour >= 7 && hour <= 11) return 'AM'
  return 'PM'
}

export function parseStatusClockFromText(text: string): StatusClock | null {
  const fixed = text
    .replace(/[oO]/g, ':')
    .replace(/(\d)\s+(\d{2})\s*(AM|PM|am|pm|eM|pM|pn)\b/gi, '$1:$2 $3')
    .replace(/\s+/g, ' ')

  const candidates: Array<StatusClock & { index: number }> = []
  const pattern =
    /(?<![\d])(\d{1,2})\s*[:.]\s*(\d{2})(?:\s*(AM|PM|am|pm|eM|pM|pn))?(?![\d])/gi

  let match: RegExpExecArray | null
  while ((match = pattern.exec(fixed)) !== null) {
    const hour = Number(match[1])
    const minute = Number(match[2])
    if (hour < 1 || hour > 12 || minute > 59) continue
    if (match.index > 2400) break
    candidates.push({
      hour,
      minute,
      meridiem: defaultMeridiem(hour, match[3]),
      index: match.index,
    })
  }

  if (!candidates.length) {
    const glued = fixed.match(/\b(1[0-2]|0?[1-9])([0-5]\d)\s*(AM|PM|eM|pM|pn)?\b/i)
    if (glued) {
      const hour = Number(glued[1])
      const minute = Number(glued[2])
      if (hour >= 1 && hour <= 12 && minute <= 59) {
        return {
          hour,
          minute,
          meridiem: defaultMeridiem(hour, glued[3]),
        }
      }
    }
    return null
  }

  candidates.sort((a, b) => {
    const aTop = a.index < 520 ? 0 : 1
    const bTop = b.index < 520 ? 0 : 1
    if (aTop !== bTop) return aTop - bTop
    return a.index - b.index
  })

  const { index: _index, ...clock } = candidates[0]
  return clock
}

async function ocrStatusClockTesseract(blob: Blob): Promise<string> {
  const { createWorker, PSM } = await import('tesseract.js')
  const worker = await createWorker('eng', undefined, { logger: () => {} })
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      tessedit_char_whitelist: '0123456789:AMPamp. ',
      preserve_interword_spaces: '1',
    })
    const { data } = await worker.recognize(blob)
    return data.text ?? ''
  } catch {
    return ''
  } finally {
    await worker.terminate()
  }
}

/** Read phone status-bar clock from the top band (photos of GCash screens). */
export async function extractStatusClockFromImage(
  source: Blob | File | string,
  statusBandBlob?: Blob | null,
): Promise<StatusClock | null> {
  const band =
    statusBandBlob ??
    (await preprocessPaymentProofForOcr(source, 'statusBand').catch(() => null))
  if (!band || !(await isOcrReadyBlob(band))) return null

  const paddleText = await paddleOcrText(band)
  const fromPaddle = parseStatusClockFromText(paddleText)
  if (fromPaddle) return fromPaddle

  const tessText = await ocrStatusClockTesseract(band)
  return parseStatusClockFromText(tessText)
}
