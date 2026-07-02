import type { OcrResult } from '@paddleocr/paddleocr-js'

type PaddleInstance = {
  predict: (
    image: Blob | File,
    params?: { textRecScoreThresh?: number },
  ) => Promise<OcrResult[]>
}

let paddleInstancePromise: Promise<PaddleInstance | null> | null = null

async function createPaddleInstance(): Promise<PaddleInstance | null> {
  try {
    const { PaddleOCR } = await import('@paddleocr/paddleocr-js')
    return (await PaddleOCR.create({
      lang: 'en',
      ocrVersion: 'PP-OCRv5',
      worker: true,
      ortOptions: {
        backend: 'wasm',
        wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/',
        numThreads: 1,
        simd: true,
      },
    })) as PaddleInstance
  } catch {
    return null
  }
}

export function isPaddleOcrSupported(): boolean {
  return typeof window !== 'undefined' && typeof Worker !== 'undefined'
}

/** Lazy singleton — first call downloads PP-OCRv5 English models (~15–25 MB). */
export async function getPaddleOcr(): Promise<PaddleInstance | null> {
  if (!isPaddleOcrSupported()) return null
  if (!paddleInstancePromise) {
    paddleInstancePromise = createPaddleInstance()
  }
  return paddleInstancePromise
}

function sortOcrItemsTopToBottom(result: OcrResult): string {
  return [...result.items]
    .filter((item) => item.text.trim() && item.score >= 0.2)
    .sort((a, b) => {
      const ay = a.poly[0]?.[1] ?? 0
      const by = b.poly[0]?.[1] ?? 0
      if (Math.abs(ay - by) > 14) return ay - by
      return (a.poly[0]?.[0] ?? 0) - (b.poly[0]?.[0] ?? 0)
    })
    .map((item) => item.text.trim())
    .join('\n')
}

export async function paddleOcrText(source: Blob | File): Promise<string> {
  const ocr = await getPaddleOcr()
  if (!ocr) return ''

  try {
    const [result] = await ocr.predict(source, { textRecScoreThresh: 0.25 })
    if (!result?.items?.length) return ''
    return sortOcrItemsTopToBottom(result)
  } catch {
    return ''
  }
}

export async function preloadPaddleOcr(): Promise<boolean> {
  const instance = await getPaddleOcr()
  return instance !== null
}
