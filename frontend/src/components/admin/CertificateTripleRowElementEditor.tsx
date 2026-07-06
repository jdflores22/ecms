import { Box, Button, ButtonGroup, TextField, Typography } from '@mui/material'
import {
  defaultRowSlot,
  type CertificateMergeField,
  type CertificateRowSlot,
  type CertificateRowSlotKind,
  type CertificateTripleRowElement,
} from '../../utils/certificateLayoutTypes'
import { RowSlotEditor, rowSlotFieldSx } from './CertificateRowSlotEditor'

type TripleSlotSide = 'left' | 'center' | 'right'

interface CertificateTripleRowElementEditorProps {
  element: CertificateTripleRowElement
  templateId: number
  mergeFields: CertificateMergeField[]
  onChange: (next: CertificateTripleRowElement) => void
}

export default function CertificateTripleRowElementEditor({
  element,
  templateId,
  mergeFields,
  onChange,
}: CertificateTripleRowElementEditorProps) {
  const fieldBindings = mergeFields.filter((f) => f.kind === 'field')

  const applyPreset = (left: CertificateRowSlotKind, center: CertificateRowSlotKind, right: CertificateRowSlotKind) => {
    onChange({
      ...element,
      left: defaultRowSlot(left),
      center: defaultRowSlot(center),
      right: defaultRowSlot(right),
    })
  }

  const updateSlot = (side: TripleSlotSide, slot: CertificateRowSlot) => {
    onChange({ ...element, [side]: slot })
  }

  const setSlotKind = (side: TripleSlotSide, kind: CertificateRowSlotKind) => {
    updateSlot(side, defaultRowSlot(kind))
  }

  const slotEditors: { side: TripleSlotSide; title: string }[] = [
    { side: 'left', title: 'Left column' },
    { side: 'center', title: 'Center column' },
    { side: 'right', title: 'Right column' },
  ]

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        Place three elements in one row — e.g. logo, stamp, and verification QR.
      </Typography>

      <ButtonGroup size="small" variant="outlined" sx={{ flexWrap: 'wrap' }}>
        <Button onClick={() => applyPreset('image', 'stamp', 'qrcode')}>Image | Stamp | QR</Button>
        <Button onClick={() => applyPreset('signature', 'stamp', 'qrcode')}>Signature | Stamp | QR</Button>
        <Button onClick={() => applyPreset('image', 'signature', 'qrcode')}>Image | Signature | QR</Button>
      </ButtonGroup>

      <TextField
        label="Column gap (mm)"
        type="number"
        size="small"
        value={element.gapMm}
        onChange={(e) => onChange({ ...element, gapMm: Number(e.target.value) || 0 })}
        sx={rowSlotFieldSx}
      />

      {slotEditors.map(({ side, title }) => (
        <RowSlotEditor
          key={side}
          title={title}
          slot={element[side]}
          templateId={templateId}
          fieldBindings={fieldBindings}
          onChange={(slot) => updateSlot(side, slot)}
          onKindChange={(kind) => setSlotKind(side, kind)}
        />
      ))}
    </Box>
  )
}
