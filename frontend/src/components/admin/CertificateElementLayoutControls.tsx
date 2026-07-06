import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  TextField,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  PADDING_SIDE_LABELS,
  SPACING_SIDE_LABELS,
  clearElementLayout,
  hasLayoutOverrides,
  supportsCellPadding,
  supportsLabelWidth,
  supportsTextLayout,
  type PaddingSide,
  type SpacingSide,
} from '../../utils/certificateLayoutSpacing'
import type { CertificateLayoutElement } from '../../utils/certificateLayoutTypes'

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

interface CertificateElementLayoutControlsProps {
  element: CertificateLayoutElement
  onChange: (next: CertificateLayoutElement) => void
}

function spacingField(
  element: CertificateLayoutElement,
  key: SpacingSide | PaddingSide,
  label: string,
  onChange: (next: CertificateLayoutElement) => void,
) {
  const value = (element as CertificateLayoutElement & Record<string, number | undefined>)[key] ?? ''
  return (
    <TextField
      key={key}
      label={label}
      type="number"
      size="small"
      value={value}
      onChange={(e) => {
        const raw = e.target.value
        onChange({
          ...element,
          [key]: raw === '' ? 0 : Math.max(0, Number(raw) || 0),
        })
      }}
      sx={fieldSx}
    />
  )
}

export default function CertificateElementLayoutControls({
  element,
  onChange,
}: CertificateElementLayoutControlsProps) {
  const showText = supportsTextLayout(element)
  const showLabelWidth = supportsLabelWidth(element)
  const showCellPadding = supportsCellPadding(element)

  return (
    <Accordion
      disableGutters
      elevation={0}
      defaultExpanded={hasLayoutOverrides(element)}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px !important',
        '&:before': { display: 'none' },
        bgcolor: 'rgba(11, 61, 145, 0.02)',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Spacing & layout
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, display: 'grid', gap: 1.5 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
            Margin (mm) — space outside the element
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {(Object.keys(SPACING_SIDE_LABELS) as SpacingSide[]).map((key) =>
              spacingField(element, key, SPACING_SIDE_LABELS[key], onChange),
            )}
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
            Padding (mm) — space inside the element
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {(Object.keys(PADDING_SIDE_LABELS) as PaddingSide[]).map((key) =>
              spacingField(element, key, PADDING_SIDE_LABELS[key], onChange),
            )}
          </Box>
        </Box>

        {showText && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TextField
              label="Line height"
              type="number"
              size="small"
              value={element.lineHeight ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                onChange({ ...element, lineHeight: raw === '' ? 0 : Math.max(0, Number(raw) || 0) })
              }}
              sx={fieldSx}
              placeholder="1.35"
              helperText="0 = default"
            />
            <TextField
              label="Text color"
              size="small"
              value={element.textColor ?? ''}
              onChange={(e) => onChange({ ...element, textColor: e.target.value })}
              sx={fieldSx}
              placeholder="#1a1a1a"
            />
          </Box>
        )}

        {showLabelWidth && (
          <TextField
            label="Label width (mm)"
            type="number"
            size="small"
            value={element.labelWidthMm ?? ''}
            onChange={(e) => {
              const raw = e.target.value
              onChange({ ...element, labelWidthMm: raw === '' ? 0 : Math.max(0, Number(raw) || 0) })
            }}
            sx={fieldSx}
            helperText="0 = auto (42mm default)"
          />
        )}

        {showCellPadding && (
          <TextField
            label="Cell padding (mm)"
            type="number"
            size="small"
            value={element.cellPaddingMm ?? ''}
            onChange={(e) => {
              const raw = e.target.value
              onChange({ ...element, cellPaddingMm: raw === '' ? 0 : Math.max(0, Number(raw) || 0) })
            }}
            sx={fieldSx}
            helperText="0 = default (~1.4mm)"
          />
        )}

        {hasLayoutOverrides(element) && (
          <Button
            size="small"
            variant="text"
            onClick={() => onChange(clearElementLayout(element))}
            sx={{ justifySelf: 'start', fontWeight: 600 }}
          >
            Reset spacing & layout
          </Button>
        )}
      </AccordionDetails>
    </Accordion>
  )
}
