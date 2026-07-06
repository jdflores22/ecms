export type CertificateDocumentType = 'Atw' | 'AtwRelease' | 'CyContainerRelease'

export const CERTIFICATE_DOCUMENT_TYPES: {
  value: CertificateDocumentType
  label: string
  description: string
}[] = [
  { value: 'Atw', label: 'ATW Issue', description: 'Authority to Withdraw issued by shipping line' },
  { value: 'AtwRelease', label: 'ATW Release', description: 'Full ATW release when all containers are released' },
  { value: 'CyContainerRelease', label: 'CY Container Release', description: 'Per-container release from CY' },
]

export function documentTypeLabel(documentType: CertificateDocumentType): string {
  return CERTIFICATE_DOCUMENT_TYPES.find((t) => t.value === documentType)?.label ?? documentType
}

export function getDefaultLayout(documentType: CertificateDocumentType): CertificateLayoutDefinition {
  switch (documentType) {
    case 'AtwRelease':
      return DEFAULT_ATW_RELEASE_LAYOUT
    case 'CyContainerRelease':
      return DEFAULT_CY_CONTAINER_RELEASE_LAYOUT
    default:
      return DEFAULT_ATW_LAYOUT
  }
}

export type CertificateElementType =
  | 'title'
  | 'subtitle'
  | 'text'
  | 'field'
  | 'value'
  | 'columns'
  | 'table'
  | 'spacer'
  | 'rule'
  | 'image'
  | 'signature'
  | 'footer'
  | 'stamp'
  | 'qrcode'
  | 'row'
  | 'tripleRow'

export type CertificateRowSlotKind = 'empty' | 'image' | 'qrcode' | 'signature' | 'stamp'

export interface CertificateRowSlot {
  kind: CertificateRowSlotKind
  align: string
  src: string
  widthMm: number
  heightMm?: number
  alt?: string
  showImageTitle?: boolean
  imageTitle?: string
  imageSubtitle?: string
  imageTitleFontSize?: number
  imageSubtitleFontSize?: number
  qrWidthMm: number
  qrCaption: string
  showQrCaption: boolean
  qrCaptionFontSize: number
  caption: string
  nameBinding: string
  titleText: string
  showLine: boolean
  fontSize: number
  stampText?: string
  stampColor?: string
  stampFontSize?: number
  showDigitalSeal?: boolean
  digitalSealColor?: string
}

export interface CertificateRowElement extends CertificateLayoutElementBase {
  type: 'row'
  left: CertificateRowSlot
  right: CertificateRowSlot
  gapMm: number
}

export interface CertificateTripleRowElement extends CertificateLayoutElementBase {
  type: 'tripleRow'
  left: CertificateRowSlot
  center: CertificateRowSlot
  right: CertificateRowSlot
  gapMm: number
}

export interface CertificatePageSettings {
  size: string
  marginMm: number
}

export interface CertificateLayoutDefinition {
  version: number
  page: CertificatePageSettings
  elements: CertificateLayoutElement[]
}

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

export interface CertificateLayoutElementBase extends CertificateElementLayout {
  type: CertificateElementType
}

export interface CertificateTitleElement extends CertificateLayoutElementBase {
  type: 'title'
  text: string
  align: string
  fontSize: number
  bold: boolean
}

export interface CertificateSubtitleElement extends CertificateLayoutElementBase {
  type: 'subtitle'
  text: string
  align: string
  fontSize: number
  bold: boolean
}

export interface CertificateTextElement extends CertificateLayoutElementBase {
  type: 'text'
  text: string
  align: string
  fontSize: number
  bold: boolean
}

export interface CertificateFieldElement extends CertificateLayoutElementBase {
  type: 'field'
  label: string
  binding: string
  fontSize: number
  bold: boolean
}

export interface CertificateValueElement extends CertificateLayoutElementBase {
  type: 'value'
  binding: string
  align: string
  fontSize: number
  bold: boolean
}

