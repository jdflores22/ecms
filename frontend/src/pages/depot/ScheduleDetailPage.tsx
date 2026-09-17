import {
  DetailHero,
  DetailHeroAside,
  DetailLoadingState,
  TimezoneChip,
  heroMutedChipSx,
} from '../../components/layout/DetailPagePrimitives'
import { ICS_PRIMARY } from '../../theme/colors'
import { DialogBusySkeleton } from '../../components/layout/SkeletonPrimitives'
import AssetImage from '../../components/layout/AssetImage'
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate, useParams } from 'react-router-dom'
import DepotScheduleTabPanels, { type DepotScheduleTab } from '../../components/depot/DepotScheduleTabPanels'
import { detailTabsSx, sectionPaperSx } from '../../components/layout/DetailPagePrimitives'
import { LOGICTECK_QR } from '../../config/logicteckQr'
import { CONTAINER_PHOTO_CATEGORIES } from '../../config/containerPhotoCategories'
import {
  paymentApi,
  preAdviceApi,
  qrApi,
  scheduleApi,
  type HourlySlotAvailability,
  type Payment,
  type PreAdvice,
  type PreAdviceDocument,
  type QrBooking,
  type Schedule,
} from '../../services/api'
import { store } from '../../store'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import {
  clampScheduleDateToBounds,
  formatArrivalWindow,
  formatScheduleDate,
  formatScheduleTime,
  formatScheduleTimeHundreds,
  getDepotScheduleDateBounds,
  hourlyOptionToApiTime,
  isLegacyDateOnlyTime,
  normalizeTime24Input,
  validateDepotScheduleDate,
} from '../../utils/datetime'
import { formatContainerSummary } from '../../utils/containerSize'
import { scheduleStatusLabel } from '../../utils/scheduleStatus'
import { useAppSelector } from '../../store/hooks'


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

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function heroStatusChipStyle(status: string): { bgcolor: string; color: string } {
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
      return { bgcolor: 'rgba(255,255,255,0.95)', color: ICS_PRIMARY }
  }
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

