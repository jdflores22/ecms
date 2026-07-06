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

  Tab,

  Tabs,

  Typography,

} from '@mui/material'

import DownloadIcon from '@mui/icons-material/Download'

import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined'

import OpenInNewIcon from '@mui/icons-material/OpenInNew'

import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'

import PrintIcon from '@mui/icons-material/Print'

import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { Link as RouterLink, Navigate, useNavigate, useParams } from 'react-router-dom'

import ReturnDetailTabPanels, { type ReturnDetailTab } from '../../components/trucker/ReturnDetailTabPanels'
import AssetImage from '../../components/layout/AssetImage'
import { QrImageSkeleton } from '../../components/layout/SkeletonPrimitives'

import ReturnJourneyStrip, { buildReturnJourneySteps } from '../../components/trucker/ReturnJourneyStrip'

import {

  DetailBackButton,

  DetailErrorState,

  DetailHero,

  DetailHeroAside,

  DetailLoadingState,

  ICS_PRIMARY,

  InfoTile,

  PhotoProgressChip,

  TimezoneChip,

  detailTabsSx,

  hexToRgba,

  infoGridSx,

  sectionPaperSx,

} from '../../components/layout/DetailPagePrimitives'

import { CONTAINER_PHOTO_CATEGORIES } from '../../config/containerPhotoCategories'

import { LOGICTECK_QR, qrLookupStatusColor, qrLookupStatusLabel } from '../../config/logicteckQr'

import {

  paymentApi,

  preAdviceApi,

  qrApi,

  scheduleApi,

  type Payment,

  type PreAdvice,

  type PreAdviceDocument,

  type QrBooking,

  type Schedule,

} from '../../services/api'

import { store } from '../../store'

import { useAppSelector } from '../../store/hooks'

import { useAssetUrl } from '../../hooks/useAssetUrl'
import { formatDateTime, formatScheduleSlot } from '../../utils/datetime'
import { applyBookLogicteckResult, bookLogicteckBooking, canBookLogicteck } from '../../utils/logicteckBooking'

import {

  needsPaymentUpload,

  paymentStatusLabel,

  resolvePaymentStatus,

  showPaymentStatus,

  truckerPaymentPath,

} from '../../utils/truckerPayment'



const primaryDark = ICS_PRIMARY



const scheduleStatusLabel: Record<string, string> = {

  WaitingSchedule: 'Waiting schedule',

}



function heroScheduleChipStyle(status: string): { bgcolor: string; color: string } {

  switch (status) {

    case 'Confirmed':

    case 'Completed':

      return { bgcolor: 'rgba(46, 125, 50, 0.92)', color: '#fff' }

    case 'Scheduled':

      return { bgcolor: 'rgba(2, 136, 209, 0.92)', color: '#fff' }

    case 'WaitingSchedule':

      return { bgcolor: 'rgba(237, 108, 2, 0.92)', color: '#fff' }

    case 'NoShow':

      return { bgcolor: 'rgba(198, 40, 40, 0.92)', color: '#fff' }

    default:

      return { bgcolor: 'rgba(255,255,255,0.95)', color: primaryDark }

  }

}



function heroPaymentChipStyle(status: string): { bgcolor: string; color: string } {

  switch (status) {

    case 'Pending':

      return { bgcolor: 'rgba(237, 108, 2, 0.92)', color: '#fff' }

    case 'ForVerification':

      return { bgcolor: 'rgba(2, 136, 209, 0.92)', color: '#fff' }

    case 'Paid':

      return { bgcolor: 'rgba(46, 125, 50, 0.92)', color: '#fff' }

    case 'Rejected':

      return { bgcolor: 'rgba(198, 40, 40, 0.92)', color: '#fff' }

    default:

      return { bgcolor: 'rgba(255,255,255,0.18)', color: '#fff' }

  }

}



function isImageProof(path: string) {

  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(path)

}



