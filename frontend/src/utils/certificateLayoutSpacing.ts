import type { SxProps, Theme } from '@mui/material'
import type { CertificateLayoutElement } from './certificateLayoutTypes'

export interface CertificateElementLayout {
  marginTopMm?: number
  marginRightMm?: number
  marginBottomMm?: number
  marginLeftMm?: number
  paddingTopMm?: number
  paddingRightMm?: number
  paddingBottomMm?: number
  paddingLeftMm?: number
  lineHeight?: number
  textColor?: string
  labelWidthMm?: number
  cellPaddingMm?: number
}

export type SpacingSide = 'marginTopMm' | 'marginRightMm' | 'marginBottomMm' | 'marginLeftMm'
export type PaddingSide = 'paddingTopMm' | 'paddingRightMm' | 'paddingBottomMm' | 'paddingLeftMm'

export const SPACING_SIDE_LABELS: Record<SpacingSide, string> = {
  marginTopMm: 'Top',
  marginRightMm: 'Right',
  marginBottomMm: 'Bottom',
  marginLeftMm: 'Left',
}

export const PADDING_SIDE_LABELS: Record<PaddingSide, string> = {
  paddingTopMm: 'Top',
  paddingRightMm: 'Right',
  paddingBottomMm: 'Bottom',
  paddingLeftMm: 'Left',
}

export function hasLayoutOverrides(element: CertificateElementLayout): boolean {
  return (
    (element.marginTopMm ?? 0) > 0 ||
    (element.marginRightMm ?? 0) > 0 ||
    (element.marginBottomMm ?? 0) > 0 ||
    (element.marginLeftMm ?? 0) > 0 ||
    (element.paddingTopMm ?? 0) > 0 ||
    (element.paddingRightMm ?? 0) > 0 ||
    (element.paddingBottomMm ?? 0) > 0 ||
    (element.paddingLeftMm ?? 0) > 0 ||
    (element.lineHeight ?? 0) > 0 ||
    Boolean(element.textColor) ||
    (element.labelWidthMm ?? 0) > 0 ||
    (element.cellPaddingMm ?? 0) > 0
  )
}

export function elementSpacingSx(element: CertificateElementLayout, scale: number): SxProps<Theme> {
  const mm = (value?: number) => `${(value ?? 0) * scale}px`
  return {
    marginTop: mm(element.marginTopMm),
    marginRight: mm(element.marginRightMm),
    marginBottom: mm(element.marginBottomMm),
    marginLeft: mm(element.marginLeftMm),
    paddingTop: mm(element.paddingTopMm),
    paddingRight: mm(element.paddingRightMm),
    paddingBottom: mm(element.paddingBottomMm),
    paddingLeft: mm(element.paddingLeftMm),
  }
}

export function resolvedLineHeight(element: CertificateElementLayout): number {
  return element.lineHeight && element.lineHeight > 0 ? element.lineHeight : 1.35
}

export function resolvedTextColor(element: CertificateElementLayout, fallback = '#1a1a1a'): string {
  return element.textColor?.trim() || fallback
}

export function supportsTextLayout(element: CertificateLayoutElement): boolean {
  return (
    element.type === 'title' ||
    element.type === 'subtitle' ||
    element.type === 'text' ||
    element.type === 'value' ||
    element.type === 'footer'
  )
}

export function supportsLabelWidth(element: CertificateLayoutElement): boolean {
  return element.type === 'field' || element.type === 'columns'
}

export function supportsCellPadding(element: CertificateLayoutElement): boolean {
  return element.type === 'table'
}

export function clearElementLayout<T extends CertificateLayoutElement>(element: T): T {
  return {
    ...element,
    marginTopMm: 0,
    marginRightMm: 0,
    marginBottomMm: 0,
    marginLeftMm: 0,
    paddingTopMm: 0,
    paddingRightMm: 0,
    paddingBottomMm: 0,
    paddingLeftMm: 0,
    lineHeight: 0,
    textColor: '',
    labelWidthMm: 0,
    cellPaddingMm: 0,
  }
}
