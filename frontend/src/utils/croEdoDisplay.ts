import type { PreAdviceDocument } from '../services/api'
import { docIdentityUnit } from './preAdviceIdentityUnit'

/** User-facing chip for CRO link type — never shows internal "Legacy" wording. */
export function croEdoLinkTypeChipLabel(linkType: string | undefined | null): string | null {
  if (linkType === 'IcsVerified') return 'QR verified'
  return null
}

export function formatCroEdoDocumentLabel(
  doc: PreAdviceDocument,
  options?: { isBackToBack?: boolean; maxNameLength?: number },
): string {
  const maxLen = options?.maxNameLength ?? 32
  const name = doc.fileName || 'CRO/eDO file'
  const trimmed = name.length > maxLen ? `${name.slice(0, maxLen - 1)}…` : name
  if (options?.isBackToBack) {
    const role = docIdentityUnit(doc) === 'Companion' ? 'Container B' : 'Container A'
    return `${role} · ${trimmed}`
  }
  return trimmed
}
