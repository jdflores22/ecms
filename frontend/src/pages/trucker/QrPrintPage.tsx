import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PrintIcon from '@mui/icons-material/Print'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { LOGICTECK_QR } from '../../config/logicteckQr'
import IcsLogo from '../../components/brand/IcsLogo'
import { qrApi, type QrBooking } from '../../services/api'
import { store } from '../../store'
import { formatDateTime, formatScheduleSlot } from '../../utils/datetime'

const primaryDark = '#0B3D91'

async function loadQrImage(bookingId: number): Promise<string> {
  const token = store.getState().auth.accessToken
  const res = await fetch(qrApi.downloadUrl(bookingId), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Failed to load QR image.')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export default function QrPrintPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<QrBooking | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = Number(bookingId)
    if (!id) {
      setError('Invalid booking.')
      setLoading(false)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null

    setLoading(true)
    setError('')
    setBooking(null)
    setImageUrl(null)

    Promise.all([qrApi.get(id), loadQrImage(id)])
      .then(([bookingRes, url]) => {
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        objectUrl = url
        setBooking(bookingRes.data)
        setImageUrl(url)
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load QR pass for printing.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [bookingId])

  useEffect(() => {
    if (booking && imageUrl && searchParams.get('auto') === '1') {
      const timer = window.setTimeout(() => window.print(), 400)
      return () => window.clearTimeout(timer)
    }
  }, [booking, imageUrl, searchParams])

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100dvh',
          bgcolor: '#f4f7fb',
        }}
      >
        <CircularProgress sx={{ color: primaryDark }} />
      </Box>
    )
  }

  if (error || !booking || !imageUrl) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          bgcolor: '#f4f7fb',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            maxWidth: 400,
          }}
        >
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error || 'QR pass not found.'}
          </Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/trucker/qr')}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Back to QR codes
          </Button>
        </Paper>
      </Box>
    )
  }

  const { payload } = booking

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: '#f4f7fb',
        py: 3,
        px: 2,
        '@media print': {
          bgcolor: '#fff',
          py: 0,
          px: 0,
        },
      }}
    >
      <Box
        className="no-print"
        sx={{ maxWidth: 480, mx: 'auto', mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/trucker/qr')}
          sx={{ fontWeight: 600, borderRadius: 2 }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
          sx={{ fontWeight: 700, borderRadius: 2 }}
        >
          Print
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          mx: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          p: 3,
          boxShadow: '0 8px 24px rgba(11, 61, 145, 0.1)',
          '@media print': {
            border: 'none',
            borderRadius: 0,
            maxWidth: '100%',
            p: 2,
            boxShadow: 'none',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <IcsLogo height={40} maxWidth={140} />
        </Box>
        <Typography
          variant="h5"
          align="center"
          sx={{ fontWeight: 800, letterSpacing: 1, mb: 0.5, color: primaryDark }}
        >
          {LOGICTECK_QR.printTitle}
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 2 }}>
          {LOGICTECK_QR.printSubtitle}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box
            component="img"
            src={imageUrl}
            alt="Return QR code"
            sx={{ width: 220, height: 220, objectFit: 'contain' }}
          />
        </Box>

        <Typography variant="subtitle1" align="center" sx={{ fontWeight: 700, mb: 2, color: primaryDark }}>
          {booking.qrCode}
        </Typography>

        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
          <DetailRow label="Container" value={payload.containerNo} />
          <DetailRow label="Shipping line" value={payload.shippingLine} />
          <DetailRow label="Depot" value={payload.depot} />
          <DetailRow
            label="Schedule"
            value={formatScheduleSlot(payload.scheduleDate, payload.scheduleTime)}
          />
          <DetailRow label="Trucker" value={payload.trucker} />
          <DetailRow label="Generated" value={formatDateTime(booking.generatedAt)} />
          {booking.isUsed && (
            <Typography variant="body2" color="error" sx={{ mt: 1, fontWeight: 600 }}>
              LOOKED UP — details already retrieved by LOGICTECK
            </Typography>
          )}
        </Box>

        <Typography
          variant="caption"
          align="center"
          sx={{ mt: 3, color: 'text.secondary', display: 'block' }}
        >
          {LOGICTECK_QR.printFooter}
        </Typography>
      </Paper>
    </Box>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  )
}
