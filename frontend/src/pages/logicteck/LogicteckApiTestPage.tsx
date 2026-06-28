import ApiOutlinedIcon from '@mui/icons-material/ApiOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SearchIcon from '@mui/icons-material/Search'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import PreAdviceFullDossier from '../../components/preAdvice/PreAdviceFullDossier'
import { listPageRootSx, LIST_PRIMARY } from '../../components/layout/ListPagePrimitives'
import {
  LOGICTECK_API_TEST,
  resolveLogicteckExternalStatus,
  type LogicteckLookupResult,
  type LogicteckValidateResult,
} from '../../config/logicteckApiTest'
import { preAdviceApi, type PreAdvice, type PreAdviceDocument, type PreAdviceLookups, type QrBooking, type Schedule } from '../../services/api'
import { loadPreAdviceDossierByQr } from '../../utils/preAdviceDossierLoader'

const primaryDark = LIST_PRIMARY
const API_KEY_STORAGE = 'ecms.logicteckApiKey'
const API_BASE_STORAGE = 'ecms.logicteckPublicApiBase'

function statusChipColor(status: string | null): 'default' | 'success' | 'info' {
  if (status === LOGICTECK_API_TEST.statusRetrieved) return 'default'
  if (status === LOGICTECK_API_TEST.statusBooked) return 'info'
  if (status === LOGICTECK_API_TEST.statusAvailable) return 'success'
  return 'default'
}

async function readResponseBody(res: Response): Promise<{ status: number; body: unknown }> {
  const text = await res.text()
  if (!text) return { status: res.status, body: null }
  try {
    return { status: res.status, body: JSON.parse(text) }
  } catch {
    return { status: res.status, body: text }
  }
}

function buildHeaders(apiKey: string): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (apiKey.trim()) headers[LOGICTECK_API_TEST.apiKeyHeader] = apiKey.trim()
  return headers
}

