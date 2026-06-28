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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'
import CancelIcon from '@mui/icons-material/Cancel'
import DeleteIcon from '@mui/icons-material/Delete'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import EditIcon from '@mui/icons-material/Edit'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import SendIcon from '@mui/icons-material/Send'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PreAdviceDetailTabPanels, {
  type PreAdviceDetailTab,
} from '../../components/preAdvice/PreAdviceDetailTabPanels'
import EvaluationProgressStrip, {
  buildPreAdviceProgressSteps,
} from '../../components/evaluations/EvaluationProgressStrip'
import BookingQrPreviewDialog from '../../components/qr/BookingQrPreviewDialog'
import {
  DetailBackButton,
  DetailErrorState,
  DetailHero,
  DetailHeroAside,
  DetailLoadingState,
  ICS_PRIMARY,
  PhotoProgressChip,
  TimezoneChip,
  detailTabsSx,
  hexToRgba,
  heroMutedChipSx,
  sectionPaperSx,
} from '../../components/layout/DetailPagePrimitives'
import { CONTAINER_PHOTO_CATEGORIES } from '../../config/containerPhotoCategories'
import { LOGICTECK_QR, qrLookupStatusColor, qrLookupStatusLabel, qrLogicteckStatusFromPreAdvice } from '../../config/logicteckQr'
import { isPreAdviceManager } from '../../config/roleConfig'
import {
  paymentApi,
  preAdviceApi,
  qrApi,
  scheduleApi,
  type Payment,
  type PreAdvice,
  type PreAdviceDocument,
  type PreAdviceLookups,
  type QrBooking,
  type Schedule,
} from '../../services/api'
import { store } from '../../store'
import { useAppSelector } from '../../store/hooks'
import { formatScheduleSlot } from '../../utils/datetime'
import { applyBookLogicteckResult, bookLogicteckBooking, canBookLogicteck } from '../../utils/logicteckBooking'
import { formatContainerSizeLabel } from '../../utils/containerSize'

const primaryDark = ICS_PRIMARY
const PENDING_STATUSES = ['Submitted', 'UnderEvaluation']

