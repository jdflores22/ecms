import { Paper, Typography } from '@mui/material'
import { hexToRgba, ICS_PRIMARY } from '../layout/DetailPagePrimitives'

const primaryDark = ICS_PRIMARY

export function DepotScheduleSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        mb: 2,
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: primaryDark }}>
        {title}
      </Typography>
      {children}
    </Paper>
  )
}

export function DepotScheduleInfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: { xs: 1.5, sm: 2 },
        p: { xs: 0.5, sm: 0 },
        bgcolor: 'transparent',
        border: 'none',
      }}
    >
      {children}
    </Paper>
  )
}

export function DepotDetailTile({
  label,
  value,
  mono,
  span,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  span?: boolean
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: hexToRgba(primaryDark, 0.02),
        ...(span && { gridColumn: { xs: '1', sm: '1 / -1' } }),
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          mt: 0.75,
          fontWeight: 600,
          fontSize: '0.95rem',
          wordBreak: 'break-word',
          ...(mono && { fontFamily: 'monospace' }),
        }}
      >
        {value}
      </Typography>
    </Paper>
  )
}