export default function LogicteckApiTestPage() {
  const [searchParams] = useSearchParams()
  const [qrCode, setQrCode] = useState(searchParams.get('qr') ?? '')
  const [apiBase, setApiBase] = useState(
    () => sessionStorage.getItem(API_BASE_STORAGE) || LOGICTECK_API_TEST.defaultPublicApiBase,
  )
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem(API_KEY_STORAGE) ?? '')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [validateLoading, setValidateLoading] = useState(false)
  const [lookupResult, setLookupResult] = useState<LogicteckLookupResult | null>(null)
  const [lookupHttp, setLookupHttp] = useState<{ status: number; body: unknown } | null>(null)
  const [validateResult, setValidateResult] = useState<LogicteckValidateResult | null>(null)
  const [validateHttp, setValidateHttp] = useState<{ status: number; body: unknown } | null>(null)
  const [error, setError] = useState('')
  const [copyNotice, setCopyNotice] = useState('')
  const [dossierLoading, setDossierLoading] = useState(false)
  const [dossierError, setDossierError] = useState('')
  const [lookups, setLookups] = useState<PreAdviceLookups | null>(null)
  const [preAdvice, setPreAdvice] = useState<PreAdvice | null>(null)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [documents, setDocuments] = useState<PreAdviceDocument[]>([])
  const [qrBooking, setQrBooking] = useState<QrBooking | null>(null)
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const qrImageRef = useRef<string | null>(null)

  const clearDossier = useCallback(() => {
    setPreAdvice(null)
    setSchedule(null)
    setDocuments([])
    setQrBooking(null)
    setDossierError('')
    if (qrImageRef.current) {
      URL.revokeObjectURL(qrImageRef.current)
      qrImageRef.current = null
    }
    setQrImageUrl(null)
  }, [])

  const loadDossier = useCallback(async (code: string) => {
    setDossierLoading(true)
    setDossierError('')
    setPreAdvice(null)
    setSchedule(null)
    setDocuments([])
    setQrBooking(null)
    if (qrImageRef.current) {
      URL.revokeObjectURL(qrImageRef.current)
      qrImageRef.current = null
    }
    setQrImageUrl(null)
    try {
      const bundle = await loadPreAdviceDossierByQr(code)
      if (!bundle) {
        setDossierError(LOGICTECK_API_TEST.dossierAuthRequired)
        return
      }
      setPreAdvice(bundle.preAdvice)
      setSchedule(bundle.schedule)
      setDocuments(bundle.documents)
      setQrBooking(bundle.qrBooking)
      if (bundle.qrImageUrl) {
        qrImageRef.current = bundle.qrImageUrl
        setQrImageUrl(bundle.qrImageUrl)
      }
    } finally {
      setDossierLoading(false)
    }
  }, [])

  useEffect(() => {
    preAdviceApi
      .lookups()
      .then(({ data }) => setLookups(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    return () => {
      if (qrImageRef.current) URL.revokeObjectURL(qrImageRef.current)
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem(API_BASE_STORAGE, apiBase)
  }, [apiBase])

  useEffect(() => {
    sessionStorage.setItem(API_KEY_STORAGE, apiKey)
  }, [apiKey])

  const trimmedQr = qrCode.trim()
  const lookupUrl = trimmedQr
    ? `${apiBase.replace(/\/$/, '')}${LOGICTECK_API_TEST.lookupPath}/${encodeURIComponent(trimmedQr)}`
    : ''
  const validateUrl = `${apiBase.replace(/\/$/, '')}${LOGICTECK_API_TEST.validatePath}`

  const externalStatus = lookupResult ? resolveLogicteckExternalStatus(lookupResult) : null

  const curlLookup = useMemo(() => {
    if (!trimmedQr) return ''
    const keyLine = apiKey.trim()
      ? `  -H "${LOGICTECK_API_TEST.apiKeyHeader}: ${apiKey.trim()}" \\\n`
      : ''
    return `curl -s -X GET "${lookupUrl}" \\\n${keyLine}  -H "Accept: application/json"`
  }, [apiKey, lookupUrl, trimmedQr])

  const curlValidate = useMemo(() => {
    if (!trimmedQr) return ''
    const keyLine = apiKey.trim()
      ? `  -H "${LOGICTECK_API_TEST.apiKeyHeader}: ${apiKey.trim()}" \\\n`
      : ''
    return `curl -s -X POST "${validateUrl}" \\\n  -H "Content-Type: application/json" \\\n${keyLine}  -d "{\\"qrCode\\":\\"${trimmedQr}\\"}"`
  }, [apiKey, trimmedQr, validateUrl])

  const runLookup = useCallback(async () => {
    if (!trimmedQr) {
      setError('Enter a booking QR reference (e.g. ICS-202600018).')
      return
    }
    setError('')
    setLookupLoading(true)
    setLookupResult(null)
    setLookupHttp(null)
    clearDossier()
    try {
      const res = await fetch(lookupUrl, { method: 'GET', headers: buildHeaders(apiKey) })
      const parsed = await readResponseBody(res)
      setLookupHttp(parsed)
      if (parsed.body && typeof parsed.body === 'object') {
        const result = parsed.body as LogicteckLookupResult
        setLookupResult(result)
        if (result.found) {
          await loadDossier(trimmedQr)
        }
      }
    } catch {
      setError('Lookup request failed. Check API base URL and that the API is running.')
    } finally {
      setLookupLoading(false)
    }
  }, [apiKey, clearDossier, loadDossier, lookupUrl, trimmedQr])

  useEffect(() => {
    const fromUrl = searchParams.get('qr')
    if (fromUrl) setQrCode(fromUrl)
  }, [searchParams])

  const runValidate = useCallback(async () => {
    if (!trimmedQr) {
      setError('Enter a booking QR reference before simulating gate validation.')
      return
    }
    setError('')
    setValidateLoading(true)
    setValidateResult(null)
    setValidateHttp(null)
    try {
      const res = await fetch(validateUrl, {
        method: 'POST',
        headers: { ...buildHeaders(apiKey), 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: trimmedQr }),
      })
      const parsed = await readResponseBody(res)
      setValidateHttp(parsed)
      if (parsed.body && typeof parsed.body === 'object') {
        setValidateResult(parsed.body as LogicteckValidateResult)
      }
      await runLookup()
    } catch {
      setError('Validate request failed. Check API base URL and that the API is running.')
    } finally {
      setValidateLoading(false)
    }
  }, [apiKey, runLookup, trimmedQr, validateUrl])

  const copyText = async (text: string, label: string) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopyNotice(`${label} copied`)
    window.setTimeout(() => setCopyNotice(''), 2000)
  }

  return (
    <Box sx={listPageRootSx}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${primaryDark} 0%, #004b7a 100%)`,
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <ApiOutlinedIcon sx={{ fontSize: 32, mt: 0.25 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
              {LOGICTECK_API_TEST.pageTitle}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.92, maxWidth: 720 }}>
              {LOGICTECK_API_TEST.pageSubtitle}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        {LOGICTECK_API_TEST.intro}
      </Alert>
      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} variant="outlined">
        Pre-advice status in ICS stays <strong>Approved</strong>. The fields <strong>isBooked</strong> /{' '}
        <strong>isRetrieved</strong> below reflect the booking on the LOGICTECK side only.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {copyNotice && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {copyNotice}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Test inputs
        </Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <TextField
            label="Booking QR reference"
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            placeholder="ICS-202600018"
            fullWidth
            sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontWeight: 700 } }}
          />
          <TextField
            label="ICS public API base URL"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder={LOGICTECK_API_TEST.defaultPublicApiBase}
            fullWidth
            helperText="Use http://localhost:5275 for curl/Postman outside the browser"
          />
          <TextField
            label={`${LOGICTECK_API_TEST.apiKeyHeader} (optional)`}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            fullWidth
            type="password"
            helperText="Required only when Logicteck:ApiKey is set on the API server"
            sx={{ gridColumn: { md: '1 / -1' } }}
          />
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
          <Button
            variant="contained"
            startIcon={lookupLoading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
            onClick={() => void runLookup()}
            disabled={lookupLoading || validateLoading}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Lookup booking
          </Button>
          <Button
            variant="outlined"
            startIcon={validateLoading ? <CircularProgress size={18} /> : <PlayArrowIcon />}
            onClick={() => void runValidate()}
            disabled={lookupLoading || validateLoading}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Simulate gate validate
          </Button>
        </Box>
      </Paper>

      {lookupResult && (
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Lookup result
            </Typography>
            {externalStatus && (
              <Chip label={externalStatus} color={statusChipColor(externalStatus)} size="small" sx={{ fontWeight: 700 }} />
            )}
            {lookupHttp && (
              <Chip label={`HTTP ${lookupHttp.status}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {LOGICTECK_API_TEST.lookupHint}
          </Typography>
          {lookupResult.found ? (
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mb: 2 }}>
              <Typography variant="body2">
                <strong>Container:</strong> {lookupResult.containerNo ?? '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Pre-advice:</strong> {lookupResult.preAdviceReference ?? '—'}
              </Typography>
              <Typography variant="body2">
                <strong>isBooked:</strong> {String(lookupResult.isBooked)}
              </Typography>
              <Typography variant="body2">
                <strong>isRetrieved:</strong> {String(lookupResult.isRetrieved)}
              </Typography>
            </Box>
          ) : (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              {lookupResult.message ?? 'Booking not found.'}
            </Alert>
          )}
          <Typography
            component="pre"
            sx={{
              m: 0,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'grey.50',
              fontSize: '0.8rem',
              overflow: 'auto',
            }}
          >
            {JSON.stringify(lookupHttp?.body ?? lookupResult, null, 2)}
          </Typography>
        </Paper>
      )}

      {validateResult && (
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Validate result
            </Typography>
            <Chip
              label={validateResult.valid ? 'Valid' : 'Invalid'}
              color={validateResult.valid ? 'success' : 'error'}
              size="small"
              sx={{ fontWeight: 700 }}
            />
            {validateHttp && (
              <Chip label={`HTTP ${validateHttp.status}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {LOGICTECK_API_TEST.validateHint}
          </Typography>
          <Typography
            component="pre"
            sx={{
              m: 0,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'grey.50',
              fontSize: '0.8rem',
              overflow: 'auto',
            }}
          >
            {JSON.stringify(validateHttp?.body ?? validateResult, null, 2)}
          </Typography>
        </Paper>
      )}

      {(lookupResult?.found || dossierLoading || preAdvice) && (
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              mb: 1.5,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {LOGICTECK_API_TEST.fullDossierTitle}
            </Typography>
            {preAdvice && (
              <Button
                component={RouterLink}
                to={`/preadvice/${preAdvice.id}?tab=overview`}
                variant="outlined"
                size="small"
                sx={{ fontWeight: 600, borderRadius: 2 }}
              >
                Open in pre-advice
              </Button>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {LOGICTECK_API_TEST.dossierHint}
          </Typography>
          {dossierLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 4, justifyContent: 'center' }}>
              <CircularProgress size={28} sx={{ color: primaryDark }} />
              <Typography variant="body2" color="text.secondary">
                Loading pre-advice details and photos…
              </Typography>
            </Box>
          ) : dossierError ? (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              {dossierError}
            </Alert>
          ) : preAdvice ? (
            <PreAdviceFullDossier
              item={preAdvice}
              documents={documents}
              lookups={lookups}
              schedule={schedule}
              qrBooking={qrBooking}
              qrImageUrl={qrImageUrl}
              compact
            />
          ) : null}
        </Paper>
      )}

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Run outside ICS (curl)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Copy these commands into Postman, curl, or LOGICTECK staging to verify the API without opening
          pre-advice screens.
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          GET lookup
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 2 }}>
          <Typography
            component="pre"
            sx={{
              flex: 1,
              m: 0,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'grey.50',
              fontSize: '0.75rem',
              overflow: 'auto',
            }}
          >
            {curlLookup || 'Enter a QR reference above.'}
          </Typography>
          <Button
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={() => void copyText(curlLookup, 'Lookup curl')}
            disabled={!curlLookup}
          >
            Copy
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          POST validate (gate scan)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <Typography
            component="pre"
            sx={{
              flex: 1,
              m: 0,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'grey.50',
              fontSize: '0.75rem',
              overflow: 'auto',
            }}
          >
            {curlValidate || 'Enter a QR reference above.'}
          </Typography>
          <Button
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={() => void copyText(curlValidate, 'Validate curl')}
            disabled={!curlValidate}
          >
            Copy
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