const statusLabel: Record<string, string> = {
  UnderEvaluation: 'Under evaluation',
  ForCompliance: 'For compliance',
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
    case 'ForCompliance':
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
  complianceRemarks?: string | null,
): { severity: 'info' | 'success' | 'warning' | 'error'; message: string } | null {
  switch (status) {
    case 'Draft':
      return {
        severity: 'info',
        message:
          'This request is still a draft. Add container identity photos for each view, then submit for evaluation.',
      }
    case 'Submitted':
      return {
        severity: 'info',
        message: 'Submitted and waiting for a shipping-line evaluator to review this request.',
      }
    case 'UnderEvaluation':
      return {
        severity: 'warning',
        message:
          'A shipping-line evaluator is reviewing this request. You can still cancel while evaluation is in progress.',
      }
    case 'Approved':
      return {
        severity: 'success',
        message:
          schedule?.status === 'Confirmed' || schedule?.status === 'Completed'
            ? 'Return schedule is confirmed. Pre-advice stays Approved in ICS — send data to LOGICTECK to create the return booking there (LOGICTECK status: Ready to send → Booked on LOGICTECK → Retrieved).'
            : schedule?.status === 'Scheduled'
              ? 'Return schedule assigned. The trucker has been notified and can upload payment proof.'
              : 'Approved. The depot will assign a return schedule and notify the assigned trucker.',
      }
    case 'Rejected':
      return {
        severity: 'error',
        message: 'This request was rejected. Create a new pre-advice if you need to resubmit.',
      }
    case 'ForCompliance':
      return {
        severity: 'warning',
        message: complianceRemarks
          ? `Corrections required: ${complianceRemarks} Update photos or request details, then resubmit for evaluation.`
          : 'Corrections required by the evaluator. Update photos or request details, then resubmit for evaluation.',
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
  const [searchParams] = useSearchParams()
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
  const [submitOpen, setSubmitOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [documents, setDocuments] = useState<PreAdviceDocument[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [qrBooking, setQrBooking] = useState<QrBooking | null>(null)
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false)
  const [bookLogicteckLoading, setBookLogicteckLoading] = useState(false)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [activeTab, setActiveTab] = useState<PreAdviceDetailTab>('details')

  const handleDocumentsChange = useCallback((next: PreAdviceDocument[]) => {
    setDocuments(next)
  }, [])

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
    setPayment(null)
    scheduleApi
      .getByPreAdvice(preAdviceId)
      .then(async ({ data }) => {
        if (!data) {
          setSchedule(null)
          setPayment(null)
          return
        }
        setSchedule(data)
        if (data.truckerId) {
          try {
            const { data: paymentData } = await paymentApi.getBySchedule(data.id)
            setPayment(paymentData)
          } catch {
            setPayment(null)
          }
        } else {
          setPayment(null)
        }
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
      setPayment(null)
    }
  }, [item?.status, loadSchedule])

  useEffect(() => {
    return () => {
      if (qrImageUrl) URL.revokeObjectURL(qrImageUrl)
    }
  }, [qrImageUrl])

  useEffect(() => {
    if (isPreAdviceManager(user?.role)) {
      preAdviceApi
        .lookups()
        .then(({ data }) => setLookups(data))
        .catch(() => {})
    }
  }, [user?.role])

  useEffect(() => {
    if (!item) return
    const tab = searchParams.get('tab')
    if (tab === 'qr' && item.status === 'Approved') {
      setActiveTab('qr')
      return
    }
    if (tab === 'overview') {
      setActiveTab('overview')
      return
    }
    if (tab === 'details') {
      setActiveTab('details')
      return
    }
    if (tab === 'photos') {
      setActiveTab('photos')
      return
    }
    if (tab === 'schedule' && item.status === 'Approved') {
      setActiveTab('schedule')
      return
    }
    if (item.status === 'Draft' || item.status === 'ForCompliance') setActiveTab('photos')
    else if (PENDING_STATUSES.includes(item.status)) setActiveTab('overview')
    else setActiveTab('overview')
  }, [item?.id, item?.status, schedule?.status, searchParams])

  const photoProgress = useMemo(() => {
    const uploaded = CONTAINER_PHOTO_CATEGORIES.filter((c) =>
      documents.some((d) => d.category === c.value),
    ).length
    return { uploaded, total: CONTAINER_PHOTO_CATEGORIES.length }
  }, [documents])

  const missingPhotoLabels = useMemo(
    () =>
      CONTAINER_PHOTO_CATEGORIES.filter(
        (c) => !documents.some((d) => d.category === c.value),
      ).map((c) => c.label),
    [documents],
  )

  const photosComplete = missingPhotoLabels.length === 0

  const openQrPreview = useCallback(() => {
    setActiveTab('qr')
    setQrPreviewOpen(true)
  }, [])

  const progressSteps = useMemo(() => {
    if (!item) return []
    return buildPreAdviceProgressSteps(
      item,
      schedule,
      scheduleLoading,
      qrBooking,
      qrLoading,
      openQrPreview,
      () => setActiveTab('photos'),
    )
  }, [item, schedule, scheduleLoading, qrBooking, qrLoading, openQrPreview])

  const guidance = useMemo(() => {
    if (!item) return null
    if (item.status === 'Draft' && !photosComplete) {
      return {
        severity: 'warning' as const,
        message: `Upload all ${photoProgress.total} container identity photos before submitting (${photoProgress.uploaded}/${photoProgress.total} complete). Missing: ${missingPhotoLabels.join(', ')}.`,
      }
    }
    if (item.status === 'ForCompliance' && !photosComplete) {
      return {
        severity: 'warning' as const,
        message: `Upload all ${photoProgress.total} container identity photos before resubmitting (${photoProgress.uploaded}/${photoProgress.total} complete). Missing: ${missingPhotoLabels.join(', ')}.`,
      }
    }
    return statusGuidance(item.status, schedule, item.complianceRemarks)
  }, [item, schedule, photosComplete, photoProgress, missingPhotoLabels])

  if (!isPreAdviceManager(user?.role)) {
    return <Navigate to="/" replace />
  }

  if (!preAdviceId || Number.isNaN(preAdviceId)) {
    return <Navigate to="/preadvice" replace />
  }

  const isDraft = item?.status === 'Draft'
  const isForCompliance = item?.status === 'ForCompliance'
  const canCancel = item?.status === 'Submitted' || item?.status === 'UnderEvaluation'
  const canManageDocuments =
    item?.status === 'Draft' || item?.status === 'Submitted' || isForCompliance
  const showHeroActions = !editing && (canCancel || isDraft || isForCompliance)

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
    setActionError('')
    try {
      const result = await bookLogicteckBooking(qrBooking.id)
      if (result.success) {
        setQrBooking(applyBookLogicteckResult(qrBooking, result))
      } else {
        setActionError(result.message)
      }
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Could not send pre-advice data to LOGICTECK.'))
    } finally {
      setBookLogicteckLoading(false)
    }
  }

  const logicteckHeroStatus = qrBooking
    ? qrLookupStatusLabel(qrBooking)
    : qrLogicteckStatusFromPreAdvice(item ?? {})

  const handleUpdate = async (values: {
    shippingLineId: number
    containerNo: string
    containerSizeId: number
    containerTypeId: number
    remarks?: string
  }) => {
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
    if (!item || !photosComplete) return
    setSubmitting(true)
    setActionError('')
    try {
      const { data } = await preAdviceApi.submit(item.id)
      setItem(data)
      setSubmitOpen(false)
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

  const startEditing = () => {
    setActiveTab('details')
    setEditing(true)
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
            subtitle={`${item.shippingLineName} · ${item.containerNo} · ${formatContainerSizeLabel(item.containerSize)} · ${item.containerType}`}
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
                {(item.hasQrBooking || qrBooking) && logicteckHeroStatus && (
                  <Chip
                    icon={
                      <QrCode2OutlinedIcon sx={{ fontSize: '16px !important', color: 'inherit !important' }} />
                    }
                    label={`LOGICTECK · ${logicteckHeroStatus}`}
                    size="small"
                    color={qrLookupStatusColor(logicteckHeroStatus)}
                    sx={{ fontWeight: 700, '& .MuiChip-icon': { color: 'inherit' } }}
                  />
                )}
                {(item.hasQrBooking || qrBooking) && (item.qrCode || qrBooking?.qrCode) && (
                  <Chip
                    label={item.qrCode ?? qrBooking?.qrCode ?? 'QR ready'}
                    size="small"
                    sx={{ ...heroMutedChipSx, fontFamily: 'monospace', fontWeight: 600 }}
                  />
                )}
                <Chip
                  icon={
                    <LocalShippingOutlinedIcon sx={{ fontSize: '16px !important', color: 'inherit !important' }} />
                  }
                  label={`Trucker · ${item.truckerName}`}
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
                        onClick={startEditing}
                        sx={{
                          color: '#fff',
                          borderColor: 'rgba(255,255,255,0.45)',
                          fontWeight: 600,
                          '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                        }}
                      >
                        Edit
                      </Button>
                      <Tooltip
                        title={
                          photosComplete
                            ? ''
                            : `Upload all ${photoProgress.total} container identity photos before submitting (${photoProgress.uploaded}/${photoProgress.total})`
                        }
                      >
                        <span>
                          <Button
                            startIcon={<SendIcon />}
                            variant="contained"
                            onClick={() => {
                              setActionError('')
                              setSubmitOpen(true)
                            }}
                            disabled={submitting || !photosComplete}
                            sx={{
                              bgcolor: '#fff',
                              color: primaryDark,
                              fontWeight: 700,
                              '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
                            }}
                          >
                            Submit
                          </Button>
                        </span>
                      </Tooltip>
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
                  {isForCompliance && (
                    <>
                      <Button
                        startIcon={<EditIcon />}
                        variant="outlined"
                        onClick={startEditing}
                        sx={{
                          color: '#fff',
                          borderColor: 'rgba(255,255,255,0.45)',
                          fontWeight: 600,
                          '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                        }}
                      >
                        Edit
                      </Button>
                      <Tooltip
                        title={
                          photosComplete
                            ? ''
                            : `Upload all ${photoProgress.total} container identity photos before resubmitting (${photoProgress.uploaded}/${photoProgress.total})`
                        }
                      >
                        <span>
                          <Button
                            startIcon={<SendIcon />}
                            variant="contained"
                            onClick={() => {
                              setActionError('')
                              setSubmitOpen(true)
                            }}
                            disabled={submitting || !photosComplete}
                            sx={{
                              bgcolor: '#fff',
                              color: primaryDark,
                              fontWeight: 700,
                              '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
                            }}
                          >
                            Resubmit
                          </Button>
                        </span>
                      </Tooltip>
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

          <EvaluationProgressStrip steps={progressSteps} />

          <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0 }}>
            <Tabs
              value={activeTab}
              onChange={(_, value: PreAdviceDetailTab) => setActiveTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={detailTabsSx}
            >
              <Tab label="Full overview" value="overview" />
              <Tab label="Request details" value="details" />
              <Tab
                label={`Container identity photos (${photoProgress.uploaded}/${photoProgress.total})`}
                value="photos"
              />
              {!isDraft && !isForCompliance && (
                <>
                  <Tab label="Return schedule" value="schedule" />
                  <Tab label={LOGICTECK_QR.tabLabel} value="qr" />
                </>
              )}
            </Tabs>

            <PreAdviceDetailTabPanels
              activeTab={activeTab}
              item={item}
              preAdviceId={preAdviceId}
              documents={documents}
              documentsLoading={documentsLoading}
              canManageDocuments={canManageDocuments}
              photoError={photoError}
              onPhotoError={setPhotoError}
              editing={editing}
              lookups={lookups}
              submitting={submitting}
              statusGuidance={guidance}
              actionError={actionError}
              onDismissActionError={() => setActionError('')}
              schedule={schedule}
              scheduleLoading={scheduleLoading}
              qrBooking={qrBooking}
              qrImageUrl={qrImageUrl}
              qrLoading={qrLoading}
              onReloadDocuments={loadDocuments}
              onDocumentsChange={handleDocumentsChange}
              onUpdate={handleUpdate}
              onCancelEdit={() => setEditing(false)}
              onDownloadQr={downloadQr}
              onQrPreview={openQrPreview}
              onBookLogicteck={qrBooking && canBookLogicteck(qrBooking) ? handleBookLogicteck : undefined}
              bookLogicteckLoading={bookLogicteckLoading}
            />
          </Paper>
        </>
      ) : null}

      <BookingQrPreviewDialog
        open={qrPreviewOpen}
        onClose={() => setQrPreviewOpen(false)}
        schedule={schedule}
        qrBooking={qrBooking}
        qrImageUrl={qrImageUrl}
        payment={payment}
        onDownload={downloadQr}
        onBookLogicteck={qrBooking && canBookLogicteck(qrBooking) ? handleBookLogicteck : undefined}
        bookLogicteckLoading={bookLogicteckLoading}
      />

      <Dialog
        open={submitOpen}
        onClose={() => {
          setSubmitOpen(false)
          setActionError('')
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isForCompliance ? 'Resubmit pre-advice for evaluation' : 'Submit pre-advice for evaluation'}
        </DialogTitle>
        <DialogContent>
          {item && (
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
                {item.referenceNo}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.containerNo} · {item.shippingLineName}
              </Typography>
            </Paper>
          )}
          {isForCompliance && item?.complianceRemarks && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              Evaluator instructions: {item.complianceRemarks}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isForCompliance
              ? 'This will send your corrected pre-advice back to the shipping-line evaluator for another review.'
              : 'This will send the pre-advice to a shipping-line evaluator. You will not be able to edit container details after submission, but you can still cancel while evaluation is in progress.'}
          </Typography>
          <Alert severity="success" sx={{ mb: actionError ? 2 : 0, borderRadius: 2 }}>
            All {photoProgress.total} container identity photos are uploaded and ready for review.
          </Alert>
          {actionError && submitOpen && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {actionError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSubmitOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={submitting || !photosComplete}
            startIcon={<SendIcon />}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {isForCompliance ? 'Resubmit for evaluation' : 'Submit for evaluation'}
          </Button>
        </DialogActions>
      </Dialog>

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
