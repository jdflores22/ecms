import {

  Alert,

  Box,

  Button,

  Chip,

  CircularProgress,

  Dialog,

  DialogActions,

  DialogContent,

  DialogTitle,

  Paper,

  TextField,

  Typography,

} from '@mui/material'

import CancelIcon from '@mui/icons-material/Cancel'

import DeleteIcon from '@mui/icons-material/Delete'

import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'

import DownloadIcon from '@mui/icons-material/Download'

import EditIcon from '@mui/icons-material/Edit'

import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'

import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'

import SendIcon from '@mui/icons-material/Send'

import axios from 'axios'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { Navigate, useNavigate, useParams } from 'react-router-dom'

import ContainerIdentityPhotos from '../../components/preAdvice/ContainerIdentityPhotos'

import PreAdviceForm from '../../components/preAdvice/PreAdviceForm'

import {

  DetailBackButton,

  DetailErrorState,

  DetailHero,

  DetailHeroAside,

  DetailLoadingState,

  DetailSection,

  ICS_PRIMARY,

  InfoTile,

  PhotoProgressChip,

  TimezoneChip,

  heroMutedChipSx,

  infoGridSx,

  sectionPaperSx,

} from '../../components/layout/DetailPagePrimitives'

import { CONTAINER_PHOTO_CATEGORIES } from '../../config/containerPhotoCategories'

import { LOGICTECK_QR, qrLookupStatusLabel } from '../../config/logicteckQr'

import {

  preAdviceApi,

  qrApi,

  scheduleApi,

  type PreAdvice,

  type PreAdviceDocument,

  type PreAdviceLookups,

  type QrBooking,

  type Schedule,

} from '../../services/api'

import { store } from '../../store'

import { useAppSelector } from '../../store/hooks'

import { formatDateTime, formatScheduleSlot } from '../../utils/datetime'



const primaryDark = ICS_PRIMARY



const statusLabel: Record<string, string> = {

  UnderEvaluation: 'Under evaluation',

}



const scheduleStatusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {

  WaitingSchedule: 'warning',

  Scheduled: 'info',

  Confirmed: 'success',

  Completed: 'success',

  Cancelled: 'default',

}



const scheduleStatusLabel: Record<string, string> = {

  WaitingSchedule: 'Waiting schedule',

}



function heroStatusChipStyle(status: string): { bgcolor: string; color: string; border?: string } {

  switch (status) {

    case 'Approved':

      return { bgcolor: 'rgba(46, 125, 50, 0.92)', color: '#fff' }

    case 'Rejected':

      return { bgcolor: 'rgba(198, 40, 40, 0.92)', color: '#fff' }

    case 'UnderEvaluation':

      return { bgcolor: 'rgba(237, 108, 2, 0.92)', color: '#fff' }

    case 'Submitted':

      return { bgcolor: 'rgba(255,255,255,0.95)', color: primaryDark }

    case 'Cancelled':

      return { bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }

    case 'Draft':

      return { bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }

    default:

      return { bgcolor: 'rgba(255,255,255,0.95)', color: primaryDark }

  }

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

    case 'Cancelled':

      return { bgcolor: 'rgba(158, 158, 158, 0.92)', color: '#fff' }

    default:

      return { bgcolor: 'rgba(255,255,255,0.95)', color: primaryDark }

  }

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



function statusGuidance(

  status: string,

  schedule?: Schedule | null,

): { severity: 'info' | 'success' | 'warning' | 'error'; message: string } | null {

  switch (status) {

    case 'Draft':

      return {

        severity: 'info',

        message: 'This request is still a draft. Add container identity photos for each view, then submit for evaluation.',

      }

    case 'Submitted':

      return {

        severity: 'info',

        message: 'Submitted and waiting for a shipping-line evaluator to review this request.',

      }

    case 'UnderEvaluation':

      return {

        severity: 'warning',

        message: 'A shipping-line evaluator is reviewing this request. You can still cancel while evaluation is in progress.',

      }

    case 'Approved':

      return {

        severity: 'success',

        message: schedule?.status === 'Confirmed' || schedule?.status === 'Completed'

          ? 'Return schedule is confirmed. The assigned trucker can complete payment and receive a LOGICTECK booking QR.'

          : schedule?.status === 'Scheduled'

            ? 'Return schedule assigned. The trucker has been notified and can upload payment proof.'

            : 'Approved. The depot will assign a return schedule and notify the assigned trucker.',

      }

    case 'Rejected':

      return {

        severity: 'error',

        message: 'This request was rejected. Create a new pre-advice if you need to resubmit.',

      }

    case 'Cancelled':

      return {

        severity: 'warning',

        message: 'This request was cancelled and cannot be resumed.',

      }

    default:

      return null

  }

}



