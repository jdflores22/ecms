import axios from 'axios'

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

export interface CertificateVerificationResult {
  valid: boolean
  status: 'valid' | 'revoked' | 'not_found' | string
  message: string
  documentTypeLabel?: string | null
  atwNumber?: string | null
  referenceNo?: string | null
  shippingLineName?: string | null
  depotName?: string | null
  truckerName?: string | null
  containerNo?: string | null
  containerSize?: string | null
  containerType?: string | null
  destination?: string | null
  issuedAt?: string | null
  integritySealed: boolean
}

export async function verifyCertificatePublic(token: string): Promise<CertificateVerificationResult> {
  const { data } = await publicApi.get<CertificateVerificationResult>(
    `/public/certificates/verify/${encodeURIComponent(token.trim())}`,
  )
  return data
}
