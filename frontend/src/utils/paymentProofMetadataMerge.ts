import type { PaymentProofMetadata } from './paymentProofTextParser'

/** Merge server + client ensemble results — keep the best non-null field from each pass. */
export function mergeProofMetadataPasses(
  ...layers: Array<Partial<PaymentProofMetadata> | null | undefined>
): PaymentProofMetadata {
  const merged: PaymentProofMetadata = {
    referenceNo: null,
    qrphInvoiceNo: null,
    transactionAt: null,
    provider: null,
  }

  for (const layer of layers) {
    if (!layer) continue
    if (!merged.referenceNo && layer.referenceNo) merged.referenceNo = layer.referenceNo
    if (!merged.qrphInvoiceNo && layer.qrphInvoiceNo) merged.qrphInvoiceNo = layer.qrphInvoiceNo
    if (!merged.transactionAt && layer.transactionAt) merged.transactionAt = layer.transactionAt
    if (!merged.provider && layer.provider && layer.provider !== 'unknown') {
      merged.provider = layer.provider
    }
  }

  return merged
}
