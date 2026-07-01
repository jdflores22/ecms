import { parseAtwDocumentText, type AtwDocumentMetadata } from './atwDocumentParser'

export async function extractAtwDocumentMetadata(source: Blob | File | string): Promise<AtwDocumentMetadata> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  try {
    const { data } = await worker.recognize(source)
    return parseAtwDocumentText(data.text)
  } finally {
    await worker.terminate()
  }
}
