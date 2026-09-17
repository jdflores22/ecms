import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { portalAnalyticsColors, portalColors } from '../../theme/portalTheme'
import { portalOutlinedButtonSx, portalPrimaryButtonSx } from '../../theme/portalStyles'

/** @deprecated Use portalColors — kept for legacy imports */
export const pageHeroText = {
  title: portalColors.textDark,
  body: portalColors.textMuted,
  muted: portalColors.textLight,
  link: portalColors.primary,
}

export const pageHeroTitleSx = {
  fontWeight: 600,
  fontSize: '1.5rem',
  lineHeight: 1.3,
  color: portalColors.textDark,
  letterSpacing: '-0.01em',
}

export const pageHeroSubtitleSx = {
  color: portalColors.textMuted,
  fontSize: '0.875rem',
  lineHeight: 1.6,
  maxWidth: 640,
  mt: 0.5,
}

/** Plain page header spacing — AgriCheck-style (no gradient card) */
export const pageHeroPaperSx = {
  mb: 3,
}

export const pageHeroOrbSx = {
  display: 'none',
}

export const pageHeroIconBoxSx = {
  color: portalColors.primary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  '& .MuiSvgIcon-root': { fontSize: 28 },
}

export const pageHeroMutedChipSx = {
  bgcolor: portalAnalyticsColors.soft,
  color: portalColors.primary,
  border: `1px solid ${portalAnalyticsColors.softStrong}`,
  fontWeight: 600,
}

export const listHeroPrimaryActionSx = {
  ...portalPrimaryButtonSx,
  minHeight: 44,
  flexShrink: 0,
  width: { xs: '100%', sm: 'auto' },
}

export const listHeroOutlineActionSx = {
  ...portalOutlinedButtonSx,
  minHeight: 44,
  flexShrink: 0,
  width: { xs: '100%', sm: 'auto' },
}

type PageHeroProps = {
  icon?: ReactNode
  title: ReactNode
  titleAddon?: ReactNode
  subtitle?: ReactNode
  eyebrow?: string
  chips?: ReactNode
  actions?: ReactNode
}

export function PageHero({ icon, title, titleAddon, subtitle, eyebrow, chips, actions }: PageHeroProps) {
  return (
    <Box sx={pageHeroPaperSx}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { sm: 'flex-end' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {eyebrow && (
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: portalColors.primary,
              }}
            >
              {eyebrow}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mt: eyebrow ? 0.5 : 0 }}>
            {icon ? <Box sx={pageHeroIconBoxSx}>{icon}</Box> : null}
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Typography component="h1" sx={pageHeroTitleSx}>
                  {title}
                </Typography>
                {titleAddon}
              </Box>
              {subtitle && (
                <Typography component="div" sx={pageHeroSubtitleSx}>
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
        </Box>
        {actions ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignSelf: { xs: 'flex-start', sm: 'auto' } }}>
            {actions}
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}
