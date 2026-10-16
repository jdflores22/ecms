import { Chip, Tooltip } from '@mui/material'
import type { PreAdvice } from '../../services/api'
import { formatContainerSizeLabel } from '../../utils/containerSize'
import { getPreAdviceContainerUnit } from '../../utils/preAdviceContainerUnit'

export type PreAdviceBackToBackFields = Pick<
  PreAdvice,
  | 'isBackToBack'
  | 'containerNo'
  | 'containerSize'
  | 'containerType'
  | 'backToBackCompanionContainerNo'
  | 'backToBackCompanionContainerSize'
  | 'backToBackCompanionContainerType'
>

export function backToBackTooltip(item: PreAdviceBackToBackFields): string {
  if (!item.isBackToBack) return ''
  const primary = getPreAdviceContainerUnit(item as PreAdvice, 'Primary')
  const companion = getPreAdviceContainerUnit(item as PreAdvice, 'Companion')
  return `Primary ${primary.containerNo} (${primary.sizeTypeLine}) · Companion ${companion.containerNo} (${companion.sizeTypeLine})`
}

export function evaluationHeroSubtitle(item: PreAdvice): string {
  const size = formatContainerSizeLabel(item.containerSize)
  const type = item.containerType?.trim() || '—'
  if (item.isBackToBack && item.backToBackCompanionContainerNo?.trim()) {
    const companion = getPreAdviceContainerUnit(item, 'Companion')
    return `${item.shippingLineName} · ${item.containerNo} + ${companion.containerNo} · ${size} · ${type} · Back-to-back`
  }
  return `${item.shippingLineName} · ${item.containerNo} · ${size} · ${type}`
}

type Props = {
  item: PreAdviceBackToBackFields
  size?: 'small' | 'medium'
}

export default function PreAdviceBackToBackChip({ item, size = 'small' }: Props) {
  if (!item.isBackToBack) return null

  return (
    <Tooltip title={backToBackTooltip(item)} placement="top" enterDelay={300}>
      <Chip
        label="Back-to-Back"
        size={size}
        variant="outlined"
        sx={{
          fontWeight: 700,
          fontSize: size === 'small' ? '0.7rem' : undefined,
          height: size === 'small' ? 22 : undefined,
          borderColor: 'divider',
          color: 'text.secondary',
        }}
      />
    </Tooltip>
  )
}