export interface CertificateColumnsElement extends CertificateLayoutElementBase {
  type: 'columns'
  leftLabel: string
  leftBinding: string
  rightLabel: string
  rightBinding: string
  fontSize: number
}

export interface CertificateTableElement extends CertificateLayoutElementBase {
  type: 'table'
  binding: string
  columns: string[]
  fontSize: number
}

export interface CertificateSpacerElement extends CertificateLayoutElementBase {
  type: 'spacer'
  heightMm: number
}

export interface CertificateRuleElement extends CertificateLayoutElementBase {
  type: 'rule'
  thicknessPt: number
}

export interface CertificateImageElement extends CertificateLayoutElementBase {
  type: 'image'
  src: string
  align: string
  widthMm: number
  heightMm?: number
  alt?: string
  showTitle?: boolean
  title?: string
  subtitle?: string
  titleFontSize?: number
  subtitleFontSize?: number
}

export interface CertificateSignatureElement extends CertificateLayoutElementBase {
  type: 'signature'
  caption: string
  nameBinding: string
  titleText: string
  showLine: boolean
  align: string
  fontSize: number
  showDigitalSeal?: boolean
  digitalSealColor?: string
}

export interface CertificateFooterElement extends CertificateLayoutElementBase {
  type: 'footer'
  text: string
  binding: string
  align: string
  fontSize: number
}

export interface CertificateStampElement extends CertificateLayoutElementBase {
  type: 'stamp'
  text: string
  align: string
  fontSize: number
  color: string
}

export interface CertificateQrCodeElement extends CertificateLayoutElementBase {
  type: 'qrcode'
  align: string
  widthMm: number
  caption: string
  showCaption: boolean
  captionFontSize: number
}

export type CertificateLayoutElement =
  | CertificateTitleElement
  | CertificateSubtitleElement
  | CertificateTextElement
  | CertificateFieldElement
  | CertificateValueElement
  | CertificateColumnsElement
  | CertificateTableElement
  | CertificateSpacerElement
  | CertificateRuleElement
  | CertificateImageElement
  | CertificateSignatureElement
  | CertificateFooterElement
  | CertificateStampElement
  | CertificateQrCodeElement
  | CertificateRowElement
  | CertificateTripleRowElement

export interface CertificateTemplate {
  id: number
  shippingLineId: number
  shippingLineName: string
  documentType: CertificateDocumentType
  name: string
  layoutJson: string
  isActive: boolean
  updatedAt: string
  createdAt: string
}

export interface CertificateMergeField {
  key: string
  label: string
  kind: 'field' | 'table'
}

export const DEFAULT_ATW_LAYOUT: CertificateLayoutDefinition = {
  version: 1,
  page: { size: 'A4', marginMm: 20 },
  elements: [
    { type: 'title', text: 'AUTHORITY TO WITHDRAW', align: 'center', fontSize: 18, bold: true },
    { type: 'spacer', heightMm: 6 },
    { type: 'field', label: 'ATW No.', binding: 'AtwNumber', fontSize: 11, bold: true },
    { type: 'field', label: 'Reference', binding: 'ReferenceNo', fontSize: 11, bold: false },
    { type: 'field', label: 'Shipping line', binding: 'ShippingLineName', fontSize: 11, bold: false },
    { type: 'field', label: 'Authorized trucker', binding: 'TruckerName', fontSize: 11, bold: false },
    { type: 'field', label: 'Current CY', binding: 'CurrentDepotName', fontSize: 11, bold: false },
    { type: 'field', label: 'Destination', binding: 'Destination', fontSize: 11, bold: false },
    { type: 'field', label: 'Issue date', binding: 'IssueDate', fontSize: 11, bold: false },
    { type: 'field', label: 'Expiration date', binding: 'ExpirationDate', fontSize: 11, bold: false },
    { type: 'spacer', heightMm: 4 },
    {
      type: 'text',
      text: 'The following container(s) are authorized for withdrawal from CY inventory:',
      align: 'left',
      fontSize: 10,
      bold: false,
    },
    { type: 'table', binding: 'ContainerLines', columns: ['ContainerNo', 'Size', 'Type'], fontSize: 10 },
    { type: 'spacer', heightMm: 4 },
    { type: 'field', label: 'Remarks', binding: 'Remarks', fontSize: 11, bold: false },
    { type: 'spacer', heightMm: 8 },
    {
      type: 'text',
      text: 'This document is system-generated by ICS and constitutes the official Authority to Withdraw for the units listed above.',
      align: 'left',
      fontSize: 9,
      bold: false,
    },
  ],
}

