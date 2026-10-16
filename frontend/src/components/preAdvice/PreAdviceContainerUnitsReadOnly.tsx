import { Box, Chip, Typography } from '@mui/material'
import type { PreAdvice, PreAdviceLookups } from '../../services/api'
import { InfoTile } from '../layout/DetailPagePrimitives'
import { formatContainerSizeLabel } from '../../utils/containerSize'
import { getPreAdviceContainerUnit } from '../../utils/preAdviceContainerUnit'
import { getCapacityGroupKey } from '../../utils/cyAllocation'
import {
  preAdviceUnitChipSx,
  preAdviceUnitRoleLabel,
  preAdviceUnitSectionSx,
} from './preAdviceUnitSectionSx'

type Props = {
  item: PreAdvice
  lookups?: PreAdviceLookups | null
}

function resolveTypeDisplay(
  typeCodeOrLabel: string | null | undefined,
  lookups?: PreAdviceLookups | null,
): string {
  const raw = typeCodeOrLabel?.trim()
  if (!raw) return '—'
  const match = lookups?.containerTypes.find((t) => t.code === raw || t.label === raw)
  return match ? `${match.code} — ${match.label}` : raw
}

const unitGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
  gap: { xs: 1.5, sm: 2 },
} as const

export default function PreAdviceContainerUnitsReadOnly({ item, lookups }: Props) {
  const primary = getPreAdviceContainerUnit(item, 'Primary')
  const companion = item.isBackToBack ? getPreAdviceContainerUnit(item, 'Companion') : null
  const isTwentyFoot = getCapacityGroupKey(item.containerSize) === '20'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, gridColumn: { xs: '1', sm: '1 / -1' } }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        Container information
      </Typography>

      <Box sx={preAdviceUnitSectionSx('primary')}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
          <Chip
            label={preAdviceUnitRoleLabel('primary', item.isBackToBack ? 'containerAb' : 'default')}
            size="small"
            sx={preAdviceUnitChipSx}
          />
          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
            {primary.containerNo}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {primary.sizeTypeLine}
          </Typography>
        </Box>
        <Box sx={unitGridSx}>
          <InfoTile label="Container number" value={primary.containerNo} mono />
          <InfoTile label="Container size" value={formatContainerSizeLabel(item.containerSize)} />
          <InfoTile label="Container type" value={resolveTypeDisplay(item.containerType, lookups)} />
        </Box>
      </Box>

      {item.isBackToBack && companion ? (
        <Box sx={preAdviceUnitSectionSx('companion')}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
            <Chip label={preAdviceUnitRoleLabel('companion', 'containerAb')} size="small" sx={preAdviceUnitChipSx} />
            <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
              {companion.containerNo}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {companion.sizeTypeLine}
            </Typography>
          </Box>
          <Box sx={unitGridSx}>
            <InfoTile label="Container number" value={companion.containerNo} mono />
            <InfoTile
              label="Container size"
              value={formatContainerSizeLabel(item.backToBackCompanionContainerSize ?? '20')}
            />
            <InfoTile
              label="Container type"
              value={resolveTypeDisplay(item.backToBackCompanionContainerType, lookups)}
            />
          </Box>
        </Box>
      ) : isTwentyFoot ? (
        <InfoTile label="Back-to-Back" value="No" />
      ) : null}
    </Box>
  )
}
