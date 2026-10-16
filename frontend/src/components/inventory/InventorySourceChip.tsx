import { Chip } from '@mui/material'
import type { ContainerInventorySource } from '../../services/api'
import { INVENTORY_SOURCE_LABELS } from '../../utils/inventorySummary'

export default function InventorySourceChip({ source }: { source: ContainerInventorySource }) {
  const label = INVENTORY_SOURCE_LABELS[source] ?? source
  return (
    <Chip
      size="small"
      label={label}
      variant="outlined"
      sx={{
        fontWeight: 600,
        ...(source === 'Logicteck'
          ? { borderColor: 'secondary.main', color: 'secondary.dark' }
          : {}),
      }}
    />
  )
}
