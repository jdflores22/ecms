import { Box, Chip, CircularProgress, IconButton, Slider, Tooltip, Typography } from '@mui/material'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { useCallback, useMemo, useState, type DragEvent } from 'react'
import QRCode from 'react-qr-code'
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  SAMPLE_ATW_PREVIEW_DATA,
  SAMPLE_VERIFICATION_URL,
  elementTypeLabel,
  formatTableColumnHeader,
  mmToPx,
  ptToCanvasPx,
  resolveFieldValue,
  resolveTableCell,
  textAlignCss,
} from '../../utils/certificateLayoutPreview'
import {
  elementSpacingSx,
  resolvedLineHeight,
  resolvedTextColor,
} from '../../utils/certificateLayoutSpacing'
import { SignatureBlockPreview } from './certificateDigitalSeal'
import type { CertificateLayoutDefinition, CertificateLayoutElement, CertificateRowSlot } from '../../utils/certificateLayoutTypes'
import { useAssetUrlState } from '../../hooks/useAssetUrl'

const primary = '#0B3D91'

interface CertificateLayoutCanvasProps {
  layout: CertificateLayoutDefinition
  selectedIndex: number | null
  onSelect: (index: number | null) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onUpdateElement: (index: number, element: CertificateLayoutElement) => void
  onInsertElement?: (type: string, atIndex: number) => void
}

export default function CertificateLayoutCanvas({
  layout,
  selectedIndex,
  onSelect,
  onReorder,
  onUpdateElement,
  onInsertElement,
}: CertificateLayoutCanvasProps) {
  const [zoom, setZoom] = useState(100)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const baseWidth = 520
  const scale = (baseWidth / A4_WIDTH_MM) * (zoom / 100)
  const pageWidthPx = mmToPx(A4_WIDTH_MM, scale)
  const pageHeightPx = mmToPx(A4_HEIGHT_MM, scale)
  const marginPx = mmToPx(layout.page.marginMm, scale)

  const handleDragStart = (index: number) => (event: DragEvent) => {
    setDragIndex(index)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDropIndex(null)
  }

  const handleDropAt = useCallback(
    (targetIndex: number) => (event: DragEvent) => {
      event.preventDefault()
      const paletteType = event.dataTransfer.getData('application/x-cert-element')
      if (paletteType && onInsertElement) {
        onInsertElement(paletteType, targetIndex)
        setDragIndex(null)
        setDropIndex(null)
        return
      }

      const from = dragIndex ?? Number(event.dataTransfer.getData('text/plain'))
      if (!Number.isFinite(from) || from === targetIndex) return
      const to = from < targetIndex ? targetIndex - 1 : targetIndex
      if (from !== to) onReorder(from, to)
      setDragIndex(null)
      setDropIndex(null)
    },
    [dragIndex, onInsertElement, onReorder],
  )

  const handleDragOver = (index: number) => (event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropIndex(index)
  }

  const canvasLabel = useMemo(
    () => `A4 canvas · ${layout.page.marginMm}mm margins · ${zoom}%`,
    [layout.page.marginMm, zoom],
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Layout canvas
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Zoom out">
            <span>
              <IconButton size="small" disabled={zoom <= 60} onClick={() => setZoom((z) => Math.max(60, z - 10))}>
                <ZoomOutIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Slider
            size="small"
            value={zoom}
            min={60}
            max={140}
            step={10}
            onChange={(_, value) => setZoom(value as number)}
            sx={{ width: 100, mx: 1 }}
            aria-label="Canvas zoom"
          />
          <Tooltip title="Zoom in">
            <span>
              <IconButton size="small" disabled={zoom >= 140} onClick={() => setZoom((z) => Math.min(140, z + 10))}>
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36 }}>
            {zoom}%
          </Typography>
        </Box>
      </Box>

      <Box
        role="region"
        aria-label={canvasLabel}
        sx={{
          bgcolor: '#E8ECF1',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          p: { xs: 2, sm: 3 },
          overflow: 'auto',
          maxHeight: { xs: '62vh', lg: 'calc(100vh - 280px)' },
          minHeight: 420,
        }}
      >
        <Box
          sx={{
            width: pageWidthPx,
            minHeight: pageHeightPx,
            mx: 'auto',
            bgcolor: '#fff',
            boxShadow: '0 8px 32px rgba(11, 61, 145, 0.12), 0 2px 8px rgba(0,0,0,0.06)',
            position: 'relative',
            borderRadius: 0.5,
          }}
          onClick={() => onSelect(null)}
        >
          {/* Margin guides */}
          <Box
            sx={{
              position: 'absolute',
              top: marginPx,
              left: marginPx,
              right: marginPx,
              bottom: marginPx,
              border: '1px dashed rgba(11, 61, 145, 0.22)',
              pointerEvents: 'none',
              borderRadius: 0.5,
            }}
          />

          <Box
            sx={{
              position: 'relative',
              pt: `${marginPx}px`,
              pr: `${marginPx}px`,
              pb: `${marginPx}px`,
              pl: `${marginPx}px`,
              minHeight: pageHeightPx - marginPx * 2,
            }}
          >
            {layout.elements.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
                Drag elements from the palette or use Add element to build the certificate.
              </Typography>
            ) : (
              layout.elements.map((element, index) => (
                <Box key={`${element.type}-${index}`}>
                  <DropSlot
                    active={dropIndex === index && dragIndex !== null}
                    onDragOver={handleDragOver(index)}
                    onDrop={handleDropAt(index)}
                  />
                  <CanvasElementBlock
                    element={element}
                    scale={scale}
                    selected={selectedIndex === index}
                    dragging={dragIndex === index}
                    previewData={SAMPLE_ATW_PREVIEW_DATA}
                    onSelect={() => onSelect(index)}
                    onDragStart={handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                    onResizeSpacer={(heightMm) =>
                      element.type === 'spacer' && onUpdateElement(index, { ...element, heightMm })
                    }
                  />
                </Box>
              ))
            )}
            <DropSlot
              active={dropIndex === layout.elements.length && dragIndex !== null}
              onDragOver={handleDragOver(layout.elements.length)}
              onDrop={handleDropAt(layout.elements.length)}
            />
          </Box>
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Click an element to edit. Drag the handle to reorder. Spacer height can be adjusted when selected.
      </Typography>
    </Box>
  )
}

