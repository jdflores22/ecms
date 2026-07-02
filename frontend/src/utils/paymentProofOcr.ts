import {
  mergePaymentProofProvider,
  parsePaymentProofText,
  type PaymentProofMetadata,
} from './paymentProofTextParser'
import { detectPaymentProviderFromImage } from './paymentProofImageAnalysis'

export async function extractPaymentProofMetadata(
  source: Blob | File | string,
): Promise<PaymentProofMetadata> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  try {
    const { data } = await worker.recognize(source)
    const fromText = parsePaymentProofText(data.text)
    const fromImage = await detectPaymentProviderFromImage(source)
    const provider = mergePaymentProofProvider(fromText.provider, fromImage, data.text)
    return {
      referenceNo: fromText.referenceNo,
      transactionAt: fromText.transactionAt,
      provider,
      qrphInvoiceNo: fromText.qrphInvoiceNo,
    }
  } finally {
    await worker.terminate()
  }
}