function apiErrorMessage(err: unknown, fallback: string) {

  if (axios.isAxiosError(err)) {

    const msg = err.response?.data?.message

    if (typeof msg === 'string') return msg

  }

  return fallback

}



export default function PreAdviceDetailPage() {

  const { id } = useParams()

  const navigate = useNavigate()

  const user = useAppSelector((s) => s.auth.user)

  const preAdviceId = Number(id)



  const [item, setItem] = useState<PreAdvice | null>(null)

  const [lookups, setLookups] = useState<PreAdviceLookups | null>(null)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  const [editing, setEditing] = useState(false)

  const [submitting, setSubmitting] = useState(false)

  const [actionError, setActionError] = useState('')

  const [cancelOpen, setCancelOpen] = useState(false)

  const [cancelReason, setCancelReason] = useState('')

  const [documents, setDocuments] = useState<PreAdviceDocument[]>([])

  const [documentsLoading, setDocumentsLoading] = useState(false)

  const [photoError, setPhotoError] = useState('')

  const [schedule, setSchedule] = useState<Schedule | null>(null)

  const [scheduleLoading, setScheduleLoading] = useState(false)

  const [qrBooking, setQrBooking] = useState<QrBooking | null>(null)

  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)

  const [qrLoading, setQrLoading] = useState(false)



  const loadDocuments = useCallback(() => {

    if (!preAdviceId) return

    setDocumentsLoading(true)

    preAdviceApi

      .documents(preAdviceId)

      .then(({ data }) => setDocuments(data))

      .catch(() => setDocuments([]))

      .finally(() => setDocumentsLoading(false))

  }, [preAdviceId])



  const load = useCallback(() => {

    if (!preAdviceId) return

    setLoading(true)

    setError('')

    preAdviceApi

      .get(preAdviceId)

      .then(({ data }) => setItem(data))

      .catch(() => setError('Pre-advice request not found.'))

      .finally(() => setLoading(false))

  }, [preAdviceId])



  const loadSchedule = useCallback(() => {

    if (!preAdviceId) return

    setScheduleLoading(true)

    setQrBooking(null)

    setQrImageUrl(null)

    scheduleApi

      .getByPreAdvice(preAdviceId)

      .then(async ({ data }) => {

        setSchedule(data)

        if (data.status === 'Confirmed' || data.status === 'Completed') {

          setQrLoading(true)

          try {

            const qrRes = await qrApi.getBySchedule(data.id)

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

      .catch(() => setSchedule(null))

      .finally(() => setScheduleLoading(false))

  }, [preAdviceId])



  useEffect(() => {

    load()

    loadDocuments()

  }, [load, loadDocuments])



  useEffect(() => {

    if (item?.status === 'Approved') {

      loadSchedule()

    } else {

      setSchedule(null)

      setQrBooking(null)

      setQrImageUrl(null)

    }

  }, [item?.status, loadSchedule])



  useEffect(() => {

    return () => {

      if (qrImageUrl) URL.revokeObjectURL(qrImageUrl)

    }

  }, [qrImageUrl])



  useEffect(() => {

    if (user?.role === 'Broker') {

      preAdviceApi.lookups().then(({ data }) => setLookups(data)).catch(() => {})

    }

  }, [user?.role])



  const photoProgress = useMemo(() => {

    const uploaded = CONTAINER_PHOTO_CATEGORIES.filter((c) =>

      documents.some((d) => d.category === c.value),

    ).length

    return { uploaded, total: CONTAINER_PHOTO_CATEGORIES.length }

  }, [documents])



  if (user?.role !== 'Broker') {

    return <Navigate to="/" replace />

  }



  if (!preAdviceId || Number.isNaN(preAdviceId)) {

    return <Navigate to="/preadvice" replace />

  }



  const isDraft = item?.status === 'Draft'

  const canCancel = item?.status === 'Submitted' || item?.status === 'UnderEvaluation'

  const canManageDocuments = item?.status === 'Draft' || item?.status === 'Submitted'

  const showHeroActions = !editing && (canCancel || isDraft)



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



  const handleUpdate = async (values: { shippingLineId: number; containerId: number; remarks?: string }) => {

    if (!item) return

    setSubmitting(true)

    setActionError('')

    try {

      const { data } = await preAdviceApi.update(item.id, values)

      setItem(data)

      setEditing(false)

    } catch (err) {

      setActionError(apiErrorMessage(err, 'Failed to update pre-advice.'))

    } finally {

      setSubmitting(false)

    }

  }



  const handleSubmit = async () => {

    if (!item) return

    setSubmitting(true)

    setActionError('')

    try {

      const { data } = await preAdviceApi.submit(item.id)

      setItem(data)

    } catch (err) {

      setActionError(apiErrorMessage(err, 'Failed to submit pre-advice.'))

    } finally {

      setSubmitting(false)

    }

  }



  const handleCancel = async () => {

    if (!item) return

    setSubmitting(true)

    setActionError('')

    try {

      const { data } = await preAdviceApi.cancel(item.id, cancelReason.trim() || undefined)

      setItem(data)

      setCancelOpen(false)

      setCancelReason('')

    } catch (err) {

      setActionError(apiErrorMessage(err, 'Failed to cancel pre-advice.'))

    } finally {

      setSubmitting(false)

    }

  }



  const handleDelete = async () => {

    if (!item || !window.confirm('Delete this draft pre-advice request?')) return

    setSubmitting(true)

    setActionError('')

    try {

      await preAdviceApi.delete(item.id)

      navigate('/preadvice')

    } catch (err) {

      setActionError(apiErrorMessage(err, 'Failed to delete pre-advice.'))

      setSubmitting(false)

    }

  }



  return (

    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>

      <DetailBackButton to="/preadvice" label="Back to list" />



      {loading ? (

        <DetailLoadingState />

      ) : error ? (

        <DetailErrorState message={error} />

      ) : item ? (

        <>

          <DetailHero

            icon={<DescriptionOutlinedIcon />}

            title={item.referenceNo}

            subtitle={`${item.shippingLineName} · ${item.containerNo} (${item.containerSize}' ${item.containerType})`}

            chips={

              <>

                <Chip

                  label={statusLabel[item.status] ?? item.status}

                  size="small"

                  sx={{ fontWeight: 700, ...heroStatusChipStyle(item.status) }}

                />

                {schedule && (

                  <Chip

                    label={scheduleStatusLabel[schedule.status] ?? schedule.status}

                    size="small"

                    sx={{ fontWeight: 700, ...heroScheduleChipStyle(schedule.status) }}

                  />

                )}

                <Chip

                  icon={<LocalShippingOutlinedIcon sx={{ fontSize: '16px !important', color: 'inherit !important' }} />}

                  label={item.brokerName}

                  size="small"

                  sx={{ ...heroMutedChipSx, '& .MuiChip-icon': { color: 'inherit' } }}

                />

                <PhotoProgressChip uploaded={photoProgress.uploaded} total={photoProgress.total} />

                <TimezoneChip />

              </>

            }

            aside={

              showHeroActions ? (

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>

                  {canCancel && (

                    <Button

                      startIcon={<CancelIcon />}

                      variant="outlined"

                      onClick={() => setCancelOpen(true)}

                      disabled={submitting}

                      sx={{

                        color: '#fff',

                        borderColor: 'rgba(255,255,255,0.45)',

                        fontWeight: 600,

                        '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },

                      }}

                    >

                      Cancel request

                    </Button>

                  )}

                  {isDraft && (

                    <>

                      <Button

                        startIcon={<EditIcon />}

                        variant="outlined"

                        onClick={() => setEditing(true)}

                        sx={{

                          color: '#fff',

                          borderColor: 'rgba(255,255,255,0.45)',

                          fontWeight: 600,

                          '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },

                        }}

                      >

                        Edit

                      </Button>

                      <Button

                        startIcon={<SendIcon />}

                        variant="contained"

                        onClick={handleSubmit}

                        disabled={submitting}

                        sx={{

                          bgcolor: '#fff',

                          color: primaryDark,

                          fontWeight: 700,

                          '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },

                        }}

                      >

                        Submit

                      </Button>

                      <Button

                        startIcon={<DeleteIcon />}

                        color="error"

                        variant="contained"

                        onClick={handleDelete}

                        disabled={submitting}

                        sx={{ fontWeight: 600 }}

                      >

                        Delete

                      </Button>

                    </>

                  )}

                </Box>

              ) : schedule?.date ? (

                <DetailHeroAside

                  label="Return slot"

                  primary={formatScheduleSlot(schedule.date, schedule.time)}

                  secondary={schedule.slotNo > 0 ? `Slot ${schedule.slotNo}` : undefined}

                />

              ) : undefined

            }

          />



          {(() => {

            const guidance = statusGuidance(item.status, schedule)

            return guidance ? (

              <Alert severity={guidance.severity} sx={{ mb: 3, borderRadius: 2 }}>

                {guidance.message}

              </Alert>

            ) : null

          })()}



          {item.status === 'Approved' && scheduleLoading && (

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>

              <CircularProgress size={22} sx={{ color: primaryDark }} />

              <Typography variant="body2" color="text.secondary">

                Loading return schedule…

              </Typography>

            </Box>

          )}



          {item.status === 'Approved' && schedule?.status === 'WaitingSchedule' && (

            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>

              The depot is assigning a return date, time slot, and trucker. You will be notified when the

              schedule is set.

            </Alert>

          )}



          {(schedule?.status === 'Confirmed' || schedule?.status === 'Completed') && (

            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>

              {LOGICTECK_QR.readyAlert}

            </Alert>

          )}



          {actionError && (

            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setActionError('')}>

              {actionError}

            </Alert>

          )}



          {(qrLoading || qrBooking) && (

            <DetailSection title={LOGICTECK_QR.sectionTitle} icon={<QrCode2OutlinedIcon sx={{ color: primaryDark }} />}>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>

                {LOGICTECK_QR.scheduleSectionHint}

              </Typography>



              {qrLoading ? (

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>

                  <CircularProgress size={24} sx={{ color: primaryDark }} />

                  <Typography variant="body2" color="text.secondary">

                    Loading QR code…

                  </Typography>

                </Box>

              ) : qrBooking && schedule ? (

                <Box

                  sx={{

                    display: 'grid',

                    gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' },

                    gap: 2,

                    alignItems: 'start',

                  }}

                >

                  {qrImageUrl && (

                    <Box

                      component="img"

                      src={qrImageUrl}

                      alt={`QR code ${qrBooking.qrCode}`}

                      sx={{

                        width: { xs: '100%', sm: 200 },

                        maxWidth: 200,

                        height: 'auto',

                        borderRadius: 2,

                        border: '1px solid',

                        borderColor: 'divider',

                        bgcolor: '#fff',

                        p: 1,

                      }}

                    />

                  )}

                  <Box sx={{ minWidth: 0 }}>

                    <Box sx={infoGridSx}>

                      <InfoTile label="Pre-advice" value={item.referenceNo} mono />

                      <InfoTile label={LOGICTECK_QR.bookingIdLabel} value={qrBooking.qrCode} mono />

                      <InfoTile label="Generated" value={formatDateTime(qrBooking.generatedAt)} />

                      <InfoTile label="Container" value={qrBooking.payload.containerNo} mono />

                      <InfoTile

                        label="Return slot"

                        value={formatScheduleSlot(qrBooking.payload.scheduleDate, qrBooking.payload.scheduleTime)}

                      />

                      <InfoTile label="Trucker" value={qrBooking.payload.trucker} />

                      <InfoTile

                        label={LOGICTECK_QR.validationStatusLabel}

                        value={

                          <Chip

                            label={qrLookupStatusLabel(qrBooking.isUsed)}

                            size="small"

                            color={qrBooking.isUsed ? 'default' : 'success'}

                            sx={{ fontWeight: 600 }}

                          />

                        }

                      />

                    </Box>

                    <Button

                      variant="outlined"

                      startIcon={<DownloadIcon />}

                      onClick={downloadQr}

                      sx={{ fontWeight: 600, borderRadius: 2, mt: 2 }}

                    >

                      Download QR

                    </Button>

                  </Box>

                </Box>

              ) : null}

            </DetailSection>

          )}



          {editing && lookups ? (

            <DetailSection title="Edit pre-advice" icon={<EditIcon sx={{ color: primaryDark }} />}>

              <PreAdviceForm

                lookups={lookups}

                initial={{

                  shippingLineId: item.shippingLineId,

                  containerId: item.containerId,

                  remarks: item.remarks ?? '',

                }}

                onSubmit={handleUpdate}

                onCancel={() => setEditing(false)}

                submitting={submitting}

              />

            </DetailSection>

          ) : (

            <DetailSection title="Request details" icon={<DescriptionOutlinedIcon sx={{ color: primaryDark }} />}>

              <Box sx={infoGridSx}>

                <InfoTile label="Broker" value={item.brokerName} />

                <InfoTile label="Shipping line" value={item.shippingLineName} />

                <InfoTile

                  label="Container"

                  value={`${item.containerNo} (${item.containerSize}' ${item.containerType})`}

                  mono

                />

                {schedule && <InfoTile label="Depot (CY)" value={schedule.depotName} />}

                {schedule?.date && (

                  <InfoTile label="Return schedule" value={formatScheduleSlot(schedule.date, schedule.time)} />

                )}

                {schedule && schedule.slotNo > 0 && (

                  <InfoTile label="Slot" value={`Slot ${schedule.slotNo}`} />

                )}

                {schedule?.truckerName && (

                  <InfoTile label="Assigned trucker" value={schedule.truckerName} />

                )}

                {schedule && (

                  <InfoTile

                    label="Schedule status"

                    value={

                      <Chip

                        label={scheduleStatusLabel[schedule.status] ?? schedule.status}

                        size="small"

                        color={scheduleStatusColor[schedule.status] ?? 'default'}

                        sx={{ fontWeight: 600 }}

                      />

                    }

                  />

                )}

                <InfoTile label="Submitted" value={formatDateTime(item.createdAt)} />

                <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>

                  <InfoTile label="Broker remarks" value={item.remarks || '—'} />

                </Box>

              </Box>

            </DetailSection>

          )}



          <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0 }}>

            <ContainerIdentityPhotos

              preAdviceId={preAdviceId}

              documents={documents}

              loading={documentsLoading}

              canManage={canManageDocuments}

              onChange={loadDocuments}

              error={photoError}

              onError={setPhotoError}

            />

          </Paper>

        </>

      ) : null}



      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>

        <DialogTitle sx={{ fontWeight: 700 }}>Cancel pre-advice request</DialogTitle>

        <DialogContent>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>

            This will mark the request as cancelled. It cannot be resumed after cancellation.

          </Typography>

          <TextField

            fullWidth

            label="Reason (optional)"

            value={cancelReason}

            onChange={(e) => setCancelReason(e.target.value)}

            multiline

            minRows={2}

          />

        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>

          <Button onClick={() => setCancelOpen(false)} disabled={submitting}>

            Keep request

          </Button>

          <Button color="warning" variant="contained" onClick={handleCancel} disabled={submitting}>

            Cancel request

          </Button>

        </DialogActions>

      </Dialog>

    </Box>

  )

}