function DropSlot({
  active,
  onDragOver,
  onDrop,
}: {
  active: boolean
  onDragOver: (event: DragEvent) => void
  onDrop: (event: DragEvent) => void
}) {
  return (
    <Box
      onDragOver={onDragOver}
      onDrop={onDrop}
      sx={{
        height: active ? 10 : 4,
        my: active ? 0.25 : 0,
        borderRadius: 1,
        bgcolor: active ? 'rgba(11, 61, 145, 0.18)' : 'transparent',
        transition: 'height 0.15s ease, background-color 0.15s ease',
      }}
    />
  )
}

function CanvasElementBlock({
  element,
  scale,
  selected,
  dragging,
  previewData,
  onSelect,
  onDragStart,
  onDragEnd,
  onResizeSpacer,
}: {
  element: CertificateLayoutElement
  scale: number
  selected: boolean
  dragging: boolean
  previewData: typeof SAMPLE_ATW_PREVIEW_DATA
  onSelect: () => void
  onDragStart: (event: DragEvent) => void
  onDragEnd: () => void
  onResizeSpacer: (heightMm: number) => void
}) {
  return (
    <Box
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      sx={{
        position: 'relative',
        borderRadius: 1,
        border: '2px solid',
        borderColor: selected ? primary : 'transparent',
        bgcolor: selected ? 'rgba(11, 61, 145, 0.04)' : 'transparent',
        opacity: dragging ? 0.45 : 1,
        cursor: 'grab',
        '&:hover': {
          borderColor: selected ? primary : 'rgba(11, 61, 145, 0.2)',
          bgcolor: selected ? 'rgba(11, 61, 145, 0.04)' : 'rgba(11, 61, 145, 0.02)',
        },
        '&:hover .canvas-drag-handle': { opacity: 1 },
      }}
    >
      <Box
        className="canvas-drag-handle"
        sx={{
          position: 'absolute',
          left: -2,
          top: '50%',
          transform: 'translate(-100%, -50%)',
          opacity: selected ? 1 : 0,
          transition: 'opacity 0.15s',
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          color: 'text.secondary',
        }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>

      <Chip
        label={elementTypeLabel(element)}
        size="small"
        sx={{
          position: 'absolute',
          top: 2,
          right: 4,
          height: 20,
          fontSize: '0.65rem',
          fontWeight: 700,
          opacity: selected ? 1 : 0,
          pointerEvents: 'none',
          bgcolor: 'rgba(11, 61, 145, 0.08)',
        }}
      />

      <Box sx={{ px: 0.5, py: 0.25, ...elementSpacingSx(element, scale) }}>
        <ElementPreview element={element} scale={scale} previewData={previewData} />
      </Box>

      {selected && element.type === 'spacer' && (
        <SpacerResizeHandle
          heightMm={element.heightMm}
          scale={scale}
          onResize={onResizeSpacer}
        />
      )}
    </Box>
  )
}

function ElementPreview({
  element,
  scale,
  previewData,
}: {
  element: CertificateLayoutElement
  scale: number
  previewData: typeof SAMPLE_ATW_PREVIEW_DATA
}) {
  switch (element.type) {
    case 'title':
    case 'subtitle':
    case 'text':
      return (
        <Typography
          component="div"
          sx={{
            fontSize: ptToCanvasPx(element.fontSize, scale),
            fontWeight: element.bold ? 700 : 400,
            textAlign: textAlignCss(element.align),
            lineHeight: resolvedLineHeight(element),
            color: resolvedTextColor(element),
            py: 0.25,
          }}
        >
          {element.text ||
            (element.type === 'title' ? 'Title' : element.type === 'subtitle' ? 'Subtitle' : 'Text')}
        </Typography>
      )

    case 'value':
      return (
        <Typography
          component="div"
          sx={{
            fontSize: ptToCanvasPx(element.fontSize, scale),
            fontWeight: element.bold ? 700 : 400,
            textAlign: textAlignCss(element.align),
            lineHeight: resolvedLineHeight(element),
            color: resolvedTextColor(element),
            py: 0.25,
          }}
        >
          {resolveFieldValue(element.binding, previewData)}
        </Typography>
      )

    case 'columns': {
      const labelWidth = element.labelWidthMm ? mmToPx(element.labelWidthMm, scale) : undefined
      return (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, py: 0.2 }}>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}>
            <Typography
              component="span"
              sx={{
                fontSize: ptToCanvasPx(element.fontSize, scale),
                fontWeight: 600,
                color: '#444',
                minWidth: labelWidth,
                flexShrink: 0,
              }}
            >
              {element.leftLabel}:
            </Typography>
            <Typography component="span" sx={{ fontSize: ptToCanvasPx(element.fontSize, scale), color: '#1a1a1a' }}>
              {resolveFieldValue(element.leftBinding, previewData)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}>
            <Typography
              component="span"
              sx={{
                fontSize: ptToCanvasPx(element.fontSize, scale),
                fontWeight: 600,
                color: '#444',
                minWidth: labelWidth,
                flexShrink: 0,
              }}
            >
              {element.rightLabel}:
            </Typography>
            <Typography component="span" sx={{ fontSize: ptToCanvasPx(element.fontSize, scale), color: '#1a1a1a' }}>
              {resolveFieldValue(element.rightBinding, previewData)}
            </Typography>
          </Box>
        </Box>
      )
    }

    case 'field':
      return (
        <Box sx={{ display: 'flex', gap: 1, py: 0.2, alignItems: 'baseline' }}>
          <Typography
            component="span"
            sx={{
              fontSize: ptToCanvasPx(element.fontSize, scale),
              fontWeight: 600,
              color: '#444',
              minWidth: element.labelWidthMm ? mmToPx(element.labelWidthMm, scale) : '32%',
              flexShrink: 0,
            }}
          >
            {element.label || 'Label'}:
          </Typography>
          <Typography
            component="span"
            sx={{
              fontSize: ptToCanvasPx(element.fontSize, scale),
              fontWeight: element.bold ? 700 : 400,
              color: resolvedTextColor(element),
              flex: 1,
            }}
          >
            {resolveFieldValue(element.binding, previewData)}
          </Typography>
        </Box>
      )

    case 'table': {
      const cellPad = mmToPx(element.cellPaddingMm && element.cellPaddingMm > 0 ? element.cellPaddingMm : 1.4, scale)
      return (
        <Box sx={{ py: 0.5 }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: ptToCanvasPx(element.fontSize, scale),
            }}
          >
            <thead>
              <tr>
                {element.columns.map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: 'left',
                      padding: cellPad,
                      background: '#f0f0f0',
                      fontWeight: 600,
                      borderBottom: '1px solid #ddd',
                    }}
                  >
                    {formatTableColumnHeader(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.ContainerLines.map((line) => (
                <tr key={line.ContainerNo}>
                  {element.columns.map((col) => (
                    <td
                      key={col}
                      style={{
                        padding: cellPad,
                        borderBottom: '1px solid #eee',
                        fontFamily: col === 'ContainerNo' ? 'monospace' : 'inherit',
                      }}
                    >
                      {resolveTableCell(col, line)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )
    }

    case 'spacer':
      return (
        <Box
          sx={{
            height: mmToPx(element.heightMm, scale),
            minHeight: 4,
            borderRadius: 0.5,
            bgcolor: 'rgba(11, 61, 145, 0.06)',
            border: '1px dotted rgba(11, 61, 145, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
            {element.heightMm}mm
          </Typography>
        </Box>
      )

    case 'rule':
      return (
        <Box
          sx={{
            py: 0.5,
            borderBottom: `${Math.max(1, element.thicknessPt)}px solid`,
            borderColor: 'grey.400',
          }}
        />
      )

    case 'image':
      return <CanvasImagePreview element={element} scale={scale} />

    case 'signature':
      return (
        <SignatureBlockPreview
          align={element.align}
          caption={element.caption}
          titleText={element.titleText}
          showLine={element.showLine}
          fontSize={element.fontSize}
          showDigitalSeal={element.showDigitalSeal}
          digitalSealColor={element.digitalSealColor}
          scale={scale}
          textAlignCss={textAlignCss}
          resolveName={() =>
            element.nameBinding ? resolveFieldValue(element.nameBinding, previewData) : ''
          }
        />
      )

    case 'footer': {
      const suffix = element.binding ? resolveFieldValue(element.binding, previewData) : ''
      return (
        <Typography
          component="div"
          sx={{
            fontSize: ptToCanvasPx(element.fontSize, scale),
            textAlign: textAlignCss(element.align),
            lineHeight: resolvedLineHeight(element),
            color: resolvedTextColor(element, '#888'),
            py: 0.5,
          }}
        >
          {element.text}
          {suffix}
        </Typography>
      )
    }

    case 'stamp':
      return (
        <Box sx={{ py: 0.5, textAlign: textAlignCss(element.align) }}>
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              width: 'fit-content',
              whiteSpace: 'nowrap',
              border: `2px solid ${element.color || '#C62828'}`,
              color: element.color || '#C62828',
              px: 2,
              py: 0.75,
              fontSize: ptToCanvasPx(element.fontSize, scale),
              fontWeight: 700,
              letterSpacing: 1,
              lineHeight: 1.2,
            }}
          >
            {element.text || 'STAMP'}
          </Box>
        </Box>
      )

    case 'qrcode':
      return (
        <Box sx={{ py: 0.5, textAlign: textAlignCss(element.align) }}>
          {element.showCaption && element.caption && (
            <Typography
              sx={{
                fontSize: ptToCanvasPx(element.captionFontSize, scale),
                color: '#666',
                mb: 0.5,
              }}
            >
              {element.caption}
            </Typography>
          )}
          <Box
            sx={{
              display: 'inline-block',
              p: 0.5,
              bgcolor: '#fff',
              border: '1px solid #eee',
              width: mmToPx(element.widthMm, scale),
            }}
          >
            <QRCode
              value={previewData.VerificationUrl || SAMPLE_VERIFICATION_URL}
              size={Math.max(48, mmToPx(element.widthMm, scale) - 8)}
              style={{ width: '100%', height: 'auto' }}
            />
          </Box>
        </Box>
      )

    case 'row':
      return (
        <MultiColumnRowPreview
          slots={[element.left, element.right]}
          gapMm={element.gapMm}
          scale={scale}
          previewData={previewData}
        />
      )

    case 'tripleRow':
      return (
        <MultiColumnRowPreview
          slots={[element.left, element.center, element.right]}
          gapMm={element.gapMm}
          scale={scale}
          previewData={previewData}
        />
      )
  }
}

function MultiColumnRowPreview({
  slots,
  gapMm,
  scale,
  previewData,
}: {
  slots: CertificateRowSlot[]
  gapMm: number
  scale: number
  previewData: typeof SAMPLE_ATW_PREVIEW_DATA
}) {
  return (
    <Box sx={{ display: 'flex', py: 0.5, gap: mmToPx(gapMm, scale), alignItems: 'flex-start' }}>
      {slots.map((slot, index) => (
        <Box key={index} sx={{ flex: 1, minWidth: 0, textAlign: textAlignCss(slot.align) }}>
          <RowSlotPreview slot={slot} scale={scale} previewData={previewData} />
        </Box>
      ))}
    </Box>
  )
}

function RowSlotPreview({
  slot,
  scale,
  previewData,
}: {
  slot: CertificateRowSlot
  scale: number
  previewData: typeof SAMPLE_ATW_PREVIEW_DATA
}) {
  switch (slot.kind) {
    case 'image':
      return <CanvasRowImagePreview slot={slot} scale={scale} />
    case 'qrcode':
      return (
        <Box>
          {slot.showQrCaption && slot.qrCaption && (
            <Typography
              sx={{
                fontSize: ptToCanvasPx(slot.qrCaptionFontSize, scale),
                color: '#666',
                mb: 0.5,
              }}
            >
              {slot.qrCaption}
            </Typography>
          )}
          <Box
            sx={{
              display: 'inline-block',
              p: 0.5,
              bgcolor: '#fff',
              border: '1px solid #eee',
              width: mmToPx(slot.qrWidthMm, scale),
            }}
          >
            <QRCode
              value={previewData.VerificationUrl || SAMPLE_VERIFICATION_URL}
              size={Math.max(48, mmToPx(slot.qrWidthMm, scale) - 8)}
              style={{ width: '100%', height: 'auto' }}
            />
          </Box>
        </Box>
      )
    case 'signature':
      return (
        <SignatureBlockPreview
          align={slot.align}
          caption={slot.caption}
          titleText={slot.titleText}
          showLine={slot.showLine}
          fontSize={slot.fontSize}
          showDigitalSeal={slot.showDigitalSeal}
          digitalSealColor={slot.digitalSealColor}
          scale={scale}
          textAlignCss={textAlignCss}
          resolveName={() =>
            slot.nameBinding ? resolveFieldValue(slot.nameBinding, previewData) : ''
          }
        />
      )
    case 'stamp':
      return (
        <Box sx={{ py: 0.5 }}>
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              width: 'fit-content',
              maxWidth: '100%',
              whiteSpace: 'nowrap',
              border: `2px solid ${slot.stampColor || '#C62828'}`,
              color: slot.stampColor || '#C62828',
              px: 2,
              py: 0.75,
              fontSize: ptToCanvasPx(slot.stampFontSize ?? 22, scale),
              fontWeight: 700,
              letterSpacing: 1,
              lineHeight: 1.2,
            }}
          >
            {slot.stampText || 'RELEASED'}
          </Box>
        </Box>
      )
    default:
      return (
        <Box
          sx={{
            py: 2,
            px: 1,
            borderRadius: 1,
            border: '1px dashed',
            borderColor: 'divider',
            bgcolor: 'rgba(11, 61, 145, 0.04)',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Empty column
          </Typography>
        </Box>
      )
  }
}

function CanvasRowImagePreview({ slot, scale }: { slot: CertificateRowSlot; scale: number }) {
  const { url, loading } = useAssetUrlState(slot.src || undefined)

  if (!slot.src) {
    return (
      <Box
        sx={{
          py: 2,
          px: 1,
          borderRadius: 1,
          border: '2px dashed',
          borderColor: 'divider',
          bgcolor: 'rgba(11, 61, 145, 0.04)',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Upload image
        </Typography>
      </Box>
    )
  }

  return loading ? (
    <CircularProgress size={20} />
  ) : url ? (
    <Box>
      <Box
        component="img"
        src={url}
        alt={slot.alt || 'Image'}
        sx={{ maxWidth: '100%', width: mmToPx(slot.widthMm, scale), height: 'auto', display: 'inline-block' }}
      />
      <ImageCaptionPreview
        showTitle={slot.showImageTitle}
        title={slot.imageTitle}
        subtitle={slot.imageSubtitle}
        titleFontSize={slot.imageTitleFontSize ?? 10}
        subtitleFontSize={slot.imageSubtitleFontSize ?? 8}
        align={slot.align}
        scale={scale}
      />
    </Box>
  ) : null
}

function ImageCaptionPreview({
  showTitle,
  title,
  subtitle,
  titleFontSize,
  subtitleFontSize,
  align,
  scale,
}: {
  showTitle?: boolean
  title?: string
  subtitle?: string
  titleFontSize: number
  subtitleFontSize: number
  align: string
  scale: number
}) {
  if (!showTitle && !subtitle) return null

  return (
    <Box sx={{ mt: 0.5, textAlign: textAlignCss(align) }}>
      {showTitle && title && (
        <Typography
          sx={{
            fontSize: ptToCanvasPx(titleFontSize, scale),
            fontWeight: 600,
            color: '#1a1a1a',
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
      )}
      {subtitle && (
        <Typography
          sx={{
            fontSize: ptToCanvasPx(subtitleFontSize, scale),
            color: '#666',
            lineHeight: 1.2,
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  )
}

function CanvasImagePreview({
  element,
  scale,
}: {
  element: Extract<CertificateLayoutElement, { type: 'image' }>
  scale: number
}) {
  const { url, loading } = useAssetUrlState(element.src || undefined)

  if (!element.src) {
    return (
      <Box
        sx={{
          py: 2,
          px: 1,
          borderRadius: 1,
          border: '2px dashed',
          borderColor: 'divider',
          bgcolor: 'rgba(11, 61, 145, 0.04)',
          textAlign: 'center',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Upload an image in the properties panel
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ py: 0.5, textAlign: textAlignCss(element.align) }}>
      {loading ? (
        <CircularProgress size={20} />
      ) : url ? (
        <Box>
          <Box
            component="img"
            src={url}
            alt={element.alt || 'Certificate image'}
            sx={{
              maxWidth: '100%',
              width: mmToPx(element.widthMm, scale),
              height: element.heightMm ? mmToPx(element.heightMm, scale) : 'auto',
              objectFit: 'contain',
              display: 'inline-block',
            }}
          />
          <ImageCaptionPreview
            showTitle={element.showTitle}
            title={element.title}
            subtitle={element.subtitle}
            titleFontSize={element.titleFontSize ?? 10}
            subtitleFontSize={element.subtitleFontSize ?? 8}
            align={element.align}
            scale={scale}
          />
        </Box>
      ) : (
        <Typography variant="caption" color="error">
          Image failed to load
        </Typography>
      )}
    </Box>
  )
}

function SpacerResizeHandle({
  heightMm,
  scale,
  onResize,
}: {
  heightMm: number
  scale: number
  onResize: (heightMm: number) => void
}) {
  const onPointerDown = (event: React.PointerEvent) => {
    event.stopPropagation()
    event.preventDefault()
    const startY = event.clientY
    const startHeight = heightMm

    const onMove = (moveEvent: PointerEvent) => {
      const deltaPx = moveEvent.clientY - startY
      const deltaMm = deltaPx / scale
      onResize(Math.max(1, Math.round((startHeight + deltaMm) * 2) / 2))
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <Box
      onPointerDown={onPointerDown}
      sx={{
        position: 'absolute',
        left: '20%',
        right: '20%',
        bottom: -6,
        height: 10,
        cursor: 'ns-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&::after': {
          content: '""',
          width: 40,
          height: 4,
          borderRadius: 2,
          bgcolor: primary,
        },
      }}
    />
  )
}

export function ElementPaletteItem({
  label,
  description,
  onClick,
  onDragStart,
}: {
  label: string
  description: string
  onClick: () => void
  onDragStart?: (event: DragEvent) => void
}) {
  return (
    <Box
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onClick={onClick}
      sx={{
        p: 1.25,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        cursor: 'grab',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': {
          borderColor: primary,
          boxShadow: '0 2px 8px rgba(11, 61, 145, 0.08)',
        },
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {description}
      </Typography>
    </Box>
  )
}