export default function ScheduleDetailPage() {
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
  const [loading, setLoading] = useState(true)
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [error, setError] = useState('')

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [hourlySlots, setHourlySlots] = useState<HourlySlotAvailability | null>(null)
  const [hourlySlotsLoading, setHourlySlotsLoading] = useState(false)
  const [depotRemarks, setDepotRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<DepotScheduleTab>('details')
  const proofFileUrl = useAssetUrl(payment?.proofFile)

  const allowedRole = user?.role === 'DepotPersonnel' || user?.role === 'Administrator'
  const isDepotView = user?.role === 'DepotPersonnel'

  const scheduleDateBounds = useMemo(
    () =>
      getDepotScheduleDateBounds(
        preAdvice?.demurrageValidUntil,
        preAdvice?.evaluatedAt,
      ),
    [preAdvice?.demurrageValidUntil, preAdvice?.evaluatedAt],
  )

  const loadDocuments = useCallback((preAdviceId: number) => {
    setDocumentsLoading(true)
    preAdviceApi
      .documents(preAdviceId)
      .then(({ data }) => setDocuments(data))
      .catch(() => setDocuments([]))
      .finally(() => setDocumentsLoading(false))
  }, [])

  const load = useCallback(() => {
    if (!scheduleId) return
    setLoading(true)
    setError('')
    setQrBooking(null)
    setQrImageUrl(null)
    Promise.all([scheduleApi.get(scheduleId)])
      .then(async ([scheduleRes]) => {
        const item = scheduleRes.data
        setSchedule(item)

        const [paymentResult, preAdviceRes] = await Promise.all([
          paymentApi.getBySchedule(scheduleId).catch(() => null),
          preAdviceApi.get(item.preAdviceId),
        ])
        setPayment(paymentResult?.data ?? null)
        setPreAdvice(preAdviceRes.data)
        const bounds = getDepotScheduleDateBounds(
          preAdviceRes.data.demurrageValidUntil,
          preAdviceRes.data.evaluatedAt,
        )
        setDate(clampScheduleDateToBounds(item.date, bounds.minDate, bounds.maxDate))
        const savedTime = isLegacyDateOnlyTime(item.time)
          ? ''
          : normalizeTime24Input(formatScheduleTime(item.time))
        setTime(savedTime)
        setDepotRemarks(item.depotRemarks ?? '')
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
      .catch(() => setError('Schedule not found or not accessible.'))
      .finally(() => setLoading(false))
  }, [scheduleId, loadDocuments])

  useEffect(() => {
    if (!preAdvice) return
    setDate((current) =>
      clampScheduleDateToBounds(current, scheduleDateBounds.minDate, scheduleDateBounds.maxDate),
    )
  }, [preAdvice?.id, scheduleDateBounds.minDate, scheduleDateBounds.maxDate])

  const loadHourlySlots = useCallback(() => {
    if (!schedule || !date) return
    setHourlySlotsLoading(true)
    scheduleApi
      .hourlySlots(schedule.depotId, date, schedule.id)
      .then(({ data }) => setHourlySlots(data))
      .catch(() => setHourlySlots(null))
      .finally(() => setHourlySlotsLoading(false))
  }, [schedule, date])

  useEffect(() => {
    loadHourlySlots()
  }, [loadHourlySlots])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    return () => {
      if (qrImageUrl) URL.revokeObjectURL(qrImageUrl)
    }
  }, [qrImageUrl])

  useEffect(() => {
    if (!schedule) return
    setEditing(schedule.status === 'WaitingSchedule')
  }, [schedule?.id, schedule?.status])

  useEffect(() => {
    if (!schedule) return
    if (schedule.status === 'WaitingSchedule') setActiveTab('schedule')
    else if (!isDepotView && payment?.status === 'ForVerification') setActiveTab('payment')
  }, [schedule?.id, schedule?.status, payment?.status, isDepotView])

  useEffect(() => {
    if (!isDepotView) return
    if (activeTab === 'payment' || activeTab === 'qr') {
      setActiveTab('schedule')
    }
  }, [isDepotView, activeTab])

  const photoProgress = useMemo(() => {
    const uploaded = CONTAINER_PHOTO_CATEGORIES.filter((c) =>
      documents.some((d) => d.category === c.value),
    ).length
    return { uploaded, total: CONTAINER_PHOTO_CATEGORIES.length }
  }, [documents])

  const canAssign =
    schedule &&
    allowedRole &&
    (schedule.status === 'WaitingSchedule' || schedule.status === 'Scheduled')

  if (!allowedRole) {
    return <Navigate to="/" replace />
  }

  if (!scheduleId || Number.isNaN(scheduleId)) {
    return <Navigate to="/depot/schedules" replace />
  }

  const handleSave = async () => {
    if (!schedule) return
    const validationError = validateDepotScheduleDate(date, scheduleDateBounds)
    if (validationError) {
      setActionError(validationError)
      return
    }
    if (!time) {
      setActionError('Choose a return time slot (0800–1700).')
      return
    }
    setSubmitting(true)
    setActionError('')
    try {
      await scheduleApi.update(schedule.id, {
        date,
        time: hourlyOptionToApiTime(time),
        slotNo: 0,
        status: 'Scheduled',
        depotRemarks: depotRemarks.trim() || null,
      })
      setSaveSuccess(true)
      window.setTimeout(() => {
        navigate('/depot/schedules', {
          state: {
            message: `${schedule.referenceNo} scheduled successfully. Trucker has been notified.`,
          },
        })
      }, 1500)
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to update schedule.'))
    } finally {
      setSubmitting(false)
    }
  }

  const openConfirm = () => {
    setActionError('')
    setSaveSuccess(false)
    if (!schedule) return
    const validationError = validateDepotScheduleDate(date, scheduleDateBounds)
    if (validationError) {
      setActionError(validationError)
      return
    }
    if (!time) {
      setActionError('Choose a return time slot (0800–1700).')
      return
    }
    setConfirmOpen(true)
  }

  const cancelEdit = () => {
    if (!schedule) return
    setDate(clampScheduleDateToBounds(schedule.date, scheduleDateBounds.minDate, scheduleDateBounds.maxDate))
    setTime(
      isLegacyDateOnlyTime(schedule.time)
        ? ''
        : normalizeTime24Input(formatScheduleTime(schedule.time)),
    )
    setDepotRemarks(schedule.depotRemarks ?? '')
    setActionError('')
    setEditing(false)
  }

  const showAssignForm = canAssign && (schedule?.status === 'WaitingSchedule' || editing)
  const showScheduledSummary = canAssign && schedule?.status === 'Scheduled' && !editing

  const requestingTrucker = schedule?.truckerName ?? preAdvice?.truckerName

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

  const showPaymentSection =
    payment &&
    (payment.proofFile || payment.status === 'ForVerification' || payment.status === 'Paid' || payment.status === 'Rejected')

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/depot/schedules"
        startIcon={<ArrowBackIcon />}
        sx={{
          mb: 2,
          color: 'text.secondary',
          fontWeight: 600,
          '&:hover': { color: ICS_PRIMARY, bgcolor: hexToRgba(ICS_PRIMARY, 0.06) },
        }}
      >
        Back to schedules
      </Button>

      {loading ? (
        <DetailLoadingState />
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : schedule && preAdvice ? (
        <>
          <DetailHero
            icon={<EventNoteOutlinedIcon />}
            title={schedule.referenceNo}
            subtitle={
              <>
                {schedule.depotName} ·{' '}
                {formatContainerSummary(
                  preAdvice.containerNo,
                  preAdvice.containerSize,
                  preAdvice.containerType,
                )}
              </>
            }
            chips={
              <>
                <Chip
                  label={scheduleStatusLabel(schedule.status)}
                  size="small"
                  sx={{ fontWeight: 700, ...heroStatusChipStyle(schedule.status) }}
                />
                {requestingTrucker && (
                  <Chip
                    icon={
                      <LocalShippingOutlinedIcon sx={{ fontSize: '16px !important', color: 'inherit !important' }} />
                    }
                    label={requestingTrucker}
                    size="small"
                    sx={{ ...heroMutedChipSx, fontWeight: 600, '& .MuiChip-icon': { color: 'inherit' } }}
                  />
                )}
                <Chip
                  label={`${photoProgress.uploaded}/${photoProgress.total} photos`}
                  size="small"
                  onClick={() => setActiveTab('photos')}
                  sx={{ ...heroMutedChipSx, fontWeight: 600, cursor: 'pointer' }}
                />
                <TimezoneChip />
              </>
            }
            aside={
              schedule.status !== 'WaitingSchedule' && schedule.date ? (
                <DetailHeroAside label="Return date" primary={formatScheduleDate(schedule.date)} />
              ) : undefined
            }
          />

          {schedule.status === 'WaitingSchedule' && (
            <Alert
              severity="warning"
              sx={{ mb: 3, borderRadius: 2 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setActiveTab('schedule')}
                  sx={{ fontWeight: 600 }}
                >
                  Assign schedule
                </Button>
              }
            >
              This return is waiting for depot assignment. Set the return date in the Schedule assignment tab.
            </Alert>
          )}

          {payment?.status === 'ForVerification' && !isDepotView && (
            <Alert
              severity="warning"
              sx={{ mb: 3, borderRadius: 2 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setActiveTab('payment')}
                  sx={{ fontWeight: 600 }}
                >
                  Review payment
                </Button>
              }
            >
              Payment proof uploaded and awaiting depot verification.
            </Alert>
          )}

          <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0 }}>
            <Tabs
              value={activeTab}
              onChange={(_, value: DepotScheduleTab) => setActiveTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={detailTabsSx}
            >
              <Tab label="Request details" value="details" />
              <Tab
                label={`Container photos (${photoProgress.uploaded}/${photoProgress.total})`}
                value="photos"
              />
              <Tab label="Schedule assignment" value="schedule" />
              {!isDepotView && <Tab label="Payment" value="payment" />}
              {!isDepotView && <Tab label={LOGICTECK_QR.tabLabel} value="qr" />}
            </Tabs>

            <DepotScheduleTabPanels
              activeTab={activeTab}
              depotView={isDepotView}
              schedule={schedule}
              preAdvice={preAdvice}
              documents={documents}
              documentsLoading={documentsLoading}
              payment={payment}
              showPaymentSection={Boolean(showPaymentSection)}
              canVerifyPayment={user?.role === 'Administrator'}
              qrBooking={qrBooking}
              qrImageUrl={qrImageUrl}
              qrLoading={qrLoading}
              canAssign={Boolean(canAssign)}
              showAssignForm={Boolean(showAssignForm)}
              showScheduledSummary={Boolean(showScheduledSummary)}
              editing={editing}
              date={date}
              time={time}
              hourlySlots={hourlySlots}
              hourlySlotsLoading={hourlySlotsLoading}
              depotRemarks={depotRemarks}
              scheduleDateBounds={scheduleDateBounds}
              actionError={actionError}
              submitting={submitting}
              onReloadDocuments={() => loadDocuments(preAdvice.id)}
              onProofPreview={() => setProofPreviewOpen(true)}
              onDownloadQr={downloadQr}
              onEditSchedule={() => setEditing(true)}
              onDateChange={setDate}
              onTimeChange={setTime}
              onDepotRemarksChange={setDepotRemarks}
              onCancelEdit={cancelEdit}
              onOpenConfirm={openConfirm}
              onOpenPhotosTab={() => setActiveTab('photos')}
            />
          </Paper>
        </>
      ) : null}

      <Dialog
        open={confirmOpen}
        onClose={() => !submitting && !saveSuccess && setConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {saveSuccess
            ? 'Schedule saved'
            : schedule?.status === 'WaitingSchedule'
              ? 'Confirm schedule assignment'
              : 'Confirm schedule update'}
        </DialogTitle>
        <DialogContent>
          {submitting ? (
            <DialogBusySkeleton message="Saving schedule and notifying trucker…" />
          ) : saveSuccess ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              Schedule saved successfully. Trucker has been notified. Returning to the schedule
              list…
            </Alert>
          ) : (
            <>
              {schedule && preAdvice && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    mb: 2,
                    borderRadius: 2,
                    bgcolor: hexToRgba(ICS_PRIMARY, 0.04),
                    border: '1px solid',
                    borderColor: hexToRgba(ICS_PRIMARY, 0.1),
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {schedule.referenceNo}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {preAdvice.containerNo} · {schedule.depotName}
                  </Typography>
                </Paper>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                The assigned trucker will be notified. Please confirm the return details below.
              </Typography>

              {actionError && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {actionError}
                </Alert>
              )}

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: 1,
                  rowGap: 1.25,
                  typography: 'body2',
                }}
              >
                <Typography color="text.secondary">Return date</Typography>
                <Typography sx={{ fontWeight: 600 }}>{formatScheduleDate(date)}</Typography>
                <Typography color="text.secondary">Return time</Typography>
                <Typography sx={{ fontWeight: 600 }}>{formatScheduleTimeHundreds(hourlyOptionToApiTime(time))}</Typography>
                <Typography color="text.secondary">Arrival window</Typography>
                <Typography sx={{ fontWeight: 600 }}>{formatArrivalWindow(date, hourlyOptionToApiTime(time))}</Typography>
                <Typography color="text.secondary">Requesting trucker</Typography>
                <Typography sx={{ fontWeight: 600 }}>{requestingTrucker ?? '—'}</Typography>
                {depotRemarks.trim() && (
                  <>
                    <Typography color="text.secondary">Depot remarks</Typography>
                    <Typography sx={{ fontWeight: 600, whiteSpace: 'pre-wrap' }}>{depotRemarks.trim()}</Typography>
                  </>
                )}
              </Box>
            </>
          )}
        </DialogContent>
        {!submitting && !saveSuccess && (
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={submitting}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Confirm & notify
            </Button>
          </DialogActions>
        )}
      </Dialog>

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
    </Box>
  )
}
