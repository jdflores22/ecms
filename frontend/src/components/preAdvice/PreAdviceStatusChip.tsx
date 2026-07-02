import { Chip } from '@mui/material'
import { getPreAdviceListStatus, lightStatusChipSx } from '../../utils/scheduleStatus'

export function PreAdviceStatusChip({
  status,
  scheduleStatus,
}: {
  status: string
  scheduleStatus?: string | null
}) {
  const badge = getPreAdviceListStatus({ status, scheduleStatus })
  return (
    <Chip label={badge.label} size="small" variant="outlined" sx={lightStatusChipSx(badge)} />
  )
}
