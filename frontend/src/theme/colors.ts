import {
  portalAnalyticsColors,
  portalCardShadow,
  portalColors,
  portalHeroBorder,
  portalHeroGradient,
  portalHeroShadow,
} from './portalTheme'

/** Shared ICS design tokens — auth, public, and internal app. */
export const appColors = {
  primary: portalColors.primary,
  primaryDark: portalColors.primaryDark,
  accent: portalColors.accent,
  textDark: portalColors.textDark,
  textMuted: portalColors.textMuted,
  textLight: portalColors.textLight,
  border: portalColors.borderStrong,
  placeholder: portalColors.textLight,
  brandBg: portalColors.bgMuted,
  pageBg: portalColors.bgPage,
  white: portalColors.bgWhite,
  linkDivider: portalColors.borderStrong,
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',
  errorText: '#991b1b',
  navActiveBg: portalColors.brandSoft,
  navHoverBg: 'rgba(11, 61, 145, 0.05)',
  surfaceShadow: portalCardShadow,
  cardShadow: '0 8px 32px rgba(11, 61, 145, 0.08)',
  heroGradient: `
    radial-gradient(circle at 15% 20%, rgba(11, 61, 145, 0.08) 0%, transparent 42%),
    radial-gradient(circle at 85% 80%, rgba(0, 163, 224, 0.06) 0%, transparent 40%),
    linear-gradient(180deg, #ffffff 0%, ${portalColors.bgPage} 100%)
  `,
  ctaGradient: `linear-gradient(135deg, ${portalColors.primaryDark} 0%, ${portalColors.primary} 55%, ${portalAnalyticsColors.light} 100%)`,
  /** In-app page heroes — AgriCheck-style bright brand gradient */
  icsBrandGradient: portalHeroGradient,
  icsBrandShadow: portalHeroShadow,
  icsHeroBorder: portalHeroBorder,
  icsAppBarShadow: '0 1px 0 rgba(255,255,255,0.08)',
  appBarBg: portalColors.primary,
} as const

/** Text on ICS blue gradient surfaces */
export const icsOnBrand = {
  title: '#ffffff',
  body: 'rgba(255, 255, 255, 0.88)',
  muted: 'rgba(255, 255, 255, 0.75)',
  link: '#bae6fd',
} as const

/** @deprecated Import appColors — kept for auth/public imports. */
export const authColors = appColors

export const ICS_PRIMARY = appColors.primary

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export {
  portalColors,
  portalAnalyticsColors,
  portalStatusColors,
  portalPublicHeroGradient,
} from './portalTheme'
