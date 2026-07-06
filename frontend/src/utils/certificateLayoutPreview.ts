import type { CertificateLayoutElement } from './certificateLayoutTypes'

/** A4 page size in millimetres */
export const A4_WIDTH_MM = 210
export const A4_HEIGHT_MM = 297

export interface AtwPreviewData {
  AtwNumber: string
  ReferenceNo: string
  ShippingLineName: string
  TruckerName: string
  CurrentDepotName: string
  Destination: string
  IssueDate: string
  ExpirationDate: string
  Remarks: string
  ContainerLines: { ContainerNo: string; Size: string; Type: string }[]
}

export const SAMPLE_ATW_PREVIEW_DATA: AtwPreviewData = {
  AtwNumber: 'ATW-2026-001',
  ReferenceNo: 'WDR-2026-00042',
  ShippingLineName: 'Sample Shipping Line',
  TruckerName: 'Juan Dela Cruz',
  CurrentDepotName: 'Manila CY 1',
  Destination: 'Port of Manila',
  IssueDate: 'July 6, 2026',
  ExpirationDate: 'July 13, 2026',
  Remarks: 'Handle with care.',
  ContainerLines: [
    { ContainerNo: 'MSCU1234567', Size: '20', Type: 'GP' },
    { ContainerNo: 'TCLU7654321', Size: '40', Type: 'HC' },
  ],
}

export function mmToPx(mm: number, scale: number): number {
  return mm * scale
}

/** QuestPDF font sizes are in points; approximate screen px at a given page scale. */
export function ptToCanvasPx(pt: number, scale: number): number {
  return pt * scale * 0.38
}

export function resolveFieldValue(binding: string, data: AtwPreviewData): string {
  switch (binding) {
    case 'AtwNumber':
      return data.AtwNumber
    case 'ReferenceNo':
      return data.ReferenceNo
    case 'ShippingLineName':
      return data.ShippingLineName
    case 'TruckerName':
      return data.TruckerName
    case 'CurrentDepotName':
      return data.CurrentDepotName
    case 'Destination':
      return data.Destination
    case 'IssueDate':
      return data.IssueDate
    case 'ExpirationDate':
      return data.ExpirationDate
    case 'Remarks':
      return data.Remarks || '—'
    default:
      return ''
  }
}

export function formatTableColumnHeader(column: string): string {
  switch (column) {
    case 'ContainerNo':
      return 'Container'
    case 'Size':
      return 'Size'
    case 'Type':
      return 'Type'
    default:
      return column
  }
}

export function resolveTableCell(column: string, line: AtwPreviewData['ContainerLines'][number]): string {
  switch (column) {
    case 'ContainerNo':
      return line.ContainerNo
    case 'Size':
      return line.Size
    case 'Type':
      return line.Type
    default:
      return ''
  }
}

export function textAlignCss(align: string): 'left' | 'center' | 'right' {
  const value = align.toLowerCase()
  if (value === 'center') return 'center'
  if (value === 'right') return 'right'
  return 'left'
}

export function elementTypeLabel(element: CertificateLayoutElement): string {
  switch (element.type) {
    case 'title':
      return 'Title'
    case 'text':
      return 'Text'
    case 'field':
      return 'Field'
    case 'table':
      return 'Table'
    case 'spacer':
      return 'Spacer'
    case 'rule':
      return 'Rule'
    case 'image':
      return 'Image'
  }
}
