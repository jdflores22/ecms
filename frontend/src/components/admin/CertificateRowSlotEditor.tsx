import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { useRef, useState } from 'react'
import { certificateTemplateApi } from '../../services/api'
import { useAssetUrlState } from '../../hooks/useAssetUrl'
import type { CertificateMergeField, CertificateRowSlot, CertificateRowSlotKind } from '../../utils/certificateLayoutTypes'
import { SignatureDigitalSealControls } from './certificateDigitalSeal'

export const rowSlotFieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

export const ROW_SLOT_KINDS: { value: CertificateRowSlotKind; label: string }[] = [
  { value: 'empty', label: 'Empty' },
  { value: 'image', label: 'Image' },
  { value: 'qrcode', label: 'Verification QR' },
  { value: 'signature', label: 'Signature' },
  { value: 'stamp', label: 'Stamp badge' },
]

export function RowSlotEditor({
  title,
  slot,
  templateId,
  fieldBindings,
  onChange,
  onKindChange,
}: {
  title: string
  slot: CertificateRowSlot
  templateId: number
  fieldBindings: CertificateMergeField[]
  onChange: (slot: CertificateRowSlot) => void
  onKindChange: (kind: CertificateRowSlotKind) => void
}) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 1 }}>
        {title}
      </Typography>

      <FormControl fullWidth size="small" sx={{ mb: 1.5, ...rowSlotFieldSx }}>
        <InputLabel>Content type</InputLabel>
        <Select
          label="Content type"
          value={slot.kind}
          onChange={(e) => onKindChange(e.target.value as CertificateRowSlotKind)}
        >
          {ROW_SLOT_KINDS.map((k) => (
            <MenuItem key={k.value} value={k.value}>
              {k.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {slot.kind !== 'empty' && (
        <AlignSelect align={slot.align} onChange={(align) => onChange({ ...slot, align })} />
      )}

      {slot.kind === 'image' && (
        <RowImageUpload slot={slot} templateId={templateId} onChange={onChange} />
      )}

      {slot.kind === 'qrcode' && (
        <Box sx={{ display: 'grid', gap: 1.5, mt: 1.5 }}>
          <TextField
            label="QR size (mm)"
            type="number"
            size="small"
            value={slot.qrWidthMm}
            onChange={(e) => onChange({ ...slot, qrWidthMm: Number(e.target.value) || 28 })}
            sx={rowSlotFieldSx}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={slot.showQrCaption}
                onChange={(e) => onChange({ ...slot, showQrCaption: e.target.checked })}
              />
            }
            label="Show caption"
          />
          {slot.showQrCaption && (
            <>
              <TextField
                label="Caption"
                size="small"
                value={slot.qrCaption}
                onChange={(e) => onChange({ ...slot, qrCaption: e.target.value })}
                sx={rowSlotFieldSx}
              />
              <TextField
                label="Caption size (pt)"
                type="number"
                size="small"
                value={slot.qrCaptionFontSize}
                onChange={(e) => onChange({ ...slot, qrCaptionFontSize: Number(e.target.value) || 8 })}
                sx={rowSlotFieldSx}
              />
            </>
          )}
        </Box>
      )}

      {slot.kind === 'signature' && (
        <Box sx={{ display: 'grid', gap: 1.5, mt: 1.5 }}>
          <TextField
            label="Caption"
            size="small"
            value={slot.caption}
            onChange={(e) => onChange({ ...slot, caption: e.target.value })}
            sx={rowSlotFieldSx}
          />
          <FormControl size="small" sx={rowSlotFieldSx}>
            <InputLabel>Name binding (optional)</InputLabel>
            <Select
              label="Name binding (optional)"
              value={slot.nameBinding}
              onChange={(e) => onChange({ ...slot, nameBinding: e.target.value })}
            >
              <MenuItem value="">(blank line)</MenuItem>
              {fieldBindings.map((field) => (
                <MenuItem key={field.key} value={field.key}>
                  {field.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Title / role"
            size="small"
            value={slot.titleText}
            onChange={(e) => onChange({ ...slot, titleText: e.target.value })}
            sx={rowSlotFieldSx}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={slot.showLine}
                onChange={(e) => onChange({ ...slot, showLine: e.target.checked })}
              />
            }
            label="Show signature line"
          />
          <SignatureDigitalSealControls
            showDigitalSeal={slot.showDigitalSeal}
            digitalSealColor={slot.digitalSealColor}
            onShowDigitalSealChange={(showDigitalSeal) => onChange({ ...slot, showDigitalSeal })}
            onDigitalSealColorChange={(digitalSealColor) => onChange({ ...slot, digitalSealColor })}
            fieldSx={rowSlotFieldSx}
          />
          <TextField
            label="Font size (pt)"
            type="number"
            size="small"
            value={slot.fontSize}
            onChange={(e) => onChange({ ...slot, fontSize: Number(e.target.value) || 10 })}
            sx={rowSlotFieldSx}
          />
        </Box>
      )}

      {slot.kind === 'stamp' && (
        <Box sx={{ display: 'grid', gap: 1.5, mt: 1.5 }}>
          <TextField
            label="Stamp text"
            size="small"
            value={slot.stampText ?? 'RELEASED'}
            onChange={(e) => onChange({ ...slot, stampText: e.target.value })}
            sx={rowSlotFieldSx}
          />
          <TextField
            label="Color (hex)"
            size="small"
            value={slot.stampColor ?? '#C62828'}
            onChange={(e) => onChange({ ...slot, stampColor: e.target.value })}
            sx={rowSlotFieldSx}
            placeholder="#C62828"
          />
          <TextField
            label="Font size (pt)"
            type="number"
            size="small"
            value={slot.stampFontSize ?? 22}
            onChange={(e) => onChange({ ...slot, stampFontSize: Number(e.target.value) || 22 })}
            sx={rowSlotFieldSx}
          />
        </Box>
      )}
    </Box>
  )
}

function AlignSelect({ align, onChange }: { align: string; onChange: (align: string) => void }) {
  return (
    <FormControl fullWidth size="small" sx={rowSlotFieldSx}>
      <InputLabel>Align</InputLabel>
      <Select label="Align" value={align} onChange={(e) => onChange(e.target.value)}>
        <MenuItem value="left">Left</MenuItem>
        <MenuItem value="center">Center</MenuItem>
        <MenuItem value="right">Right</MenuItem>
      </Select>
    </FormControl>
  )
}

function RowImageUpload({
  slot,
  templateId,
  onChange,
}: {
  slot: CertificateRowSlot
  templateId: number
  onChange: (slot: CertificateRowSlot) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const { url, loading } = useAssetUrlState(slot.src || undefined)

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const { data } = await certificateTemplateApi.uploadImage(templateId, file)
      onChange({ ...slot, src: data.path, alt: slot.alt || data.fileName })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box sx={{ display: 'grid', gap: 1.5, mt: 1.5 }}>
      <Box
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          minHeight: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 1,
        }}
      >
        {!slot.src ? (
          <ImageOutlinedIcon sx={{ color: 'text.disabled' }} />
        ) : loading ? (
          <Typography variant="caption">Loading…</Typography>
        ) : url ? (
          <Box component="img" src={url} alt={slot.alt || 'Image'} sx={{ maxHeight: 72, maxWidth: '100%' }} />
        ) : null}
      </Box>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleUpload(file)
          e.target.value = ''
        }}
      />
      <Button
        size="small"
        variant="outlined"
        startIcon={<CloudUploadOutlinedIcon />}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        sx={{ fontWeight: 600 }}
      >
        {uploading ? 'Uploading…' : slot.src ? 'Replace image' : 'Upload image'}
      </Button>
      <TextField
        label="Width (mm)"
        type="number"
        size="small"
        value={slot.widthMm}
        onChange={(e) => onChange({ ...slot, widthMm: Number(e.target.value) || 40 })}
        sx={rowSlotFieldSx}
      />
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={slot.showImageTitle ?? false}
            onChange={(e) => onChange({ ...slot, showImageTitle: e.target.checked })}
          />
        }
        label="Show title under image"
      />
      {(slot.showImageTitle ?? false) && (
        <>
          <TextField
            label="Title"
            size="small"
            value={slot.imageTitle ?? ''}
            onChange={(e) => onChange({ ...slot, imageTitle: e.target.value })}
            sx={rowSlotFieldSx}
          />
          <TextField
            label="Subtitle (optional)"
            size="small"
            value={slot.imageSubtitle ?? ''}
            onChange={(e) => onChange({ ...slot, imageSubtitle: e.target.value })}
            sx={rowSlotFieldSx}
          />
          <TextField
            label="Title size (pt)"
            type="number"
            size="small"
            value={slot.imageTitleFontSize ?? 10}
            onChange={(e) => onChange({ ...slot, imageTitleFontSize: Number(e.target.value) || 10 })}
            sx={rowSlotFieldSx}
          />
          <TextField
            label="Subtitle size (pt)"
            type="number"
            size="small"
            value={slot.imageSubtitleFontSize ?? 8}
            onChange={(e) => onChange({ ...slot, imageSubtitleFontSize: Number(e.target.value) || 8 })}
            sx={rowSlotFieldSx}
          />
        </>
      )}
    </Box>
  )
}
