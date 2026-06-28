import { Chip } from '@mui/material'

const damageRed = '#C62828'

export default function DamageReportChip() {
  return (
    <Chip
      label="Damage reported"
      size="small"
      sx={{
        fontWeight: 700,
        bgcolor: damageRed,
        color: '#fff',
        '& .MuiChip-label': { px: 1 },
      }}
    />
  )
}

export function DamageReportChipMuted() {
  return (
    <Chip
      label="—"
      size="small"
      variant="outlined"
      sx={{ color: 'text.disabled', borderColor: 'divider' }}
    />
  )
}