export const DEFAULT_ATW_RELEASE_LAYOUT: CertificateLayoutDefinition = {
  version: 1,
  page: { size: 'A4', marginMm: 20 },
  elements: [
    { type: 'title', text: 'RELEASED AUTHORITY TO WITHDRAW', align: 'center', fontSize: 18, bold: true },
    { type: 'spacer', heightMm: 6 },
    { type: 'field', label: 'ATW No.', binding: 'AtwNumber', fontSize: 11, bold: true },
    { type: 'field', label: 'Reference', binding: 'ReferenceNo', fontSize: 11, bold: false },
    { type: 'field', label: 'Shipping line', binding: 'ShippingLineName', fontSize: 11, bold: false },
    { type: 'field', label: 'Authorized trucker', binding: 'TruckerName', fontSize: 11, bold: false },
    { type: 'field', label: 'CY depot', binding: 'CurrentDepotName', fontSize: 11, bold: false },
    { type: 'field', label: 'Destination', binding: 'Destination', fontSize: 11, bold: false },
    { type: 'field', label: 'Issue date', binding: 'IssueDate', fontSize: 11, bold: false },
    { type: 'field', label: 'Expiration date', binding: 'ExpirationDate', fontSize: 11, bold: false },
    { type: 'field', label: 'Released date', binding: 'ReleasedDate', fontSize: 11, bold: true },
    { type: 'field', label: 'Released at', binding: 'ReleasedAt', fontSize: 11, bold: false },
    { type: 'field', label: 'Released by CY', binding: 'ReleasedByDepotName', fontSize: 11, bold: false },
    { type: 'spacer', heightMm: 4 },
    {
      type: 'text',
      text: 'All container(s) listed below have been released from CY inventory:',
      align: 'left',
      fontSize: 10,
      bold: false,
    },
    { type: 'table', binding: 'ContainerLines', columns: ['ContainerNo', 'Size', 'Type'], fontSize: 10 },
    { type: 'spacer', heightMm: 4 },
    { type: 'field', label: 'Remarks', binding: 'Remarks', fontSize: 11, bold: false },
    { type: 'spacer', heightMm: 8 },
    {
      type: 'text',
      text: 'This document confirms full release of all units under the Authority to Withdraw above. System-generated by ICS.',
      align: 'left',
      fontSize: 9,
      bold: false,
    },
  ],
}

export const DEFAULT_CY_CONTAINER_RELEASE_LAYOUT: CertificateLayoutDefinition = {
  version: 1,
  page: { size: 'A4', marginMm: 20 },
  elements: [
    { type: 'title', text: 'CY CONTAINER RELEASE', align: 'center', fontSize: 18, bold: true },
    { type: 'spacer', heightMm: 6 },
    { type: 'field', label: 'ATW No.', binding: 'AtwNumber', fontSize: 11, bold: true },
    { type: 'field', label: 'Reference', binding: 'ReferenceNo', fontSize: 11, bold: false },
    { type: 'field', label: 'Shipping line', binding: 'ShippingLineName', fontSize: 11, bold: false },
    { type: 'field', label: 'Authorized trucker', binding: 'TruckerName', fontSize: 11, bold: false },
    { type: 'field', label: 'CY depot', binding: 'CurrentDepotName', fontSize: 11, bold: false },
    { type: 'field', label: 'Destination', binding: 'Destination', fontSize: 11, bold: false },
    { type: 'field', label: 'Container no.', binding: 'ContainerNo', fontSize: 11, bold: true },
    { type: 'field', label: 'Size', binding: 'ContainerSize', fontSize: 11, bold: false },
    { type: 'field', label: 'Type', binding: 'ContainerType', fontSize: 11, bold: false },
    { type: 'field', label: 'Released date', binding: 'ReleasedDate', fontSize: 11, bold: true },
    { type: 'field', label: 'Released at', binding: 'ReleasedAt', fontSize: 11, bold: false },
    { type: 'field', label: 'Released by CY', binding: 'ReleasedByDepotName', fontSize: 11, bold: false },
    { type: 'spacer', heightMm: 8 },
    {
      type: 'text',
      text: 'This document confirms release of the container above from CY inventory under the referenced Authority to Withdraw. System-generated by ICS.',
      align: 'left',
      fontSize: 9,
      bold: false,
    },
  ],
}