async function loadQrImage(bookingId: number): Promise<string> {

  const token = store.getState().auth.accessToken

  const res = await fetch(qrApi.downloadUrl(bookingId), {

    headers: token ? { Authorization: `Bearer ${token}` } : {},

  })

  if (!res.ok) throw new Error('Failed to load QR image.')

  const blob = await res.blob()

  return URL.createObjectURL(blob)

}



const alertWithActionSx = {

  mb: { xs: 2, sm: 3 },

  borderRadius: 2,

  flexDirection: { xs: 'column', sm: 'row' },

  alignItems: { xs: 'flex-start', sm: 'center' },

  '& .MuiAlert-message': { width: '100%' },

  '& .MuiAlert-action': {

    m: 0,

    pt: { xs: 1, sm: 0 },

    pl: { xs: 0, sm: 2 },

    width: { xs: '100%', sm: 'auto' },

  },

  '& .MuiAlert-action .MuiButton-root': {

    width: { xs: '100%', sm: 'auto' },

  },

}



export default function TruckerReturnDetailPage() {

  const { id } = useParams()

  const navigate = useNavigate()

  const user = useAppSelector((s) => s.auth.user)

  const scheduleId = Number(id)



  const [schedule, setSchedule] = useState<Schedule | null>(null)

  const [preAdvice, setPreAdvice] = useState<PreAdvice | null>(null)

  const [documents, setDocuments] = useState<PreAdviceDocument[]>([])

  const [payment, setPayment] = useState<Payment | null>(null)

  const [qrBooking, setQrBooking] = useState<QrBooking | null>(null)

  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)

  const [qrLoading, setQrLoading] = useState(false)

  const [proofPreviewOpen, setProofPreviewOpen] = useState(false)

  const [qrPreviewOpen, setQrPreviewOpen] = useState(false)

  const [bookLogicteckLoading, setBookLogicteckLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<ReturnDetailTab>('details')

  const [loading, setLoading] = useState(true)

  const [documentsLoading, setDocumentsLoading] = useState(true)
  const proofFileUrl = useAssetUrl(payment?.proofFile)

  const [error, setError] = useState('')



  const loadDocuments = useCallback((preAdviceId: number) => {

    setDocumentsLoading(true)

    preAdviceApi

      .documents(preAdviceId)

      .then(({ data }) => setDocuments(data))

      .catch(() => setDocuments([]))

      .finally(() => setDocumentsLoading(false))

  }, [])



  const load = useCallback(() => {

    if (!scheduleId || user?.role !== 'Trucker') return

    setLoading(true)

    setError('')

    setQrBooking(null)

    setQrImageUrl(null)

    Promise.all([scheduleApi.get(scheduleId), paymentApi.mine()])

      .then(async ([scheduleRes, paymentsRes]) => {

        const item = scheduleRes.data

        const existing = paymentsRes.data.find((p) => p.scheduleId === item.id) ?? null

        setSchedule(item)

        setPayment(existing)



        const preAdviceRes = await preAdviceApi.get(item.preAdviceId)

        setPreAdvice(preAdviceRes.data)

        loadDocuments(preAdviceRes.data.id)



        if (item.status === 'Confirmed' || item.status === 'Completed') {

          setQrLoading(true)

          try {

            const qrRes = await qrApi.getBySchedule(item.id)

            setQrBooking(qrRes.data)

            const imageUrl = await loadQrImage(qrRes.data.id)

            setQrImageUrl(imageUrl)

          } catch {

            setQrBooking(null)

            setQrImageUrl(null)

          } finally {

            setQrLoading(false)

          }

        }

      })

      .catch(() => setError('Return request not found or not assigned to you.'))

      .finally(() => setLoading(false))

  }, [scheduleId, loadDocuments, user?.role])



  useEffect(() => {

    load()

  }, [load])



  useEffect(() => {

    return () => {

      if (qrImageUrl) URL.revokeObjectURL(qrImageUrl)

    }

  }, [qrImageUrl])



  const photoProgress = useMemo(() => {

    const uploaded = CONTAINER_PHOTO_CATEGORIES.filter((c) =>

      documents.some((d) => d.category === c.value),

    ).length

    return { uploaded, total: CONTAINER_PHOTO_CATEGORIES.length }

  }, [documents])



  const journeySteps = useMemo(() => {

    if (!schedule) return []

    const status = preAdvice ? resolvePaymentStatus(schedule, payment) : 'Pending'

    return buildReturnJourneySteps(schedule, status, qrBooking, qrLoading)

  }, [schedule, preAdvice, payment, qrBooking, qrLoading])



  if (user?.role !== 'Trucker') {

    return <Navigate to="/" replace />

  }



  if (!scheduleId || Number.isNaN(scheduleId)) {

    return <Navigate to="/trucker/returns" replace />

  }



  const paymentStatus = schedule && preAdvice ? resolvePaymentStatus(schedule, payment) : 'Pending'

  const paymentUploadNeeded = schedule ? needsPaymentUpload(schedule, payment) : false

  const paymentVisible = schedule ? showPaymentStatus(schedule, payment) : false



  const showPaymentSection = Boolean(

    paymentVisible &&

      (paymentUploadNeeded ||

        (payment &&

          (payment.proofFile ||

            payment.status === 'ForVerification' ||

            payment.status === 'Paid' ||

            payment.status === 'Rejected'))),

  )



  const downloadQr = async () => {

    if (!qrBooking) return

    const token = store.getState().auth.accessToken

    const res = await fetch(qrApi.downloadUrl(qrBooking.id), {

      headers: token ? { Authorization: `Bearer ${token}` } : {},

    })

    const blob = await res.blob()

    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')

    a.href = url

    a.download = `qr-${qrBooking.qrCode}.png`

    a.click()

    URL.revokeObjectURL(url)

  }



  const handleBookLogicteck = async () => {
    if (!qrBooking || !canBookLogicteck(qrBooking)) return
    setBookLogicteckLoading(true)
    try {
      const result = await bookLogicteckBooking(qrBooking.id)
      if (result.success) {
        setQrBooking(applyBookLogicteckResult(qrBooking, result))
      } else {
        setError(result.message)
      }
    } catch {
      setError('Could not send pre-forecast data to LOGICTECK.')
    } finally {
      setBookLogicteckLoading(false)
    }
  }



  return (

    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>

      <DetailBackButton to="/trucker/returns" label="Back to returns" />



      {loading ? (

        <DetailLoadingState />

      ) : error ? (

        <DetailErrorState message={error} />

      ) : schedule && preAdvice ? (

        <>

          <DetailHero

            icon={<EventNoteOutlinedIcon />}

            title={schedule.referenceNo}

            subtitle={

              <>

                {schedule.depotName} · {preAdvice.containerNo} ({preAdvice.containerSize}&apos;{' '}

                {preAdvice.containerType})

              </>

            }

            chips={

              <>

                <Chip

                  label={scheduleStatusLabel[schedule.status] ?? schedule.status}

                  size="small"

                  sx={{ fontWeight: 700, ...heroScheduleChipStyle(schedule.status) }}

                />

                {paymentVisible && (

                  <Chip

                    label={paymentStatusLabel[paymentStatus] ?? paymentStatus}

                    size="small"

                    sx={{ fontWeight: 700, ...heroPaymentChipStyle(paymentStatus) }}

                  />

                )}

                <PhotoProgressChip uploaded={photoProgress.uploaded} total={photoProgress.total} />

                <TimezoneChip />

              </>

            }

            aside={

              schedule.date ? (

                <DetailHeroAside

                  label="Return slot"

                  primary={formatScheduleSlot(schedule.date, schedule.time)}

                  secondary={schedule.slotNo > 0 ? `Slot ${schedule.slotNo}` : undefined}

                />

              ) : undefined

            }

          />



          {journeySteps.length > 0 && <ReturnJourneyStrip steps={journeySteps} />}



          {paymentUploadNeeded && (

            <Alert

              severity="warning"

              sx={alertWithActionSx}

              action={

                <Button

                  color="inherit"

                  size="small"

                  onClick={() => setActiveTab('payment')}

                  startIcon={<PaymentsOutlinedIcon />}

                  sx={{ fontWeight: 600 }}

                >

                  View payment

                </Button>

              }

            >

              Payment proof is required before the depot can confirm your return.

            </Alert>

          )}



          {paymentStatus === 'ForVerification' && (

            <Alert severity="info" sx={alertWithActionSx}>

              Payment proof submitted and awaiting depot verification.

            </Alert>

          )}



          {schedule.depotRemarks && (
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2, whiteSpace: 'pre-wrap' }}>
              <strong>Depot note:</strong> {schedule.depotRemarks}
            </Alert>
          )}

          {paymentStatus === 'Rejected' && schedule.status === 'Scheduled' && (

            <Alert

              severity="error"

              sx={alertWithActionSx}

              action={

                <Button

                  component={RouterLink}

                  to={truckerPaymentPath(schedule.id)}

                  color="inherit"

                  size="small"

                  sx={{ fontWeight: 600 }}

                >

                  Re-upload

                </Button>

              }

            >

              Your payment proof was rejected. Upload a new proof on the payment page.

            </Alert>

          )}



          {(schedule.status === 'Confirmed' || schedule.status === 'Completed') && paymentStatus === 'Paid' && (

            <Alert

              severity="success"

              sx={alertWithActionSx}

              action={

                qrBooking ? (

                  <Button

                    color="inherit"

                    size="small"

                    startIcon={<QrCode2OutlinedIcon />}

                    onClick={() => {
                      setActiveTab('qr')
                      setQrPreviewOpen(true)
                    }}

                    sx={{ fontWeight: 600 }}

                  >

                    View QR

                  </Button>

                ) : undefined

              }

            >

              {LOGICTECK_QR.readyAlert}

            </Alert>

          )}



          <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0 }}>
            <Tabs
              value={activeTab}
              onChange={(_, value: ReturnDetailTab) => setActiveTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={detailTabsSx}
            >
              <Tab label="Request details" value="details" />
              <Tab
                label={`Container identity photos (${photoProgress.uploaded}/${photoProgress.total})`}
                value="photos"
              />
              <Tab label="Payment" value="payment" />
              <Tab label={LOGICTECK_QR.tabLabel} value="qr" />
            </Tabs>

            <ReturnDetailTabPanels
              activeTab={activeTab}
              schedule={schedule}
              preAdvice={preAdvice}
              payment={payment}
              documents={documents}
              documentsLoading={documentsLoading}
              paymentStatus={paymentStatus}
              paymentUploadNeeded={paymentUploadNeeded}
              showPaymentSection={showPaymentSection}
              qrBooking={qrBooking}
              qrImageUrl={qrImageUrl}
              qrLoading={qrLoading}
              onProofPreview={() => setProofPreviewOpen(true)}
              onQrPreview={() => setQrPreviewOpen(true)}
              onDownloadQr={downloadQr}
              onPrintQr={(bookingId) => navigate(`/trucker/qr/print/${bookingId}?auto=1`)}
              onReloadDocuments={() => loadDocuments(preAdvice.id)}
            />
          </Paper>

        </>

      ) : null}



      <Dialog open={proofPreviewOpen} onClose={() => setProofPreviewOpen(false)} maxWidth="sm" fullWidth>

        <DialogTitle sx={{ fontWeight: 700 }}>Payment proof</DialogTitle>

        <DialogContent>

          {payment?.proofFile && (

            <>

              {isImageProof(payment.proofFile) ? (

                <AssetImage

                  path={payment.proofFile}

                  alt="Payment proof"

                  skeletonHeight={360}

                  skeletonMaxHeight={480}

                  sx={{

                    width: '100%',

                    maxHeight: 480,

                    objectFit: 'contain',

                    borderRadius: 2,

                    border: '1px solid',

                    borderColor: 'divider',

                    bgcolor: '#fafafa',

                  }}

                />

              ) : (

                <Button

                  variant="outlined"

                  href={proofFileUrl}

                  target="_blank"

                  rel="noreferrer"

                  endIcon={<OpenInNewIcon />}

                  sx={{ fontWeight: 600, borderRadius: 2 }}

                >

                  Open proof file

                </Button>

              )}

            </>

          )}

        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>

          <Button onClick={() => setProofPreviewOpen(false)}>Close</Button>

          {payment?.proofFile && (

            <Button

              variant="contained"

              href={proofFileUrl}

              target="_blank"

              rel="noreferrer"

              endIcon={<OpenInNewIcon />}

              sx={{ fontWeight: 700, borderRadius: 2 }}

            >

              Open in new tab

            </Button>

          )}

        </DialogActions>

      </Dialog>



      <Dialog open={qrPreviewOpen} onClose={() => setQrPreviewOpen(false)} maxWidth="sm" fullWidth>

        <DialogTitle sx={{ fontWeight: 700 }}>{LOGICTECK_QR.sectionTitle}</DialogTitle>

        <DialogContent>

          {qrBooking && schedule && (

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

                <Typography variant="body2" sx={{ fontWeight: 600 }}>

                  {schedule.referenceNo}

                </Typography>

                <Typography variant="caption" color="text.secondary">

                  {qrBooking.payload.containerNo} · {qrBooking.payload.depot}

                </Typography>

              </Paper>



              {qrImageUrl ? (

                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>

                  <Box

                    component="img"

                    src={qrImageUrl}

                    alt={`QR code ${qrBooking.qrCode}`}

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



              <Box sx={infoGridSx}>

                <InfoTile label={LOGICTECK_QR.bookingIdLabel} value={qrBooking.qrCode} mono />

                <InfoTile label="Generated" value={formatDateTime(qrBooking.generatedAt)} />

                <InfoTile label="Container" value={qrBooking.payload.containerNo} mono />

                <InfoTile

                  label="Return slot"

                  value={formatScheduleSlot(qrBooking.payload.scheduleDate, qrBooking.payload.scheduleTime)}

                />

                <InfoTile label="Depot" value={qrBooking.payload.depot} />

                <InfoTile

                  label={LOGICTECK_QR.validationStatusLabel}

                  value={

                    <Chip

                      label={qrLookupStatusLabel(qrBooking)}

                      size="small"

                      color={qrLookupStatusColor(qrLookupStatusLabel(qrBooking))}

                      sx={{ fontWeight: 600 }}

                    />

                  }

                />

              </Box>

            </>

          )}

        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>

          <Button onClick={() => setQrPreviewOpen(false)}>Close</Button>

          {qrBooking && (

            <>

              <Button

                variant="outlined"

                startIcon={<DownloadIcon />}

                onClick={downloadQr}

                sx={{ fontWeight: 600, borderRadius: 2 }}

              >

                Download

              </Button>

              <Button

                variant="outlined"

                onClick={handleBookLogicteck}

                disabled={!qrBooking || !canBookLogicteck(qrBooking) || bookLogicteckLoading}

                sx={{ fontWeight: 700, borderRadius: 2 }}

              >

                {bookLogicteckLoading ? 'Sending…' : LOGICTECK_QR.bookLogicteck}

              </Button>

              <Button

                variant="contained"

                startIcon={<PrintIcon />}

                onClick={() => {

                  setQrPreviewOpen(false)

                  navigate(`/trucker/qr/print/${qrBooking.id}?auto=1`)

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


