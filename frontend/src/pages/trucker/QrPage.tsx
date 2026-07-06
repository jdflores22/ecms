import { ListLoadingState } from '../../components/layout/ListPagePrimitives'
import { QrImageSkeleton } from '../../components/layout/SkeletonPrimitives'
import {
  Alert,

  Box,

  Button,

  Chip,

  Dialog,

  DialogActions,

  DialogContent,

  DialogTitle,

  Paper,

  Typography,

} from '@mui/material'

import DownloadIcon from '@mui/icons-material/Download'

import OpenInNewIcon from '@mui/icons-material/OpenInNew'

import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'

import PrintIcon from '@mui/icons-material/Print'

import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'

import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { Link as RouterLink, useNavigate } from 'react-router-dom'

import {

  InfoTile,

  hexToRgba,

  infoGridSx,

  sectionPaperSx,

} from '../../components/layout/DetailPagePrimitives'

import {

  listHeroActionSx,

  listPageRootSx,

  LIST_PRIMARY,

} from '../../components/layout/ListPagePrimitives'

import { LOGICTECK_QR, qrLookupStatusColor, qrLookupStatusLabel } from '../../config/logicteckQr'

import { qrApi, scheduleApi, type QrBooking, type Schedule } from '../../services/api'

import { store } from '../../store'

