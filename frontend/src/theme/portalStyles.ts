import type { SxProps, Theme } from '@mui/material'
import { portalColors } from './portalTheme'

export const portalPrimaryButtonSx: SxProps<Theme> = {
  bgcolor: portalColors.primary,
  textTransform: 'none',
  fontWeight: 600,
  borderRadius: '0.5rem',
  boxShadow: 'none',
  '&:hover': { bgcolor: portalColors.primaryDark, boxShadow: 'none' },
}

export const portalOutlinedButtonSx: SxProps<Theme> = {
  borderColor: portalColors.borderStrong,
  color: portalColors.textDark,
  textTransform: 'none',
  fontWeight: 500,
  borderRadius: '0.5rem',
  '&:hover': {
    borderColor: portalColors.primary,
    bgcolor: portalColors.bgMuted,
    color: portalColors.primary,
  },
}

export const portalTableHeadCellSx = {
  fontWeight: 600,
  fontSize: '0.8125rem',
  color: portalColors.textDark,
  bgcolor: portalColors.bgMuted,
  borderBottom: `1px solid ${portalColors.border}`,
} as const

export const portalPanelSx = {
  p: 1.75,
  borderRadius: '0.75rem',
  border: `1px solid ${portalColors.border}`,
  bgcolor: portalColors.bgWhite,
  boxShadow: '0 1px 3px rgba(11, 61, 145, 0.08)',
} as const
