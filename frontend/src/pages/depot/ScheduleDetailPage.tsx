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
  type Payment,
  type PreAdvice,
  type PreAdviceDocument,
  type QrBooking,
  type Schedule,
} from '../../services/api'
import { store } from '../../store'
import { resolveAssetUrl } from '../../utils/assetUrl'
import {
  formatScheduleDate,
  formatScheduleSlot,
  formatScheduleTime,
  isBeforeToday,
  isValidTime24,
  normalizeTime24Input,
  SYSTEM_TIMEZONE,
  clampMinScheduleDate,
  todayIsoDate,
} from '../../utils/datetime'
import { useAppSelector } from '../../store/hooks'

const primaryDark = '#0B3D91'

const statusLabel: Record<string, string> = {
  WaitingSchedule: 'Waiting schedule',
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
    case 'Cancelled':
      return { bgcolor: 'rgba(158, 158, 158, 0.92)', color: '#fff' }
    default:
      return { bgcolor: 'rgba(255,255,255,0.95)', color: primaryDark }
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
  const [time, setTime] = useState('08:00')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<DepotScheduleTab>('details')

  const allowedRole = user?.role === 'DepotPersonnel' || user?.role === 'Administrator'

  const minScheduleDate = todayIsoDate()

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
        setDate(clampMinScheduleDate(item.date, minScheduleDate))
        setTime(formatScheduleTime(item.time))

        const [paymentResult, preAdviceRes] = await Promise.all([
          paymentApi.getBySchedule(scheduleId).catch(() => null),
          preAdviceApi.get(item.preAdviceId),
        ])
        setPayment(paymentResult?.data ?? null)
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
      .catch(() => setError('Schedule not found or not accessible.'))
      .finally(() => setLoading(false))
  }, [scheduleId, loadDocuments, minScheduleDate])

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
    else if (payment?.status === 'ForVerification') setActiveTab('payment')
  }, [schedule?.id, schedule?.status, payment?.status])

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
    if (!date || isBeforeToday(date)) {
      setActionError('Return date cannot be in the past.')
      return
    }
    const normalizedTime = normalizeTime24Input(time)
    if (!isValidTime24(normalizedTime)) {
      setActionError('Enter a valid time in 24-hour format (HH:mm).')
      return
    }
    setSubmitting(true)
    setActionError('')
    try {
      await scheduleApi.update(schedule.id, {
        date,
        time: `${normalizedTime}:00`,
        slotNo: 0,
        status: 'Scheduled',
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
    if (!date || isBeforeToday(date)) {
      setActionError('Return date cannot be in the past.')
      return
    }
    if (!isValidTime24(normalizeTime24Input(time))) {
      setActionError('Enter a valid time in 24-hour format (HH:mm).')
      return
    }
    setConfirmOpen(true)
  }

  const cancelEdit = () => {
    if (!schedule) return
    setDate(clampMinScheduleDate(schedule.date, minScheduleDate))
    setTime(formatScheduleTime(schedule.time))
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
          '&:hover': { color: primaryDark, bgcolor: hexToRgba(primaryDark, 0.06) },
        }}
      >
        Back to schedules
      </Button>

      {loading ? (
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            py: 12,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
          }}
        >
          <CircularProgress sx={{ color: primaryDark }} />
        </Paper>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : schedule && preAdvice ? (
        <>
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
                right: -40,
                top: -40,
                width: 160,
                height: 160,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.06)',
              }}
            />
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', md: 'center' },
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
                  <EventNoteOutlinedIcon />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', sm: '1.75rem' }, wordBreak: 'break-all' }}
                  >
                    {schedule.referenceNo}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.88 }}>
                    {schedule.depotName} · {preAdvice.containerNo} ({preAdvice.containerSize}&apos; {preAdvice.containerType})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.25 }}>
                    <Chip
                      label={statusLabel[schedule.status] ?? schedule.status}
                      size="small"
                      sx={{ fontWeight: 700, ...heroStatusChipStyle(schedule.status) }}
                    />
                    {requestingTrucker && (
                      <Chip
                        icon={<LocalShippingOutlinedIcon sx={{ fontSize: '16px !important', color: 'inherit !important' }} />}
                        label={requestingTrucker}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.12)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontWeight: 600,
                          '& .MuiChip-icon': { color: 'inherit' },
                        }}
                      />
                    )}
                    <Chip
                      label={`${photoProgress.uploaded}/${photoProgress.total} photos`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.12)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontWeight: 600,
                      }}
                    />
                    <Chip
                      label={SYSTEM_TIMEZONE.labelLong}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.12)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              {schedule.status !== 'WaitingSchedule' && schedule.date && (
                <Box sx={{ flexShrink: 0, textAlign: { xs: 'left', md: 'right' } }}>
                  <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                    Return date & time
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {formatScheduleSlot(schedule.date, schedule.time)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

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
              This return is waiting for depot assignment. Set the return date and time in the Schedule
              assignment tab.
            </Alert>
          )}

          {payment?.status === 'ForVerification' && (
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
                label={`Container identity photos (${photoProgress.uploaded}/${photoProgress.total})`}
                value="photos"
              />
              <Tab label="Schedule assignment" value="schedule" />
              <Tab label="Payment" value="payment" />
              <Tab label={LOGICTECK_QR.tabLabel} value="qr" />
            </Tabs>

            <DepotScheduleTabPanels
              activeTab={activeTab}
              schedule={schedule}
              preAdvice={preAdvice}
              documents={documents}
              documentsLoading={documentsLoading}
              payment={payment}
              showPaymentSection={Boolean(showPaymentSection)}
              qrBooking={qrBooking}
              qrImageUrl={qrImageUrl}
              qrLoading={qrLoading}
              canAssign={Boolean(canAssign)}
              showAssignForm={Boolean(showAssignForm)}
              showScheduledSummary={Boolean(showScheduledSummary)}
              editing={editing}
              date={date}
              time={time}
              minScheduleDate={minScheduleDate}
              actionError={actionError}
              submitting={submitting}
              onReloadDocuments={() => loadDocuments(preAdvice.id)}
              onProofPreview={() => setProofPreviewOpen(true)}
              onDownloadQr={downloadQr}
              onEditSchedule={() => setEditing(true)}
              onDateChange={setDate}
              onTimeChange={setTime}
              onCancelEdit={cancelEdit}
              onOpenConfirm={openConfirm}
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
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
              <CircularProgress size={40} sx={{ color: primaryDark }} />
              <Typography color="text.secondary" align="center">
                Saving schedule and notifying trucker…
              </Typography>
            </Box>
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
                    bgcolor: hexToRgba(primaryDark, 0.04),
                    border: '1px solid',
                    borderColor: hexToRgba(primaryDark, 0.1),
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
                <Typography color="text.secondary">Date</Typography>
                <Typography sx={{ fontWeight: 600 }}>{formatScheduleDate(date)}</Typography>
                <Typography color="text.secondary">Time</Typography>
                <Typography sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {formatScheduleTime(`${normalizeTime24Input(time)}:00`)} {SYSTEM_TIMEZONE.label}
                </Typography>
                <Typography color="text.secondary">Requesting trucker</Typography>
                <Typography sx={{ fontWeight: 600 }}>{requestingTrucker ?? '—'}</Typography>
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
                <Box
                  component="img"
                  src={resolveAssetUrl(payment.proofFile)}
                  alt="Payment proof"
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
                  href={resolveAssetUrl(payment.proofFile)}
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
              href={resolveAssetUrl(payment.proofFile)}
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
