import { ListLoadingState } from '../../components/layout/ListPagePrimitives'
import { QrImageSkeleton } from '../../components/layout/SkeletonPrimitives'
import {
  Alert,

  Box,

  Button,

  Chip,

  Paper,

  Typography,

} from '@mui/material'

import DownloadIcon from '@mui/icons-material/Download'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'

import OpenInNewIcon from '@mui/icons-material/OpenInNew'

import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'

import PrintIcon from '@mui/icons-material/Print'

import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'

import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { Link as RouterLink, useNavigate } from 'react-router-dom'

import {

  hexToRgba,

  sectionPaperSx,

} from '../../components/layout/DetailPagePrimitives'

import {

  listHeroPrimaryActionSx,

  listPageRootSx,

  LIST_PRIMARY,

  PageHero,

} from '../../components/layout/ListPagePrimitives'

import { LOGICTECK_QR, qrLookupStatusColor, qrLookupStatusLabel } from '../../config/logicteckQr'

import BookingQrPreviewDialog from '../../components/qr/BookingQrPreviewDialog'
import PreAdviceBackToBackChip from '../../components/preAdvice/PreAdviceBackToBackChip'

import { preAdviceApi, qrApi, type PreAdvice, type QrBooking, type Schedule } from '../../services/api'
import { qrPassContainerHeadline, qrPassPreForecastReference } from '../../utils/qrPassDisplay'
import { fetchCachedScheduleList } from '../../utils/truckerListCache'

import { store } from '../../store'

import { formatScheduleSlot } from '../../utils/datetime'
import { downloadBookingConfirmationPdf } from '../../utils/downloadBookingConfirmationPdf'
import { canOpenLogicteckConfirm, openLogicteckNewReturn } from '../../utils/logicteckBooking'



const primaryDark = LIST_PRIMARY



async function loadQrImage(bookingId: number): Promise<string> {

  const token = store.getState().auth.accessToken

  const res = await fetch(qrApi.downloadUrl(bookingId), {

    headers: token ? { Authorization: `Bearer ${token}` } : {},

  })

  if (!res.ok) throw new Error('Failed to load QR image.')

  const blob = await res.blob()

  return URL.createObjectURL(blob)

}



function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {

  return (

    <Paper

      elevation={0}

      sx={{

        p: 2,

        borderRadius: 3,

        border: '1px solid',

        borderColor: 'divider',

        bgcolor: '#fff',

        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',

      }}

    >

      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>

        {label}

      </Typography>

      <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 0.5 }}>

        {value}

      </Typography>

    </Paper>

  )

}



type QrPreview = {

  schedule: Schedule

  qr: QrBooking

}



const qrCardActionsSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  mt: 1.5,
}

const qrCardButtonSx = {
  fontWeight: 600,
  borderRadius: 2,
  textTransform: 'none',
  py: 0.875,
}

