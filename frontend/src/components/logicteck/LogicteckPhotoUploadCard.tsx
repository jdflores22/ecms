import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material'
import { useRef } from 'react'
import { LOGICTECK_FORM_BORDER, LOGICTECK_FORM_FIELD_BG } from '../../config/logicteckEmptyReturn'

type LogicteckPhotoUploadCardProps = {
  label: string
  required?: boolean
  file: File | null
  isDamaged: boolean
  onFileChange: (file: File | null) => void
  onDamagedChange: (damaged: boolean) => void
  accept?: string
  hint?: string
}

export default function LogicteckPhotoUploadCard({
  label,
  required = false,
  file,
  isDamaged,
  onFileChange,
  onDamagedChange,
  accept = 'image/*,.pdf',
  hint = 'PDF, PNG, JPG (MAX. 5MB)',
}: LogicteckPhotoUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <Box>
      <Box
        component="button"
        type="button"
        onClick={() => inputRef.current?.click()}
        sx={{
          width: '100%',
          minHeight: 132,
          p: 1.5,
          border: '2px dashed',
          borderColor: file ? LOGICTECK_FORM_BORDER : 'divider',
          borderRadius: 2,
          bgcolor: file ? LOGICTECK_FORM_FIELD_BG : '#fafafa',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          textAlign: 'center',
        }}
      >
        <CloudUploadOutlinedIcon sx={{ color: 'text.secondary' }} />
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {label}
          {required && (
            <Box component="span" sx={{ color: 'error.main' }}>
              {' '}
              *
            </Box>
          )}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {file ? file.name : 'Tap to upload'}
        </Typography>
        {!file && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Box>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept}
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={isDamaged}
            onChange={(e) => onDamagedChange(e.target.checked)}
          />
        }
        label={<Typography variant="caption">Damaged</Typography>}
        sx={{ ml: 0, mt: 0.5 }}
      />
    </Box>
  )
}
