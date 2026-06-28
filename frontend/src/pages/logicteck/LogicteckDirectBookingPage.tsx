import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'
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
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import LogicteckFormShell, { LogicteckReadOnlyField, logicteckFieldSx } from '../../components/logicteck/LogicteckFormShell'
import PreAdviceFullDossier from '../../components/preAdvice/PreAdviceFullDossier'
import { listPageRootSx } from '../../components/layout/ListPagePrimitives'
import { LOGICTECK_DIRECT_BOOKING, LOGICTECK_FORM_BORDER } from '../../config/logicteckDirectBooking'
import { LOGICTECK_QR, qrLookupStatusColor, qrLookupStatusLabel } from '../../config/logicteckQr'
import {
  preAdviceApi,
  qrApi,
  scheduleApi,
  type BookLogicteckResponse,
  type PreAdvice,
  type PreAdviceDocument,
  type QrBooking,
  type Schedule,
} from '../../services/api'
import { store } from '../../store'
import { useAppSelector } from '../../store/hooks'
import { applyBookLogicteckResult, bookLogicteckBooking, canBookLogicteck } from '../../utils/logicteckBooking'
import { formatScheduleSlot } from '../../utils/datetime'

async function loadQrImage(bookingId: number): Promise<string> {
  const token = store.getState().auth.accessToken
  const res = await fetch(qrApi.downloadUrl(bookingId), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Failed to load QR image.')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export default function LogicteckDirectBookingPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAppSelector((s) => s.auth.user)

  const [searchQr, setSearchQr] = useState(searchParams.get('qr') ?? '')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [booking, setBooking] = useState<QrBooking | null>(null)
  const [preAdvice, setPreAdvice] = useState<PreAdvice | null>(null)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [documents, setDocuments] = useState<PreAdviceDocument[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [bookResult, setBookResult] = useState<BookLogicteckResponse | null>(null)

  const loadBooking = useCallback(async (opts: { bookingId?: number; scheduleId?: number; qr?: string }) => {
    setLoading(true)
    setError('')
    setBookResult(null)
    setPreAdvice(null)
    setSchedule(null)
    setDocuments([])
    setQrImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })

    try {
      let qrRes
      if (opts.bookingId) {
        qrRes = await qrApi.get(opts.bookingId)
      } else if (opts.scheduleId) {
        qrRes = await qrApi.getBySchedule(opts.scheduleId)
      } else if (opts.qr?.trim()) {
        qrRes = await qrApi.getByCode(opts.qr.trim())
      } else {
        setBooking(null)
        return
      }

      const qr = qrRes.data
      setBooking(qr)

      const scheduleRes = await scheduleApi.get(qr.scheduleId).catch(() => null)
      if (scheduleRes?.data) setSchedule(scheduleRes.data)

      const preAdvicePromise = scheduleRes?.data?.preAdviceId
        ? preAdviceApi.get(scheduleRes.data.preAdviceId).catch(() => null)
        : Promise.resolve(null)
      const imagePromise = loadQrImage(qr.id).catch(() => null)

      const [preAdviceRes, imageUrl] = await Promise.all([preAdvicePromise, imagePromise])
      if (preAdviceRes?.data) {
        setPreAdvice(preAdviceRes.data)
        setDocumentsLoading(true)
        preAdviceApi
          .documents(preAdviceRes.data.id)
          .then(({ data }) => setDocuments(data))
          .catch(() => setDocuments([]))
          .finally(() => setDocumentsLoading(false))
      }
      if (imageUrl) setQrImageUrl(imageUrl)
    } catch {
      setBooking(null)
      setError('Booking QR not found or you do not have access.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const bookingId = Number(searchParams.get('bookingId'))
    const scheduleId = Number(searchParams.get('scheduleId'))
    const qr = searchParams.get('qr') ?? ''

    if (bookingId && !Number.isNaN(bookingId)) {
      void loadBooking({ bookingId })
    } else if (scheduleId && !Number.isNaN(scheduleId)) {
      void loadBooking({ scheduleId })
    } else if (qr.trim()) {
      setSearchQr(qr)
      void loadBooking({ qr })
    }
  }, [searchParams, loadBooking])

  useEffect(() => {
    return () => {
      if (qrImageUrl) URL.revokeObjectURL(qrImageUrl)
    }
  }, [qrImageUrl])

  const handleSearch = () => {
    const trimmed = searchQr.trim()
    if (!trimmed) {
      setError('Enter your ICS QR reference.')
      return
    }
    setSearchParams({ qr: trimmed })
  }

  const handleSubmit = async () => {
    if (!booking || !canBookLogicteck(booking)) return
    setSubmitting(true)
    setError('')
    try {
      const result = await bookLogicteckBooking(booking.id)
      setBookResult(result)
      if (result.booking) {
        setBooking(applyBookLogicteckResult(booking, result) ?? booking)
      }
    } catch {
      setError('Could not transmit booking to LOGICTECK. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const logicteckStatus = booking ? qrLookupStatusLabel(booking) : null
  const canSubmit = booking && canBookLogicteck(booking)

  return (
    <Box sx={listPageRootSx}>
      <LogicteckFormShell
        title={LOGICTECK_DIRECT_BOOKING.pageTitle}
        subtitle={LOGICTECK_DIRECT_BOOKING.pageSubtitle}
        driverName={user?.fullName ?? ''}
        username={user?.username}
      >
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          {LOGICTECK_QR.integrationModel}
        </Alert>
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          {LOGICTECK_DIRECT_BOOKING.icsSourceNote}
        </Alert>

        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 3, borderRadius: 2, borderStyle: 'dashed', borderColor: LOGICTECK_FORM_BORDER }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Load ICS transfer QR
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <TextField
              size="small"
              placeholder={LOGICTECK_DIRECT_BOOKING.searchPlaceholder}
              value={searchQr}
              onChange={(e) => setSearchQr(e.target.value.toUpperCase())}
              sx={{
                ...logicteckFieldSx,
                flex: 1,
                minWidth: 220,
                '& .MuiInputBase-input': { fontFamily: 'monospace', fontWeight: 700 },
              }}
            />
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
              sx={{ fontWeight: 700, borderRadius: 2, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
            >
              {LOGICTECK_DIRECT_BOOKING.loadBooking}
            </Button>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {bookResult?.success && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
            {bookResult.message || LOGICTECK_DIRECT_BOOKING.bookSuccess}
            {bookResult.externalReference && (
              <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                LOGICTECK reference: {bookResult.externalReference}
              </Typography>
            )}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : booking ? (
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
              <Chip label={LOGICTECK_DIRECT_BOOKING.fromIcs} size="small" color="success" sx={{ fontWeight: 700 }} />
              {logicteckStatus && (
                <Chip
                  label={`LOGICTECK · ${logicteckStatus}`}
                  size="small"
                  color={qrLookupStatusColor(logicteckStatus)}
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Box>

            {booking.isUsed && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                {LOGICTECK_DIRECT_BOOKING.retrieved}
              </Alert>
            )}

            {!canSubmit && booking.logicteckBookedAt && !booking.isUsed && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                {LOGICTECK_DIRECT_BOOKING.alreadyBooked}
              </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <LogicteckReadOnlyField
                label={LOGICTECK_DIRECT_BOOKING.icsBookingReference}
                value={booking.qrCode}
                mono
              />
              <LogicteckReadOnlyField
                label={LOGICTECK_DIRECT_BOOKING.preAdviceReference}
                value={preAdvice?.referenceNo ?? '—'}
                mono
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <LogicteckReadOnlyField
                label={LOGICTECK_DIRECT_BOOKING.shippingLine}
                value={booking.payload.shippingLine}
              />
              <LogicteckReadOnlyField
                label={LOGICTECK_DIRECT_BOOKING.driverName}
                value={booking.payload.trucker}
              />
            </Box>

            <LogicteckReadOnlyField
              label={LOGICTECK_DIRECT_BOOKING.containerNumber}
              value={booking.payload.containerNo}
              mono
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <LogicteckReadOnlyField
                label={LOGICTECK_DIRECT_BOOKING.containerSize}
                value={preAdvice?.containerSize ?? '—'}
              />
              <LogicteckReadOnlyField
                label={LOGICTECK_DIRECT_BOOKING.containerType}
                value={preAdvice?.containerType ?? '—'}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <LogicteckReadOnlyField
                label={LOGICTECK_DIRECT_BOOKING.returnDate}
                value={booking.payload.scheduleDate}
              />
              <LogicteckReadOnlyField
                label={LOGICTECK_DIRECT_BOOKING.returnTime}
                value={booking.payload.scheduleTime}
              />
            </Box>

            <LogicteckReadOnlyField label={LOGICTECK_DIRECT_BOOKING.depot} value={booking.payload.depot} />

            {qrImageUrl && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  borderColor: LOGICTECK_FORM_BORDER,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  alignItems: 'center',
                }}
              >
                <Box
                  component="img"
                  src={qrImageUrl}
                  alt={`QR ${booking.qrCode}`}
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: '#fff',
                    p: 0.5,
                  }}
                />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <QrCode2OutlinedIcon fontSize="small" />
                    {LOGICTECK_QR.sectionTitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Return slot: {formatScheduleSlot(booking.payload.scheduleDate, booking.payload.scheduleTime)}
                  </Typography>
                </Box>
              </Paper>
            )}

            {preAdvice && (
              <Box sx={{ mt: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {LOGICTECK_DIRECT_BOOKING.fullDossierTitle}
                  </Typography>
                  <Button
                    component={RouterLink}
                    to={`/preadvice/${preAdvice.id}?tab=overview`}
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 600, borderRadius: 2 }}
                  >
                    {LOGICTECK_DIRECT_BOOKING.viewInIcs}
                  </Button>
                </Box>
                <PreAdviceFullDossier
                  item={preAdvice}
                  documents={documents}
                  documentsLoading={documentsLoading}
                  schedule={schedule}
                  qrBooking={booking}
                  qrImageUrl={qrImageUrl}
                  compact
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'flex-end', pt: 1 }}>
              <Button variant="text" onClick={() => navigate(-1)} disabled={submitting}>
                {LOGICTECK_DIRECT_BOOKING.cancel}
              </Button>
              <Button
                variant="contained"
                disabled={!canSubmit || submitting}
                onClick={() => void handleSubmit()}
                sx={{ fontWeight: 700, borderRadius: 2, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
              >
                {submitting ? 'Submitting…' : LOGICTECK_DIRECT_BOOKING.submitValidation}
              </Button>
            </Box>
          </Box>
        ) : (
          !error && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              Enter an ICS QR reference above or open this page from your return / pre-advice transfer QR.
            </Typography>
          )
        )}
      </LogicteckFormShell>
    </Box>
  )
}
