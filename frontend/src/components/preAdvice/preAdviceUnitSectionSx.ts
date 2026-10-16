import { type SxProps, type Theme } from '@mui/material'
import { appColors, hexToRgba, ICS_PRIMARY } from '../../theme/colors'

export type PreAdviceUnitVariant = 'primary' | 'companion'

/** Subtle ICS surface — same treatment for primary and companion (role is text-only). */
export function preAdviceUnitSectionSx(variant: PreAdviceUnitVariant = 'primary'): SxProps<Theme> {
  const accent = variant === 'primary' ? ICS_PRIMARY : '#00A3E0'
  return {
    border: `1px solid ${appColors.border}`,
    borderLeft: `3px solid ${accent}`,
    borderRadius: '0.75rem',
    p: { xs: 2, sm: 2.25 },
    bgcolor: hexToRgba(ICS_PRIMARY, 0.02),
  }
}

export type PreAdviceUnitLabelStyle = 'default' | 'containerAb'

export function preAdviceUnitRoleLabel(
  variant: PreAdviceUnitVariant,
  style: PreAdviceUnitLabelStyle = 'default',
): string {
  if (style === 'containerAb') {
    return variant === 'primary' ? 'Container A' : 'Container B'
  }
  return variant === 'primary' ? 'Primary container' : 'Companion container'
}

/** Back-to-back field label with container number (e.g. Container A · AXEU…). */
export function backToBackUnitFieldLabel(variant: PreAdviceUnitVariant, containerNo: string): string {
  return `${preAdviceUnitRoleLabel(variant, 'containerAb')} · ${containerNo}`
}

/** Back-to-back CY dropdown label. */
export function backToBackCyFieldLabel(variant: PreAdviceUnitVariant, containerNo: string): string {
  return `${preAdviceUnitRoleLabel(variant, 'containerAb')} CY · ${containerNo}`
}

export const preAdviceUnitChipSx = {
  height: 24,
  fontWeight: 600,
  fontSize: '0.7rem',
  letterSpacing: 0.3,
  bgcolor: 'transparent',
  border: `1px solid ${appColors.border}`,
  color: 'text.secondary',
} as const
