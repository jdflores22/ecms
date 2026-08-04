import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { useState } from 'react'
import {
  verifyCroEdoPublic,
  type CroEdoVerificationLine,
  type CroEdoVerificationResult,
} from '../../services/publicApi'
import { extractCroEdoTokenFromFile } from '../../utils/croEdoQr'
import { croFreeTimeExpiredMessage, isCroFreeTimeExpired } from '../../utils/croFreeTime'

export type CroEdoAttachSuccess = {
  token: string
  file: File | null
  result: CroEdoVerificationResult
  line: CroEdoVerificationLine
}

type CroEdoAttachPanelProps = {
  onLinked: (payload: CroEdoAttachSuccess) => void
  onCleared: () => void
  disabled?: boolean
}

export default function CroEdoAttachPanel({ onLinked, onCleared, disabled }: CroEdoAttachPanelProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [result, setResult] = useState<CroEdoVerificationResult | null>(null)
  const [token, setToken] = useState('')
  const [selectedLineNo, setSelectedLineNo] = useState<number | ''>('')

  const reset = () => {
    setError('')
    setFileName('')
    setPendingFile(null)
    setResult(null)
    setToken('')
    setSelectedLineNo('')
    onCleared()
  }

  const applyVerified = (
    verifiedToken: string,
    verified: CroEdoVerificationResult,
    file: File | null,
    lineNo?: number,
  ) => {
    if (!verified.valid || !verified.lines?.length) {
      setError(verified.message || 'CRO/eDO could not be verified.')
      setResult(null)
      setToken('')
      onCleared()
      return
    }

    setResult(verified)
    setToken(verifiedToken)
    const line =
      lineNo != null
        ? verified.lines.find((l) => l.lineNo === lineNo)
        : verified.lines.length === 1
          ? verified.lines[0]
          : undefined

    if (!line) {
      setSelectedLineNo('')
      onCleared()
      return
    }

    setSelectedLineNo(line.lineNo)
    onLinked({ token: verifiedToken, file, result: verified, line })
  }

  const verifyToken = async (rawToken: string, file: File | null) => {
    setBusy(true)
    setError('')
    try {
      const verified = await verifyCroEdoPublic(rawToken)
      applyVerified(rawToken, verified, file)
    } catch {
      setError('Unable to reach the verification service. Please try again.')
      onCleared()
    } finally {
      setBusy(false)
    }
  }

  const onFileChange = async (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file) return
    setBusy(true)
    setError('')
    setFileName(file.name)
    setPendingFile(file)
    try {
      const decoded = await extractCroEdoTokenFromFile(file)
      if (!decoded) {
        setError('Could not read a CRO/eDO QR from that file. Try a clearer photo or PDF of the QR.')
        onCleared()
        return
      }
      await verifyToken(decoded, file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read CRO/eDO file.')
      onCleared()
    } finally {
      setBusy(false)
    }
  }

  const onLineChange = (lineNo: number) => {
    if (!result || !token) return
    applyVerified(token, result, pendingFile, lineNo)
  }

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
        <QrCodeScannerIcon color="primary" />
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          Attach CRO / eDO
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upload the issued CRO/eDO (PDF or photo of the QR). The system reads the QR and fills container
        details automatically.
      </Typography>

      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button
            component="label"
            variant="outlined"
            startIcon={busy ? <CircularProgress size={16} /> : <UploadFileIcon />}
            disabled={disabled || busy}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {fileName || 'Upload CRO / eDO'}
            <input
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf,.pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                void onFileChange(e.target.files)
                e.target.value = ''
              }}
            />
          </Button>
          {(result || fileName) && (
            <Button color="inherit" disabled={disabled || busy} onClick={reset} sx={{ borderRadius: 2 }}>
              Clear
            </Button>
          )}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {result?.valid && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Verified CRO {result.referenceNo}
            {result.blNumber ? ` · BL ${result.blNumber}` : ''}.
          </Alert>
        )}

        {result?.valid && result.lines && result.lines.length > 1 && (
          <FormControl size="small" fullWidth>
            <InputLabel id="cro-line-label">Container line</InputLabel>
            <Select
              labelId="cro-line-label"
              label="Container line"
              value={selectedLineNo}
              disabled={disabled || busy}
              onChange={(e) => onLineChange(Number(e.target.value))}
              sx={{ borderRadius: 2 }}
            >
              {result.lines.map((line) => (
                <MenuItem key={line.lineNo} value={line.lineNo}>
                  {line.containerNumber} · {line.size} {line.type} · free until {line.demurrageValidUntil}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {result?.valid && selectedLineNo !== '' && result.lines && (
          <>
            <Typography variant="body2" color="text.secondary">
              Free time:{' '}
              <strong>
                {result.lines.find((l) => l.lineNo === selectedLineNo)?.demurrageValidUntil || '—'}
              </strong>
              {' · '}
              Return to:{' '}
              <strong>
                {result.lines.find((l) => l.lineNo === selectedLineNo)?.returnEmptyTo || '—'}
              </strong>
            </Typography>
            {isCroFreeTimeExpired(
              result.lines.find((l) => l.lineNo === selectedLineNo)?.demurrageValidUntil,
            ) && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                {croFreeTimeExpiredMessage(
                  result.lines.find((l) => l.lineNo === selectedLineNo)?.demurrageValidUntil,
                )}
              </Alert>
            )}
          </>
        )}
      </Stack>
    </Box>
  )
}
