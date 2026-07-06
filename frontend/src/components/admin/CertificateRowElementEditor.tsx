import { Box, Button, ButtonGroup, TextField, Typography } from '@mui/material'
import {
  defaultRowSlot,
  type CertificateMergeField,
  type CertificateRowElement,
  type CertificateRowSlot,
  type CertificateRowSlotKind,
} from '../../utils/certificateLayoutTypes'
import { RowSlotEditor, rowSlotFieldSx } from './CertificateRowSlotEditor'

interface CertificateRowElementEditorProps {
  element: CertificateRowElement
  templateId: number
  mergeFields: CertificateMergeField[]
  onChange: (next: CertificateRowElement) => void
}

export default function CertificateRowElementEditor({
  element,
  templateId,
  mergeFields,
  onChange,
}: CertificateRowElementEditorProps) {
  const fieldBindings = mergeFields.filter((f) => f.kind === 'field')

  const applyPreset = (left: CertificateRowSlotKind, right: CertificateRowSlotKind) => {
    onChange({
      ...element,
      left: defaultRowSlot(left),
      right: defaultRowSlot(right),
    })
  }

  const updateSlot = (side: 'left' | 'right', slot: CertificateRowSlot) => {
    onChange({ ...element, [side]: slot })
  }

  const setSlotKind = (side: 'left' | 'right', kind: CertificateRowSlotKind) => {
    updateSlot(side, defaultRowSlot(kind))
  }

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        Place two elements side by side — e.g. logo and verification QR, or signature and QR.
      </Typography>

      <ButtonGroup size="small" variant="outlined" sx={{ flexWrap: 'wrap' }}>
        <Button onClick={() => applyPreset('image', 'qrcode')}>Image | QR</Button>
        <Button onClick={() => applyPreset('signature', 'qrcode')}>Signature | QR</Button>
        <Button onClick={() => applyPreset('stamp', 'qrcode')}>Stamp | QR</Button>
      </ButtonGroup>

      <TextField
        label="Column gap (mm)"
        type="number"
        size="small"
        value={element.gapMm}
        onChange={(e) => onChange({ ...element, gapMm: Number(e.target.value) || 0 })}
        sx={rowSlotFieldSx}
      />

      <RowSlotEditor
        title="Left column"
        slot={element.left}
        templateId={templateId}
        fieldBindings={fieldBindings}
        onChange={(slot) => updateSlot('left', slot)}
        onKindChange={(kind) => setSlotKind('left', kind)}
      />

      <RowSlotEditor
        title="Right column"
        slot={element.right}
        templateId={templateId}
        fieldBindings={fieldBindings}
        onChange={(slot) => updateSlot('right', slot)}
        onKindChange={(kind) => setSlotKind('right', kind)}
      />
    </Box>
  )
}
