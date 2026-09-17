import { Box, Button, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { portalColors } from '../../theme/portalTheme'

interface PortalPageHeaderProps {
  eyebrow?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: {
    label: string
    to: string
  }
  actions?: ReactNode
  children?: ReactNode
}

export function PortalPageHeader({ eyebrow, title, subtitle, action, actions, children }: PortalPageHeaderProps) {
  return (
    <Box
      sx={{
        mb: 4,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { sm: 'flex-end' },
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box>
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
        <Typography
          component="h1"
          sx={{
            mt: eyebrow ? 0.5 : 0,
            fontSize: '1.5rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: portalColors.textDark,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ mt: 0.5, fontSize: '0.875rem', color: portalColors.textMuted, maxWidth: 640 }}>
            {subtitle}
          </Typography>
        )}
        {children}
      </Box>
      {(actions || action) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignSelf: { xs: 'flex-start', sm: 'auto' } }}>
          {actions}
          {action && (
            <Button
              component={RouterLink}
              to={action.to}
              variant="outlined"
              sx={{
                alignSelf: { xs: 'flex-start', sm: 'auto' },
                minHeight: 44,
                borderColor: portalColors.borderStrong,
                color: portalColors.textDark,
                borderRadius: '0.5rem',
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  borderColor: portalColors.primary,
                  bgcolor: portalColors.bgMuted,
                  color: portalColors.primary,
                },
              }}
            >
              {action.label}
            </Button>
          )}
        </Box>
      )}
    </Box>
  )
}