export function parseLayoutJson(
  layoutJson: string,
  documentType: CertificateDocumentType = 'Atw',
): CertificateLayoutDefinition {
  try {
    const parsed = JSON.parse(layoutJson) as CertificateLayoutDefinition
    if (!parsed.elements) return getDefaultLayout(documentType)
    return parsed
  } catch {
    return getDefaultLayout(documentType)
  }
}

export function serializeLayout(layout: CertificateLayoutDefinition): string {
  return JSON.stringify(layout, null, 2)
}

export function defaultRowSlot(kind: CertificateRowSlotKind): CertificateRowSlot {
  switch (kind) {
    case 'image':
      return {
        kind,
        align: 'center',
        src: '',
        widthMm: 40,
        alt: 'Logo',
        showImageTitle: false,
        imageTitle: '',
        imageSubtitle: '',
        imageTitleFontSize: 10,
        imageSubtitleFontSize: 8,
        qrWidthMm: 28,
        qrCaption: 'Scan to verify',
        showQrCaption: true,
        qrCaptionFontSize: 8,
        caption: 'Authorized by',
        nameBinding: '',
        titleText: '',
        showLine: true,
        fontSize: 10,
      }
    case 'qrcode':
      return {
        kind,
        align: 'center',
        src: '',
        widthMm: 40,
        qrWidthMm: 28,
        qrCaption: 'Scan to verify authenticity',
        showQrCaption: true,
        qrCaptionFontSize: 8,
        caption: 'Authorized by',
        nameBinding: '',
        titleText: 'Depot Manager',
        showLine: true,
        fontSize: 10,
      }
    case 'signature':
      return {
        kind,
        align: 'left',
        src: '',
        widthMm: 40,
        qrWidthMm: 28,
        qrCaption: 'Scan to verify',
        showQrCaption: true,
        qrCaptionFontSize: 8,
        caption: 'Authorized by',
        nameBinding: 'IssuedByName',
        titleText: 'Shipping Line Evaluator',
        showLine: true,
        fontSize: 10,
        showDigitalSeal: true,
        digitalSealColor: '#0B3D91',
      }
    case 'stamp':
      return {
        kind,
        align: 'center',
        src: '',
        widthMm: 40,
        qrWidthMm: 28,
        qrCaption: 'Scan to verify',
        showQrCaption: true,
        qrCaptionFontSize: 8,
        caption: 'Authorized by',
        nameBinding: '',
        titleText: '',
        showLine: true,
        fontSize: 10,
        stampText: 'RELEASED',
        stampColor: '#C62828',
        stampFontSize: 22,
      }
    default:
      return {
        kind: 'empty',
        align: 'center',
        src: '',
        widthMm: 40,
        qrWidthMm: 28,
        qrCaption: 'Scan to verify',
        showQrCaption: true,
        qrCaptionFontSize: 8,
        caption: 'Authorized by',
        nameBinding: '',
        titleText: '',
        showLine: true,
        fontSize: 10,
      }
  }
}

