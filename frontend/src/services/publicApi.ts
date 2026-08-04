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

export interface CroEdoVerificationLine {
  lineNo: number
  containerNumber: string
  size: string
  type: string
  seal: string
  haulerName: string
  plateNo: string
  demurrageValidUntil: string
  returnEmptyTo: string
}

export interface CroEdoVerificationResult {
  valid: boolean
  status: 'valid' | 'cancelled' | 'not_found' | string
  message: string
  referenceNo?: string | null
  documentStatus?: string | null
  shippingLineId?: number | null
  shippingLineName?: string | null
  consigneeNotifyParty?: string | null
  blNumber?: string | null
  vesselVoyageNumber?: string | null
  brokerName?: string | null
  issuedAt?: string | null
  lines?: CroEdoVerificationLine[] | null
}

export async function verifyCertificatePublic(token: string): Promise<CertificateVerificationResult> {
  const { data } = await publicApi.get<CertificateVerificationResult>(
    `/public/certificates/verify/${encodeURIComponent(token.trim())}`,
  )
  return data
}

export async function verifyCroEdoPublic(token: string): Promise<CroEdoVerificationResult> {
  const { data } = await publicApi.get<CroEdoVerificationResult>(
    `/public/cro-edo/verify/${encodeURIComponent(token.trim())}`,
  )
  return data
}
