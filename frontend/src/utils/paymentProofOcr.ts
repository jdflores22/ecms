import { parsePaymentProofText, type PaymentProofMetadata } from './paymentProofTextParser'

export async function extractPaymentProofMetadata(source: Blob | File | string): Promise<PaymentProofMetadata> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  try {
    const { data } = await worker.recognize(source)
    return parsePaymentProofText(data.text)
  } finally {
    await worker.terminate()
  }
}
