import { Box, Chip, CircularProgress, IconButton, Slider, Tooltip, Typography } from '@mui/material'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { useCallback, useMemo, useState, type DragEvent } from 'react'
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  SAMPLE_ATW_PREVIEW_DATA,
  elementTypeLabel,
  formatTableColumnHeader,
  mmToPx,
  ptToCanvasPx,
  resolveFieldValue,
  resolveTableCell,
  textAlignCss,
} from '../../utils/certificateLayoutPreview'
import type { CertificateLayoutDefinition, CertificateLayoutElement } from '../../utils/certificateLayoutTypes'
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

      <Box sx={{ px: 0.5, py: 0.25 }}>
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
    case 'text':
      return (
        <Typography
          component="div"
          sx={{
            fontSize: ptToCanvasPx(element.fontSize, scale),
            fontWeight: element.bold ? 700 : 400,
            textAlign: textAlignCss(element.align),
            lineHeight: 1.35,
            color: '#1a1a1a',
            py: 0.25,
          }}
        >
          {element.text || (element.type === 'title' ? 'Title' : 'Text')}
        </Typography>
      )

    case 'field':
      return (
        <Box sx={{ display: 'flex', gap: 1, py: 0.2, alignItems: 'baseline' }}>
          <Typography
            component="span"
            sx={{
              fontSize: ptToCanvasPx(element.fontSize, scale),
              fontWeight: 600,
              color: '#444',
              minWidth: '32%',
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
              color: '#1a1a1a',
              flex: 1,
            }}
          >
            {resolveFieldValue(element.binding, previewData)}
          </Typography>
        </Box>
      )

    case 'table':
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
                      padding: '4px 6px',
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
                        padding: '4px 6px',
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
  }
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