export function newElement(type: CertificateElementType): CertificateLayoutElement {
  switch (type) {
    case 'title':
      return { type, text: 'Section title', align: 'center', fontSize: 16, bold: true }
    case 'subtitle':
      return { type, text: 'Subtitle', align: 'center', fontSize: 14, bold: true }
    case 'text':
      return { type, text: 'Body text', align: 'left', fontSize: 11, bold: false }
    case 'field':
      return { type, label: 'Label', binding: 'AtwNumber', fontSize: 11, bold: false }
    case 'value':
      return { type, binding: 'AtwNumber', align: 'left', fontSize: 11, bold: true }
    case 'columns':
      return {
        type,
        leftLabel: 'Issue date',
        leftBinding: 'IssueDate',
        rightLabel: 'Expiration',
        rightBinding: 'ExpirationDate',
        fontSize: 11,
      }
    case 'table':
      return { type, binding: 'ContainerLines', columns: ['ContainerNo', 'Size', 'Type'], fontSize: 10 }
    case 'spacer':
      return { type, heightMm: 4 }
    case 'rule':
      return { type, thicknessPt: 1 }
    case 'image':
      return {
        type,
        src: '',
        align: 'center',
        widthMm: 40,
        alt: 'Logo',
        showTitle: false,
        title: '',
        subtitle: '',
        titleFontSize: 10,
        subtitleFontSize: 8,
      }
    case 'signature':
      return {
        type,
        caption: 'Authorized by',
        nameBinding: 'IssuedByName',
        titleText: 'Shipping Line Evaluator',
        showLine: true,
        align: 'left',
        fontSize: 10,
        showDigitalSeal: true,
        digitalSealColor: '#0B3D91',
      }
    case 'footer':
      return { type, text: 'Generated by ICS · ', binding: 'GeneratedAt', align: 'center', fontSize: 8 }
    case 'stamp':
      return { type, text: 'RELEASED', align: 'center', fontSize: 22, color: '#C62828' }
    case 'qrcode':
      return {
        type,
        align: 'right',
        widthMm: 28,
        caption: 'Scan to verify authenticity',
        showCaption: true,
        captionFontSize: 8,
      }
    case 'row':
      return {
        type,
        gapMm: 4,
        left: defaultRowSlot('image'),
        right: defaultRowSlot('qrcode'),
      }
    case 'tripleRow':
      return {
        type,
        gapMm: 4,
        left: defaultRowSlot('image'),
        center: defaultRowSlot('stamp'),
        right: defaultRowSlot('qrcode'),
      }
  }
}

export function elementSummary(element: CertificateLayoutElement): string {
  switch (element.type) {
    case 'title':
    case 'subtitle':
    case 'text':
      return element.text
    case 'field':
      return `${element.label} → ${element.binding}`
    case 'value':
      return `Value: ${element.binding}`
    case 'columns':
      return `${element.leftLabel} / ${element.rightLabel}`
    case 'table':
      return `Table: ${element.columns.join(', ')}`
    case 'spacer':
      return `${element.heightMm}mm spacer`
    case 'rule':
      return 'Horizontal rule'
    case 'image':
      return element.title
        ? `Image: ${element.title}`
        : element.src
          ? `Image: ${element.src.split('/').pop()}`
          : 'Image (not uploaded)'
    case 'signature':
      return element.caption || 'Signature block'
    case 'footer':
      return element.binding ? `${element.text}{${element.binding}}` : element.text
    case 'stamp':
      return `Stamp: ${element.text}`
    case 'qrcode':
      return 'Verification QR code'
    case 'row':
      return `${rowSlotSummary(element.left)} | ${rowSlotSummary(element.right)}`
    case 'tripleRow':
      return `${rowSlotSummary(element.left)} | ${rowSlotSummary(element.center)} | ${rowSlotSummary(element.right)}`
  }
}

function rowSlotSummary(slot: CertificateRowSlot): string {
  switch (slot.kind) {
    case 'image':
      return slot.src ? `Image` : 'Image (empty)'
    case 'qrcode':
      return 'QR'
    case 'signature':
      return 'Signature'
    case 'stamp':
      return slot.stampText ? `Stamp: ${slot.stampText}` : 'Stamp'
    default:
      return '—'
  }
}
