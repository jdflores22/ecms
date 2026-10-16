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

import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'

import PrintIcon from '@mui/icons-material/Print'

import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { Link as RouterLink, Navigate, useNavigate, useParams } from 'react-router-dom'

import BookingQrPreviewDialog from '../../components/qr/BookingQrPreviewDialog'
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

import { REQUIRED_CONTAINER_PHOTO_CATEGORIES } from '../../config/containerPhotoCategories'

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

import { isTruckerOrBroker } from '../../config/roleConfig'
import { useAppSelector } from '../../store/hooks'

import { useAssetUrl } from '../../hooks/useAssetUrl'
import { formatArrivalWindow, formatDateTime, formatScheduleSlot } from '../../utils/datetime'
import {
  isScheduleDetailsVisible,
  truckerScheduleStatusHint,
  truckerScheduleStatusLabel,
} from '../../utils/truckerSchedule'
import { canOpenLogicteckConfirm, openLogicteckNewReturn } from '../../utils/logicteckBooking'
import { downloadBookingConfirmationPdf } from '../../utils/downloadBookingConfirmationPdf'

import {

  needsPaymentUpload,

  paymentStatusLabel,

  resolvePaymentStatus,

  showPaymentStatus,

  truckerPaymentPath,

} from '../../utils/truckerPayment'



const primaryDark = ICS_PRIMARY

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

    if (!scheduleId || !isTruckerOrBroker(user?.role)) return

    setLoading(true)

    setError('')

    setQrBooking(null)

    setQrImageUrl(null)

    scheduleApi
      .get(scheduleId)
      .then((scheduleRes) => {
        const item = scheduleRes.data
        return Promise.all([
          Promise.resolve(item),
          paymentApi.getBySchedule(scheduleId),
          preAdviceApi.get(item.preAdviceId),
        ])
      })
      .then(async ([item, paymentRes, preAdviceRes]) => {

        const existing = paymentRes.data

        setSchedule(item)

        setPayment(existing)

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

    const uploaded = REQUIRED_CONTAINER_PHOTO_CATEGORIES.filter((c) =>

      documents.some((d) => d.category === c.value),

    ).length

    return { uploaded, total: REQUIRED_CONTAINER_PHOTO_CATEGORIES.length }

  }, [documents])



  const journeySteps = useMemo(() => {

    if (!schedule) return []

    const status = preAdvice ? resolvePaymentStatus(schedule, payment) : 'Pending'

    return buildReturnJourneySteps(schedule, status, qrBooking, qrLoading)

  }, [schedule, preAdvice, payment, qrBooking, qrLoading])



  if (!isTruckerOrBroker(user?.role)) {

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

  const downloadConfirmationPdf = async () => {
    if (!qrBooking) return
    try {
      await downloadBookingConfirmationPdf(qrBooking.id, qrBooking.qrCode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download confirmation PDF.')
    }
  }



  const handleOpenLogicteckConfirm = async () => {
    if (!qrBooking || !canOpenLogicteckConfirm(qrBooking, schedule)) return
    setBookLogicteckLoading(true)
    try {
      await openLogicteckNewReturn(qrBooking.qrCode)
    } catch {
      setError('Could not open LOGICTECK.')
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
                {isScheduleDetailsVisible(schedule) ? schedule.depotName : '—'} · {preAdvice.containerNo} (
                {preAdvice.containerSize}&apos; {preAdvice.containerType})
              </>
            }

            chips={

              <>

                <Chip

                  label={truckerScheduleStatusLabel(schedule)}

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
              isScheduleDetailsVisible(schedule) && schedule.date ? (
                <DetailHeroAside
                  label="Return slot"
                  primary={formatScheduleSlot(schedule.date, schedule.time)}
                  secondary={
                    schedule.slotNo > 0
                      ? `Slot ${schedule.slotNo}`
                      : formatArrivalWindow(schedule.date, schedule.time)
                  }
                />
              ) : !isScheduleDetailsVisible(schedule) ? (
                <DetailHeroAside label="Return schedule" primary={truckerScheduleStatusHint(schedule)} />
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
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Button
                      color="inherit"
                      size="small"
                      startIcon={<PictureAsPdfOutlinedIcon />}
                      onClick={() => void downloadConfirmationPdf()}
                      sx={{ fontWeight: 700 }}
                    >
                      Confirmation PDF
                    </Button>
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
                  </Box>
                ) : undefined
              }
            >
              Payment approved. Your booking confirmation PDF and booking QR are ready.
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
              onDownloadConfirmationPdf={() => void downloadConfirmationPdf()}
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



      <BookingQrPreviewDialog
        open={qrPreviewOpen}
        onClose={() => setQrPreviewOpen(false)}
        schedule={schedule}
        qrBooking={qrBooking}
        qrImageUrl={qrImageUrl}
        preAdvice={preAdvice}
        payment={payment}
        onDownload={downloadQr}
        onDownloadConfirmationPdf={() => void downloadConfirmationPdf()}
        onBookLogicteck={
          qrBooking && canOpenLogicteckConfirm(qrBooking, schedule) ? handleOpenLogicteckConfirm : undefined
        }
        bookLogicteckLoading={bookLogicteckLoading}
        showPrint
        onPrint={() => {
          if (!qrBooking) return
          setQrPreviewOpen(false)
          navigate(`/trucker/qr/print/${qrBooking.id}?auto=1`)
        }}
      />

    </Box>

  )

}


