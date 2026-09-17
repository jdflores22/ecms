import { Box, Paper, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import type { SvgIconComponent } from '@mui/icons-material'
import { portalColors } from '../../theme/portalTheme'
import { portalCardShadow } from '../../theme/portalTheme'

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export type DashboardMetricTileProps = {
  label: string
  value: ReactNode
  color: string
  icon: SvgIconComponent
  description?: string
  highlighted?: boolean
  onClick?: () => void
  disabled?: boolean
}

export function DashboardMetricTile({
  label,
  value,
  color,
  icon: Icon,
  description,
  highlighted,
  onClick,
  disabled,
}: DashboardMetricTileProps) {
  const interactive = Boolean(onClick) && !disabled

  return (
    <Paper
      elevation={0}
      onClick={interactive ? onClick : undefined}
      sx={{
        p: 1.25,
        borderRadius: '0.75rem',
        border: '1px solid',
        borderColor: highlighted ? hexToRgba(color, 0.4) : portalColors.border,
        bgcolor: highlighted ? hexToRgba(color, 0.04) : portalColors.bgWhite,
        boxShadow: portalCardShadow,
        minWidth: 0,
        cursor: interactive ? 'pointer' : 'default',
        opacity: disabled ? 0.65 : 1,
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        ...(interactive && {
          '&:hover': {
            borderColor: hexToRgba(color, 0.45),
            bgcolor: hexToRgba(color, 0.06),
          },
        }),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            bgcolor: hexToRgba(color, 0.1),
            color,
          }}
        >
          <Icon sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, lineHeight: 1.2, display: 'block' }}
          >
            {label}
          </Typography>
          <Typography
            component="div"
            sx={{
              fontWeight: 800,
              fontSize: '1.25rem',
              lineHeight: 1.2,
              color,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
          </Typography>
        </Box>
        {highlighted && (
          <Typography
            variant="caption"
            sx={{
              flexShrink: 0,
              px: 0.75,
              py: 0.15,
              borderRadius: 99,
              fontWeight: 700,
              fontSize: '0.65rem',
              color,
              bgcolor: hexToRgba(color, 0.12),
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            Action
          </Typography>
        )}
      </Box>
      {description && (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ mt: 0.75, display: 'block', lineHeight: 1.35 }}
        >
          {description}
        </Typography>
      )}
    </Paper>
  )
}

export const dashboardMetricGridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    md: 'repeat(3, minmax(0, 1fr))',
    xl: 'repeat(4, minmax(0, 1fr))',
  },
  gap: 1,
  minWidth: 0,
}

export const dashboardSectionPaperSx = {
  p: 1.75,
  borderRadius: '0.75rem',
  border: `1px solid ${portalColors.border}`,
  bgcolor: portalColors.bgWhite,
  boxShadow: portalCardShadow,
}
