import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import { Alert, Box, Button, Typography } from '@mui/material'
import { useRef, useState } from 'react'
import { preAdviceApi, type PreAdviceDocument } from '../../services/api'
import type { PreAdviceIdentityUnit } from '../../utils/preAdviceIdentityUnit'

type CroEdoUnitUploadPanelProps = {
  preAdviceId: number
  unit: PreAdviceIdentityUnit
  unitLabel: string
  existing?: PreAdviceDocument | null
  canManage: boolean
  onUploaded: (doc: PreAdviceDocument) => void
}

export default function CroEdoUnitUploadPanel({
  preAdviceId,
  unit,
  unitLabel,
  existing,
  canManage,
  onUploaded,
}: CroEdoUnitUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  if (!canManage && !existing) return null

  const handleFile = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const { data } = await preAdviceApi.uploadDocument(preAdviceId, file, 'CroEdo', undefined, undefined, unit)
      onUploaded(data)
    } catch {
      setError('Failed to upload CRO/eDO.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        CRO / eDO — {unitLabel}
      </Typography>
      {existing ? (
        <Typography variant="body2" color="text.secondary">
          On file: <strong>{existing.fileName}</strong>
        </Typography>
      ) : canManage ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
              e.target.value = ''
            }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<UploadFileOutlinedIcon />}
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            {uploading ? 'Uploading…' : 'Upload CRO / eDO'}
          </Button>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">Not uploaded</Typography>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 1, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  )
}
