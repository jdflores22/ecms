import { Chip, Tooltip } from '@mui/material'
import type { ContainerInventorySource } from '../../services/api'

export type InventoryFootprint = 'ICS' | 'LOGICTECK'

export function inventoryFootprintFromSource(source: ContainerInventorySource): InventoryFootprint {
  return source === 'Logicteck' ? 'LOGICTECK' : 'ICS'
}

const FOOTPRINT_TOOLTIP: Record<InventoryFootprint, string> = {
  ICS: 'Identity and photos from ICS (pre-forecast workflow or manual yard entry).',
  LOGICTECK: 'Identity and yard data from the LOGICTECK ICS inventory feed.',
}

export default function InventoryFootprintBadge({
  source,
  footprint,
}: {
  source?: ContainerInventorySource
  footprint?: InventoryFootprint
}) {
  const label = footprint ?? inventoryFootprintFromSource(source ?? 'Workflow')
  const tooltip = FOOTPRINT_TOOLTIP[label]

  return (
    <Tooltip title={tooltip} enterDelay={400}>
      <Chip
        size="small"
        label={label}
        variant="outlined"
        sx={{
          height: 20,
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: 0.3,
          '& .MuiChip-label': { px: 0.75, py: 0 },
          ...(label === 'LOGICTECK'
            ? { borderColor: 'secondary.main', color: 'secondary.dark' }
            : { borderColor: 'primary.main', color: 'primary.dark' }),
        }}
      />
    </Tooltip>
  )
}
