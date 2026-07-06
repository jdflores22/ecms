export const CERTIFICATE_PREVIEW_LAYOUT_KEY = 'ecms.certificatePreview.layout'
export const CERTIFICATE_PREVIEW_TITLE_KEY = 'ecms.certificatePreview.title'
export const CERTIFICATE_PREVIEW_DOCUMENT_TYPE_KEY = 'ecms.certificatePreview.documentType'

export function stashCertificatePreview(layoutJson: string, title: string, documentType = 'Atw') {
  sessionStorage.setItem(CERTIFICATE_PREVIEW_LAYOUT_KEY, layoutJson)
  sessionStorage.setItem(CERTIFICATE_PREVIEW_TITLE_KEY, title)
  sessionStorage.setItem(CERTIFICATE_PREVIEW_DOCUMENT_TYPE_KEY, documentType)
}

export function readStashedCertificatePreview(): {
  layoutJson: string
  title: string
  documentType: string
} | null {
  const layoutJson = sessionStorage.getItem(CERTIFICATE_PREVIEW_LAYOUT_KEY)
  if (!layoutJson) return null
  const title = sessionStorage.getItem(CERTIFICATE_PREVIEW_TITLE_KEY) ?? 'Certificate preview'
  const documentType = sessionStorage.getItem(CERTIFICATE_PREVIEW_DOCUMENT_TYPE_KEY) ?? 'Atw'
  return { layoutJson, title, documentType }
}

export function clearStashedCertificatePreview() {
  sessionStorage.removeItem(CERTIFICATE_PREVIEW_LAYOUT_KEY)
  sessionStorage.removeItem(CERTIFICATE_PREVIEW_TITLE_KEY)
  sessionStorage.removeItem(CERTIFICATE_PREVIEW_DOCUMENT_TYPE_KEY)
}
