import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import BookingQrScanner from '../../components/depot/BookingQrScanner'
import PreAdviceFullDossier from '../../components/preAdvice/PreAdviceFullDossier'
import {
  DetailHero,
  ICS_PRIMARY,
  hexToRgba,
  sectionPaperSx,
} from '../../components/layout/DetailPagePrimitives'
import { listPageRootSx } from '../../components/layout/ListPagePrimitives'
import { DEPOT_GATE, depotGateIssueColor } from '../../config/depotGate'
import {
  depotGateApi,
  preAdviceApi,
  type DepotGateCheckInResult,
  type DepotGateScanResult,
  type PreAdviceLookups,
} from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatDateTime } from '../../utils/datetime'
import { loadPreAdviceDossierByQr, type PreAdviceDossierBundle } from '../../utils/preAdviceDossierLoader'
import { normalizeBookingQrReference } from '../../utils/bookingQr'

const primaryDark = ICS_PRIMARY

export default function GateScanPage() {
  const user = useAppSelector((s) => s.auth.user)
  const allowed = user?.role === 'DepotPersonnel' || user?.role === 'Administrator'
  const [manualCode, setManualCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [checkInBusy, setCheckInBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [scan, setScan] = useState<DepotGateScanResult | null>(null)
  const [dossier, setDossier] = useState<PreAdviceDossierBundle | null>(null)
  const [lookups, setLookups] = useState<PreAdviceLookups | null>(null)

  useEffect(() => {
    preAdviceApi
      .lookups()
      .then((res) => setLookups(res.data))
      .catch(() => setLookups(null))
  }, [])

  const runScan = useCallback(async (rawCode: string) => {
    const qrCode = normalizeBookingQrReference(rawCode)
    if (!qrCode) {
      setError('Enter a valid ICS booking QR reference.')
      setScan(null)
      setDossier(null)
      return
    }

    setBusy(true)
    setError('')
    setSuccess('')
    setScan(null)
    setDossier(null)
    setManualCode(qrCode)

    try {
      const { data: scanResult } = await depotGateApi.scan(qrCode)
      setScan(scanResult)

      if (!scanResult.found) {
        setError(scanResult.message || DEPOT_GATE.notFound)
        return
      }

      const bundle = await loadPreAdviceDossierByQr(qrCode)
      if (!bundle) {
        setError('Booking found but pre-forecast dossier could not be loaded.')
        return
      }
      setDossier(bundle)
    } catch {
      setError('Unable to validate the QR code. Please try again.')
    } finally {
      setBusy(false)
    }
  }, [])

  const handleCheckIn = async () => {
    if (!scan?.qrCode || !scan.canCheckIn) return
    setCheckInBusy(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await depotGateApi.checkIn(scan.qrCode)
      if (!data.success) {
        setError(data.message)
        if (data.scan) setScan(data.scan)
        return
      }
      setSuccess(data.message || DEPOT_GATE.acceptSuccess)
      if (data.scan) setScan(data.scan)
      const bundle = await loadPreAdviceDossierByQr(scan.qrCode)
      if (bundle) setDossier(bundle)
    } catch (err: unknown) {
      const axiosData =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: DepotGateCheckInResult } }).response?.data
          : undefined
      if (axiosData?.scan) setScan(axiosData.scan)
      setError(axiosData?.message || 'Check-in failed. Please try again.')
    } finally {
      setCheckInBusy(false)
    }
  }

  if (!allowed) return <Navigate to="/" replace />

  return (
    <Box sx={listPageRootSx}>
      <DetailHero
        title={DEPOT_GATE.heroTitle}
        subtitle={DEPOT_GATE.heroDescription}
        icon={<QrCodeScannerIcon sx={{ fontSize: 28 }} />}
      />

      <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 3 }}>
        <BookingQrScanner disabled={busy || checkInBusy} onScan={(code) => void runScan(code)} />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
          <TextField
            label={DEPOT_GATE.manualLabel}
            placeholder={DEPOT_GATE.manualPlaceholder}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            disabled={busy || checkInBusy}
            fullWidth
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <Button
            variant="contained"
            onClick={() => void runScan(manualCode)}
            disabled={busy || checkInBusy || !manualCode.trim()}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <QrCodeScannerIcon />}
            sx={{ fontWeight: 700, borderRadius: 2, minWidth: { sm: 160 }, flexShrink: 0 }}
          >
            {DEPOT_GATE.scanButton}
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {success}
        </Alert>
      )}

      {scan?.found && (
        <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 3 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: primaryDark }}>
              Gate validation
            </Typography>
            {scan.alreadyCheckedIn && (
              <Chip
                icon={<CheckCircleOutlinedIcon />}
                label="Checked in"
                color="success"
                size="small"
                sx={{ fontWeight: 700 }}
              />
            )}
            {scan.canCheckIn && (
              <Chip label="Ready to accept" color="success" variant="outlined" size="small" sx={{ fontWeight: 700 }} />
            )}
            {!scan.canCheckIn && !scan.alreadyCheckedIn && (
              <Chip label="Invalid" color="error" size="small" sx={{ fontWeight: 700 }} />
            )}
          </Stack>

          {scan.message && (
            <Alert
              severity={scan.canCheckIn || scan.alreadyCheckedIn ? 'success' : 'error'}
              sx={{ mb: 2, borderRadius: 2 }}
            >
              {scan.message}
            </Alert>
          )}

          {scan.issues.map((issue) => (
            <Alert
              key={`${issue.code}-${issue.message}`}
              severity={depotGateIssueColor(issue.severity)}
              sx={{ mb: 1, borderRadius: 2 }}
            >
              {issue.message}
            </Alert>
          ))}

          {scan.gateCheckedInAt && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Checked in {formatDateTime(scan.gateCheckedInAt)}
              {scan.gateCheckedInByName ? ` by ${scan.gateCheckedInByName}` : ''}.
            </Typography>
          )}

          {scan.canCheckIn && (
            <Button
              variant="contained"
              color="success"
              size="large"
              startIcon={checkInBusy ? <CircularProgress size={18} color="inherit" /> : <CheckCircleOutlinedIcon />}
              onClick={() => void handleCheckIn()}
              disabled={checkInBusy}
              sx={{ mt: 2, fontWeight: 800, borderRadius: 2 }}
            >
              {DEPOT_GATE.acceptButton}
            </Button>
          )}
        </Paper>
      )}

      {dossier && (
        <Paper
          elevation={0}
          sx={{
            ...sectionPaperSx,
            borderColor: hexToRgba(primaryDark, 0.12),
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800, color: primaryDark, mb: 2 }}>
            Pre-forecast dossier
          </Typography>
          <PreAdviceFullDossier
            item={dossier.preAdvice}
            documents={dossier.documents}
            lookups={lookups}
            schedule={dossier.schedule}
            qrBooking={dossier.qrBooking}
            qrImageUrl={dossier.qrImageUrl}
          />
        </Paper>
      )}
    </Box>
  )
}
