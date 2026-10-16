import type { PreAdvice } from '../services/api'
import { formatContainerSizeLabel } from './containerSize'
import type { PreAdviceIdentityUnit } from './preAdviceIdentityUnit'

export type PreAdviceContainerUnitMeta = {
  unit: PreAdviceIdentityUnit
  containerNo: string
  sizeTypeLine: string
}

/** Shared line under container number: `20 · GP` */
export function formatContainerSizeTypeLine(
  size: string | null | undefined,
  type: string | null | undefined,
): string {
  const sizeLabel = size?.trim() ? formatContainerSizeLabel(size) : '—'
  const typeLabel = type?.trim() || '—'
  return `${sizeLabel} · ${typeLabel}`
}

export function getPreAdviceContainerUnit(
  item: PreAdvice,
  unit: PreAdviceIdentityUnit,
): PreAdviceContainerUnitMeta {
  if (unit === 'Companion') {
    return {
      unit: 'Companion',
      containerNo: item.backToBackCompanionContainerNo?.trim().toUpperCase() || '—',
      sizeTypeLine: formatContainerSizeTypeLine(
        item.backToBackCompanionContainerSize ?? '20',
        item.backToBackCompanionContainerType ?? '',
      ),
    }
  }

  return {
    unit: 'Primary',
    containerNo: item.containerNo.trim().toUpperCase(),
    sizeTypeLine: formatContainerSizeTypeLine(item.containerSize, item.containerType),
  }
}

export function identityPhotosSectionTitle(containerNo: string): string {
  return `Identity photos — ${containerNo}`
}
