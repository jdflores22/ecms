/** Shared ICS design tokens — auth, public, and internal app. */
export const appColors = {
  primary: '#0B3D91',
  primaryDark: '#082E6E',
  accent: '#00A3E0',
  textDark: '#1c1917',
  textMuted: '#78716c',
  textLight: '#a8a29e',
  border: '#d6d3d1',
  placeholder: '#a8a29e',
  brandBg: '#f5f5f4',
  pageBg: '#F4F7FB',
  white: '#ffffff',
  linkDivider: '#d6d3d1',
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',
  errorText: '#991b1b',
  navActiveBg: 'rgba(11, 61, 145, 0.08)',
  navHoverBg: 'rgba(11, 61, 145, 0.05)',
  surfaceShadow: '0 2px 12px rgba(28, 25, 23, 0.06)',
  cardShadow: '0 8px 32px rgba(28, 25, 23, 0.06)',
  heroGradient: `
    radial-gradient(circle at 15% 20%, rgba(11, 61, 145, 0.08) 0%, transparent 42%),
    radial-gradient(circle at 85% 80%, rgba(0, 163, 224, 0.06) 0%, transparent 40%),
    linear-gradient(180deg, #ffffff 0%, #fafaf9 100%)
  `,
  ctaGradient: 'linear-gradient(135deg, #082E6E 0%, #0B3D91 55%, #00A3E0 100%)',
  /** ICS signature gradient — app bar and in-app page heroes */
  icsBrandGradient: 'linear-gradient(135deg, #0B3D91 0%, #0A3580 55%, #0C4DA8 100%)',
  icsBrandShadow: '0 8px 24px rgba(11, 61, 145, 0.22)',
  icsAppBarShadow: '0 4px 20px rgba(11, 61, 145, 0.25)',
  appBarBg: 'rgba(255, 255, 255, 0.92)',
} as const

/** Text on ICS blue gradient surfaces */
export const icsOnBrand = {
  title: '#ffffff',
  body: 'rgba(255, 255, 255, 0.88)',
  muted: 'rgba(255, 255, 255, 0.75)',
  link: '#7dd3fc',
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
