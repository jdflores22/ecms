import { Box, Paper, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { appColors, icsOnBrand } from '../../theme/colors'

export const pageHeroText = icsOnBrand

/** Matches /admin/reports hero typography */
export const pageHeroTitleSx = {
  fontWeight: 800,
  fontSize: '1.5rem',
  lineHeight: 1.3,
  color: icsOnBrand.title,
}

export const pageHeroSubtitleSx = {
  color: icsOnBrand.body,
  fontSize: '1rem',
  lineHeight: 1.6,
  maxWidth: 640,
  mt: 0.5,
}

export const pageHeroPaperSx = {
  p: { xs: 2.5, sm: 3 },
  mb: 3,
  borderRadius: '1rem',
  position: 'relative' as const,
  overflow: 'hidden' as const,
  border: 'none',
  background: appColors.icsBrandGradient,
  color: icsOnBrand.title,
  boxShadow: appColors.icsBrandShadow,
}

export const pageHeroOrbSx = {
  position: 'absolute' as const,
  right: -30,
  top: -30,
  width: 140,
  height: 140,
  borderRadius: '50%',
  bgcolor: 'rgba(255, 255, 255, 0.08)',
  pointerEvents: 'none' as const,
}

export const pageHeroIconBoxSx = {
  width: 48,
  height: 48,
  borderRadius: '0.75rem',
  bgcolor: 'rgba(255, 255, 255, 0.14)',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
}

export const pageHeroMutedChipSx = {
  bgcolor: 'rgba(255, 255, 255, 0.12)',
  color: '#fff',
  border: '1px solid rgba(255, 255, 255, 0.22)',
  fontWeight: 600,
}

export const listHeroPrimaryActionSx = {
  bgcolor: '#fff',
  color: appColors.primary,
  fontWeight: 700,
  flexShrink: 0,
  width: { xs: '100%', sm: 'auto' },
  border: '1px solid #fff',
  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.92)', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.14)' },
}

export const listHeroOutlineActionSx = {
  color: '#fff',
  borderColor: 'rgba(255, 255, 255, 0.55)',
  fontWeight: 700,
  flexShrink: 0,
  width: { xs: '100%', sm: 'auto' },
  bgcolor: 'transparent',
  '&:hover': {
    borderColor: '#fff',
    bgcolor: 'rgba(255, 255, 255, 0.1)',
  },
}

type PageHeroProps = {
  icon: ReactNode
  title: string
  titleAddon?: ReactNode
  subtitle?: ReactNode
  chips?: ReactNode
  actions?: ReactNode
}

export function PageHero({ icon, title, titleAddon, subtitle, chips, actions }: PageHeroProps) {
  return (
    <Paper elevation={0} sx={pageHeroPaperSx}>
      <Box aria-hidden sx={pageHeroOrbSx} />
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', minWidth: 0 }}>
          <Box sx={pageHeroIconBoxSx}>{icon}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Typography variant="h5" sx={pageHeroTitleSx}>
                {title}
              </Typography>
              {titleAddon}
            </Box>
            {subtitle && (
              <Typography variant="body1" sx={pageHeroSubtitleSx}>
                {subtitle}
              </Typography>
            )}
            {chips && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.25 }}>
                {chips}
              </Box>
            )}
          </Box>
        </Box>
        {actions}
      </Box>
    </Paper>
  )
}
