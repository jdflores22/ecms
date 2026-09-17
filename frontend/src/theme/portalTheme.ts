/** ICS portal palette — mirrors AgriCheck structure with blue brand. */
export const portalColors = {
  primary: '#0B3D91',
  primaryDark: '#082E6E',
  navActive: '#0B3D91',
  accent: '#00A3E0',
  textDark: '#1c1917',
  textMuted: '#78716c',
  textLight: '#a8a29e',
  border: '#e7e5e4',
  borderStrong: '#d6d3d1',
  bgPage: '#fafaf9',
  bgWhite: '#ffffff',
  bgMuted: '#f5f5f4',
  brandSoft: '#eff6ff',
  brandText: '#0B3D91',
} as const

/** Blue shades for charts, heroes, and analytics */
export const portalAnalyticsColors = {
  darkest: '#082E6E',
  dark: '#0B3D91',
  base: '#0C4DA8',
  mid: '#1565C0',
  light: '#00A3E0',
  pale: '#7dd3fc',
  track: '#e7e5e4',
  soft: '#eff6ff',
  softMid: '#dbeafe',
  softStrong: '#bfdbfe',
} as const

export const portalNavItemSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  width: '100%',
  minHeight: 40,
  px: 1.5,
  py: 1,
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: portalColors.textMuted,
  textDecoration: 'none',
  boxSizing: 'border-box',
  transition: 'background-color 0.15s ease, color 0.15s ease',
  '&:hover': {
    bgcolor: portalColors.bgMuted,
    color: portalColors.primary,
  },
  '&.active, &.Mui-selected': {
    bgcolor: portalColors.navActive,
    color: '#ffffff',
    fontWeight: 600,
    '& .MuiListItemIcon-root': { color: '#ffffff' },
    '& .MuiSvgIcon-root': { color: '#ffffff' },
  },
  '& .MuiSvgIcon-root': {
    fontSize: 20,
    color: 'inherit',
    flexShrink: 0,
  },
} as const

export const portalNavSectionLabelSx = {
  px: 3,
  pt: 2,
  pb: 1,
  fontSize: '0.6875rem',
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: portalColors.textLight,
} as const

export const portalHeroGradient = `linear-gradient(135deg, ${portalAnalyticsColors.light} 0%, ${portalAnalyticsColors.dark} 100%)`

export const portalHeroBorder = portalAnalyticsColors.base

export const portalCardShadow = '0 1px 3px rgba(11, 61, 145, 0.08)'

export const portalHeroShadow = '0 1px 3px rgba(11, 61, 145, 0.15)'

export const portalFocusRing = '0 0 0 3px rgba(11, 61, 145, 0.12)'

/** Semantic status colors for tabs, chips, and summary cards */
export const portalStatusColors = {
  primary: portalAnalyticsColors.mid,
  info: portalAnalyticsColors.base,
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
  purple: '#6a1b9a',
} as const

export const portalPublicHeroGradient =
  'linear-gradient(165deg, #0a1628 0%, #0B3D91 48%, #061428 100%)'