import { formatDateTime, formatScheduleSlot } from '../../utils/datetime'
import { applyBookLogicteckResult, bookLogicteckBooking, canBookLogicteck } from '../../utils/logicteckBooking'



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

      const { data } = await scheduleApi.list()

      const confirmed = data.filter((s) => s.status === 'Confirmed' || s.status === 'Completed')

      setSchedules(confirmed)



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



  const openPreview = (schedule: Schedule, qr: QrBooking) => {

    setPreview({ schedule, qr })

    setNotice('')

  }



  const handleBookLogicteck = async () => {
    if (!preview || !canBookLogicteck(preview.qr)) return
    setBookLogicteckLoading(true)
    setNotice('')
    try {
      const result = await bookLogicteckBooking(preview.qr.id)
      if (result.success) {
        const updated = applyBookLogicteckResult(preview.qr, result) ?? preview.qr
        setQrMap((prev) => ({ ...prev, [updated.id]: updated }))
        setPreview({ schedule: preview.schedule, qr: updated })
        setNotice(result.message || LOGICTECK_QR.bookSuccess)
      } else {
        setNotice(result.message)
      }
    } catch {
      setNotice('Could not send pre-forecast data to LOGICTECK.')
    } finally {
      setBookLogicteckLoading(false)
    }
  }



  const previewImageUrl = preview ? qrImages[preview.qr.id] : null



  return (

    <Box sx={listPageRootSx}>

      <Paper

        elevation={0}

        sx={{

          p: { xs: 2.5, sm: 3 },

          mb: 3,

          borderRadius: 3,

          background: `linear-gradient(135deg, ${primaryDark} 0%, #0A3580 60%, #0C4DA8 100%)`,

          color: '#fff',

          boxShadow: '0 8px 24px rgba(11, 61, 145, 0.22)',

          position: 'relative',

          overflow: 'hidden',

        }}

      >

        <Box

          sx={{

            position: 'absolute',

            right: -30,

            top: -30,

            width: 140,

            height: 140,

            borderRadius: '50%',

            bgcolor: 'rgba(255,255,255,0.06)',

          }}

        />

        <Box

          sx={{

            display: 'flex',

            flexDirection: { xs: 'column', sm: 'row' },

            justifyContent: 'space-between',

            alignItems: { xs: 'stretch', sm: 'center' },

            gap: 2,

            position: 'relative',

          }}

        >

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', minWidth: 0 }}>

            <Box

              sx={{

                width: 48,

                height: 48,

                borderRadius: 2,

                bgcolor: 'rgba(255,255,255,0.14)',

                display: 'grid',

                placeItems: 'center',

                flexShrink: 0,

              }}

            >

              <QrCode2OutlinedIcon />

            </Box>

            <Box sx={{ minWidth: 0 }}>

              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>

                {LOGICTECK_QR.pageTitle}

              </Typography>

              <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 520 }}>

                {LOGICTECK_QR.heroDescription}

              </Typography>

            </Box>

          </Box>

          <Button

            component={RouterLink}

            to="/trucker/payments"

            variant="contained"

            startIcon={<PaymentsOutlinedIcon />}

            sx={listHeroActionSx}

          >

            Payments

          </Button>

        </Box>

      </Paper>



      {error && (

        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>

          {error}

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

            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },

            gap: 2,

          }}

        >

          {sortedSchedules.map((schedule) => {

            const qr = qrMap[schedule.id]

            const imageUrl = qr ? qrImages[qr.id] : null



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

                        {qr?.payload.containerNo ?? schedule.referenceNo}

                      </Typography>

                      {qr ? (

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>

                          Pre-forecast {schedule.referenceNo}

                        </Typography>

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
                            Download
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



      <Dialog

        open={preview !== null}

        onClose={() => setPreview(null)}

        maxWidth="sm"

        fullWidth

      >

        <DialogTitle sx={{ fontWeight: 700 }}>

          {LOGICTECK_QR.sectionTitle}

        </DialogTitle>

        <DialogContent>

          {preview && (

            <>

              <Paper

                elevation={0}

                sx={{

                  p: 1.5,

                  mb: 2,

                  borderRadius: 2,

                  bgcolor: hexToRgba(primaryDark, 0.04),

                  border: '1px solid',

                  borderColor: hexToRgba(primaryDark, 0.1),

                }}

              >

                <Typography

                  variant="h6"

                  sx={{ fontWeight: 800, fontFamily: 'monospace', wordBreak: 'break-all' }}

                >

                  {preview.qr.payload.containerNo}

                </Typography>

                <Typography variant="caption" color="text.secondary">

                  Pre-forecast {preview.schedule.referenceNo} · {preview.qr.payload.depot}

                </Typography>

              </Paper>



              {previewImageUrl ? (

                <Box

                  sx={{

                    display: 'flex',

                    justifyContent: 'center',

                    mb: 2,

                  }}

                >

                  <Box

                    component="img"

                    src={previewImageUrl}

                    alt={`QR code ${preview.qr.qrCode}`}

                    sx={{

                      width: '100%',

                      maxWidth: 280,

                      height: 'auto',

                      borderRadius: 2,

                      border: '1px solid',

                      borderColor: 'divider',

                      bgcolor: '#fff',

                      p: 1.5,

                    }}

                  />

                </Box>

              ) : (

                <QrImageSkeleton />

              )}



              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>

                {LOGICTECK_QR.scheduleSectionHint}

              </Typography>



              <Box sx={infoGridSx}>

                <InfoTile label="Container" value={preview.qr.payload.containerNo} mono />

                <InfoTile label={LOGICTECK_QR.bookingIdLabel} value={preview.qr.qrCode} mono />

                <InfoTile label="Generated" value={formatDateTime(preview.qr.generatedAt)} />

                <InfoTile

                  label="Return slot"

                  value={formatScheduleSlot(preview.qr.payload.scheduleDate, preview.qr.payload.scheduleTime)}

                />

                <InfoTile label="Depot" value={preview.qr.payload.depot} />

                <InfoTile label="Trucker" value={preview.qr.payload.trucker} />

                <InfoTile

                  label={LOGICTECK_QR.validationStatusLabel}

                  value={

                    <Chip

                      label={qrLookupStatusLabel(preview.qr)}

                      size="small"

                      color={qrLookupStatusColor(qrLookupStatusLabel(preview.qr))}

                      sx={{ fontWeight: 600 }}

                    />

                  }

                />

              </Box>

              {notice && (

                <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }} onClose={() => setNotice('')}>

                  {notice}

                </Alert>

              )}

            </>

          )}

        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>

          <Button onClick={() => setPreview(null)}>Close</Button>

          {preview && (

            <>

              <Button

                variant="outlined"

                startIcon={<DownloadIcon />}

                onClick={() => downloadQr(preview.qr)}

                sx={{ fontWeight: 600, borderRadius: 2 }}

              >

                Download

              </Button>

              <Button

                variant="outlined"

                onClick={handleBookLogicteck}

                disabled={!preview?.qr || !canBookLogicteck(preview?.qr) || bookLogicteckLoading}

                sx={{ fontWeight: 700, borderRadius: 2 }}

              >

                {bookLogicteckLoading ? 'Sending…' : LOGICTECK_QR.bookLogicteck}

              </Button>

              <Button

                variant="contained"

                startIcon={<PrintIcon />}

                onClick={() => {

                  setPreview(null)

                  navigate(`/trucker/qr/print/${preview.qr.id}?auto=1`)

                }}

                sx={{ fontWeight: 700, borderRadius: 2 }}

              >

                Print pass

              </Button>

            </>

          )}

        </DialogActions>

      </Dialog>

    </Box>

  )

}


