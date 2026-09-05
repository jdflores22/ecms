import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import UploadFileIcon from '@mui/icons-material/UploadFile'

type CroEdoLegacyUploadPanelProps = {
  fileName: string
  onFileChange: (file: File | null) => void
  disabled?: boolean
}

export default function CroEdoLegacyUploadPanel({
  fileName,
  onFileChange,
  disabled,
}: CroEdoLegacyUploadPanelProps) {
  const reset = () => onFileChange(null)

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: { xs: 2, sm: 2.5 },
        mb: 2.5,
        bgcolor: 'rgba(11, 61, 145, 0.03)',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
        <DescriptionOutlinedIcon color="primary" />
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          Attach CRO / eDO copy
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upload a clear photo or PDF of your issued CRO/eDO. No ICS QR is required for legacy documents
        issued outside the system.
      </Typography>

      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            disabled={disabled}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {fileName || 'Upload CRO / eDO'}
            <input
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf,.pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                onFileChange(file)
                e.target.value = ''
              }}
            />
          </Button>
          {fileName && (
            <Button color="inherit" disabled={disabled} onClick={reset} sx={{ borderRadius: 2 }}>
              Clear
            </Button>
          )}
        </Stack>

        {!fileName && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Upload a photo or PDF of your CRO/eDO document before creating the draft.
          </Alert>
        )}

        {fileName && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Document attached: <strong>{fileName}</strong>
          </Alert>
        )}
      </Stack>
    </Box>
  )
}