export default function TruckerQrPage() {

  const navigate = useNavigate()

  const [schedules, setSchedules] = useState<Schedule[]>([])

  const [preAdviceById, setPreAdviceById] = useState<Record<number, PreAdvice>>({})

  const [qrMap, setQrMap] = useState<Record<number, QrBooking>>({})

  const [qrImages, setQrImages] = useState<Record<number, string>>({})

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  const [preview, setPreview] = useState<QrPreview | null>(null)

  const [notice, setNotice] = useState('')

  const [bookLogicteckLoading, setBookLogicteckLoading] = useState(false)



  const load = useCallback(async () => {

    setLoading(true)

    setError('')

    setQrImages((prev) => {

      Object.values(prev).forEach((url) => URL.revokeObjectURL(url))

      return {}

    })



    try {

      const [data, preAdviceRes] = await Promise.all([
        fetchCachedScheduleList(),
        preAdviceApi.list(),
      ])

      const confirmed = data.filter((s) => s.status === 'Confirmed' || s.status === 'Completed')

      setSchedules(confirmed)
      setPreAdviceById(Object.fromEntries(preAdviceRes.data.map((p) => [p.id, p])))



      const entries = await Promise.all(

        confirmed.map(async (s) => {

          try {

            const res = await qrApi.getBySchedule(s.id)

            return [s.id, res.data] as const

          } catch {

            return null

          }

        }),

      )



      const map: Record<number, QrBooking> = {}

      entries.forEach((e) => {

        if (e) map[e[0]] = e[1]

      })

      setQrMap(map)



      const imageEntries = await Promise.all(

        Object.values(map).map(async (qr) => {

          try {

            const url = await loadQrImage(qr.id)

            return [qr.id, url] as const

          } catch {

            return null

          }

        }),

      )



      const images: Record<number, string> = {}

      imageEntries.forEach((e) => {

        if (e) images[e[0]] = e[1]

      })

      setQrImages(images)

    } catch {

      setError('Failed to load QR codes.')

    } finally {

      setLoading(false)

    }

  }, [])



  useEffect(() => {

    load()

  }, [load])



  useEffect(() => {

    return () => {

      Object.values(qrImages).forEach((url) => URL.revokeObjectURL(url))

    }

  }, [qrImages])



  const summary = useMemo(() => {

    const withQr = schedules.filter((s) => qrMap[s.id]).length

    return { total: schedules.length, withQr, pending: schedules.length - withQr }

  }, [schedules, qrMap])



  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => {
      const qrA = qrMap[a.id]
      const qrB = qrMap[b.id]
      const keyA = qrA?.generatedAt ?? `${a.date}T${a.time || '00:00:00'}`
      const keyB = qrB?.generatedAt ?? `${b.date}T${b.time || '00:00:00'}`
      const byDate = keyB.localeCompare(keyA)
      if (byDate !== 0) return byDate
      return b.id - a.id
    })
  }, [schedules, qrMap])



  const downloadQr = async (booking: QrBooking) => {

    const token = store.getState().auth.accessToken

    const res = await fetch(qrApi.downloadUrl(booking.id), {

      headers: token ? { Authorization: `Bearer ${token}` } : {},

    })

    const blob = await res.blob()

    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')

    a.href = url

    a.download = `qr-${booking.qrCode}.png`

    a.click()

    URL.revokeObjectURL(url)

  }

  const downloadConfirmationPdf = async (booking: QrBooking) => {
    try {
      await downloadBookingConfirmationPdf(booking.id, booking.qrCode)
      setNotice('')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to download confirmation PDF.')
    }
  }



  const openPreview = (schedule: Schedule, qr: QrBooking) => {

    setPreview({ schedule, qr })

    setNotice('')

  }



  const handleOpenLogicteckConfirm = async () => {
    if (!preview || !canOpenLogicteckConfirm(preview.qr, preview.schedule)) return
    setBookLogicteckLoading(true)
    setNotice('')
    try {
      await openLogicteckNewReturn(preview.qr.qrCode)
      setNotice(LOGICTECK_QR.afterOpenHint)
    } catch {
      setNotice('Could not open LOGICTECK.')
    } finally {
      setBookLogicteckLoading(false)
    }
  }



  const previewImageUrl = preview ? qrImages[preview.qr.id] : null



  return (

    <Box sx={listPageRootSx}>

      <PageHero
        icon={<QrCode2OutlinedIcon />}
        title={LOGICTECK_QR.pageTitle}
        subtitle={LOGICTECK_QR.heroDescription}
        actions={
          <Button
            component={RouterLink}
            to="/trucker/payments"
            variant="contained"
            startIcon={<PaymentsOutlinedIcon />}
            sx={listHeroPrimaryActionSx}
          >
            Payments
          </Button>
        }
      />



      {error && (

        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>

          {error}

        </Alert>

      )}

      {notice && (

        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setNotice('')}>

          {notice}

        </Alert>

      )}



      <Box

        sx={{

          display: 'grid',

          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },

          gap: 2,

          mb: 3,

        }}

      >

        <SummaryCard label="Confirmed returns" value={summary.total} color={primaryDark} />

        <SummaryCard label="Booking QR ready" value={summary.withQr} color="#2E7D32" />

        <SummaryCard label="Awaiting QR" value={summary.pending} color="#ED6C02" />

      </Box>



      {loading ? (

        <ListLoadingState />

      ) : schedules.length === 0 ? (

        <Alert severity="info" sx={{ borderRadius: 2 }}>

          No confirmed returns yet. Complete payment and wait for depot verification to publish the pre-forecast QR.

        </Alert>

      ) : (

        <Box

          sx={{

            display: 'grid',

            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },

            gap: 2,

          }}

        >

          {sortedSchedules.map((schedule) => {

            const qr = qrMap[schedule.id]

            const imageUrl = qr ? qrImages[qr.id] : null

            const preAdvice = preAdviceById[schedule.preAdviceId]

            const containerHeadline = qrPassContainerHeadline(preAdvice, qr, schedule.referenceNo)

            const preForecastRef = qrPassPreForecastReference(preAdvice, qr)



            return (

              <Paper key={schedule.id} elevation={0} sx={sectionPaperSx}>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 2 }}>

                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0 }}>

                    <QrCode2OutlinedIcon sx={{ color: primaryDark, mt: 0.25, flexShrink: 0 }} />

                    <Box sx={{ minWidth: 0 }}>

                      <Typography

                        variant="h6"

                        sx={{

                          fontWeight: 800,

                          color: primaryDark,

                          fontFamily: qr ? 'monospace' : 'inherit',

                          wordBreak: 'break-all',

                          lineHeight: 1.25,

                        }}

                      >

                        {containerHeadline}

                      </Typography>

                      {qr ? (

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>

                          Confirmed pre-forecast {preForecastRef} · one QR for{' '}
                          {preAdvice?.isBackToBack ? 'both containers' : 'this return'}

                        </Typography>

                      ) : null}

                      {preAdvice ? (
                        <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          <PreAdviceBackToBackChip item={preAdvice} />
                        </Box>
                      ) : null}

                    </Box>

                  </Box>

                  <Chip label={schedule.status} size="small" color="success" sx={{ fontWeight: 600, flexShrink: 0 }} />

                </Box>



                {qr ? (

                  <Box

                    sx={{

                      display: 'grid',

                      gridTemplateColumns: '1fr',

                      gap: 2,

                      alignItems: 'start',

                    }}

                  >

                    {imageUrl ? (

                      <Box

                        component="button"

                        type="button"

                        onClick={() => openPreview(schedule, qr)}

                        sx={{

                          p: 0,

                          border: '1px solid',

                          borderColor: 'divider',

                          borderRadius: 2,

                          bgcolor: '#fff',

                          cursor: 'pointer',

                          width: '100%',

                          maxWidth: 160,

                          mx: 'auto',

                          display: 'block',

                          transition: 'box-shadow 0.15s ease',

                          '&:hover': { boxShadow: '0 4px 16px rgba(11, 61, 145, 0.15)' },

                        }}

                      >

                        <Box

                          component="img"

                          src={imageUrl}

                          alt={`QR code ${qr.qrCode}`}

                          sx={{ width: '100%', height: 'auto', display: 'block', p: 1 }}

                        />

                      </Box>

                    ) : (

                      <QrImageSkeleton size={160} inline />

                    )}



                    <Box sx={{ minWidth: 0 }}>

                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>

                        {LOGICTECK_QR.bookingIdLabel}: {qr.qrCode}

                      </Typography>

                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>

                        {qr.payload.depot} · {formatScheduleSlot(qr.payload.scheduleDate, qr.payload.scheduleTime)}

                      </Typography>

                      <Box sx={{ mt: 1 }}>

                        <Chip

                          label={qrLookupStatusLabel(qr)}

                          size="small"

                          color={qrLookupStatusColor(qrLookupStatusLabel(qr))}

                          sx={{ fontWeight: 600 }}

                        />

                      </Box>



                      <Box sx={qrCardActionsSx}>
                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<VisibilityOutlinedIcon />}
                          onClick={() => openPreview(schedule, qr)}
                          disabled={!imageUrl}
                          sx={{ ...qrCardButtonSx, fontWeight: 700 }}
                        >
                          View QR
                        </Button>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 1,
                          }}
                        >
                          <Button
                            variant="outlined"
                            fullWidth
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={() => downloadQr(qr)}
                            sx={qrCardButtonSx}
                          >
                            Download QR
                          </Button>
                          <Button
                            variant="outlined"
                            fullWidth
                            size="small"
                            startIcon={<PrintIcon />}
                            onClick={() => navigate(`/trucker/qr/print/${qr.id}?auto=1`)}
                            sx={qrCardButtonSx}
                          >
                            Print
                          </Button>
                        </Box>
                        <Button
                          variant="outlined"
                          fullWidth
                          size="small"
                          startIcon={<PictureAsPdfOutlinedIcon />}
                          onClick={() => void downloadConfirmationPdf(qr)}
                          sx={qrCardButtonSx}
                        >
                          Confirmation PDF
                        </Button>
                        <Button
                          component={RouterLink}
                          to={`/trucker/returns/${schedule.id}`}
                          variant="text"
                          fullWidth
                          size="small"
                          endIcon={<OpenInNewIcon />}
                          sx={{ ...qrCardButtonSx, color: 'text.secondary' }}
                        >
                          Return details
                        </Button>
                      </Box>

                    </Box>

                  </Box>

                ) : (

                  <Box

                    sx={{

                      p: 1.5,

                      borderRadius: 2,

                      bgcolor: hexToRgba('#ED6C02', 0.08),

                      border: '1px solid',

                      borderColor: hexToRgba('#ED6C02', 0.2),

                    }}

                  >

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>

                      Booking QR not yet published — payment may still be pending depot verification.

                    </Typography>

                    <Button

                      component={RouterLink}

                      to="/trucker/payments"

                      size="small"

                      variant="outlined"

                      sx={{ fontWeight: 600, borderRadius: 2, width: { xs: '100%', sm: 'auto' } }}

                    >

                      Go to payments

                    </Button>

                  </Box>

                )}

              </Paper>

            )

          })}

        </Box>

      )}



      <BookingQrPreviewDialog
        open={preview !== null}
        onClose={() => setPreview(null)}
        schedule={preview?.schedule ?? null}
        qrBooking={preview?.qr ?? null}
        qrImageUrl={preview ? previewImageUrl : null}
        preAdvice={preview ? preAdviceById[preview.schedule.preAdviceId] : null}
        onDownload={preview ? () => downloadQr(preview.qr) : undefined}
        onDownloadConfirmationPdf={preview ? () => void downloadConfirmationPdf(preview.qr) : undefined}
        onBookLogicteck={
          preview && canOpenLogicteckConfirm(preview.qr, preview.schedule)
            ? handleOpenLogicteckConfirm
            : undefined
        }
        bookLogicteckLoading={bookLogicteckLoading}
        showPrint
        onPrint={() => {
          if (!preview) return
          setPreview(null)
          navigate(`/trucker/qr/print/${preview.qr.id}?auto=1`)
        }}
      />

    </Box>

  )

}


