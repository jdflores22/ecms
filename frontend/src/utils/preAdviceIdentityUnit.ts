import type { PreAdviceDocument } from '../services/api'
import { REQUIRED_CONTAINER_PHOTO_CATEGORIES } from '../config/containerPhotoCategories'

export type PreAdviceIdentityUnit = 'Primary' | 'Companion'

export function docIdentityUnit(doc: PreAdviceDocument): PreAdviceIdentityUnit {
  return doc.identityUnit === 'Companion' ? 'Companion' : 'Primary'
}

export function filterDocsForUnit(
  documents: PreAdviceDocument[],
  unit: PreAdviceIdentityUnit,
): PreAdviceDocument[] {
  return documents.filter((d) => docIdentityUnit(d) === unit)
}

export function countIdentityPhotoProgress(
  documents: PreAdviceDocument[],
  pendingKeys: string[],
  unit: PreAdviceIdentityUnit,
): number {
  const unitDocs = filterDocsForUnit(documents, unit)
  return REQUIRED_CONTAINER_PHOTO_CATEGORIES.filter(
    (c) =>
      unitDocs.some((d) => d.category === c.value) ||
      pendingKeys.includes(`${unit}:${c.value}`),
  ).length
}

export function missingIdentityPhotoLabels(
  documents: PreAdviceDocument[],
  pendingKeys: string[],
  unit: PreAdviceIdentityUnit,
): string[] {
  const unitDocs = filterDocsForUnit(documents, unit)
  return REQUIRED_CONTAINER_PHOTO_CATEGORIES.filter(
    (c) =>
      !unitDocs.some((d) => d.category === c.value) &&
      !pendingKeys.includes(`${unit}:${c.value}`),
  ).map((c) => c.label)
}

export function unitIdentityPhotosComplete(
  documents: PreAdviceDocument[],
  pendingKeys: string[],
  unit: PreAdviceIdentityUnit,
): boolean {
  return missingIdentityPhotoLabels(documents, pendingKeys, unit).length === 0
}

export function unitIdentityPhotoProgress(
  documents: PreAdviceDocument[],
  pendingKeys: string[],
  unit: PreAdviceIdentityUnit,
): { uploaded: number; total: number } {
  const total = REQUIRED_CONTAINER_PHOTO_CATEGORIES.length
  const uploaded = countIdentityPhotoProgress(documents, pendingKeys, unit)
  return { uploaded, total }
}

export function hasCroEdoForUnit(
  documents: PreAdviceDocument[],
  unit: PreAdviceIdentityUnit,
  primaryHasVerifiedCro: boolean,
): boolean {
  if (unit === 'Primary' && primaryHasVerifiedCro) return true
  return filterDocsForUnit(documents, unit).some((d) => d.category === 'CroEdo')
}
