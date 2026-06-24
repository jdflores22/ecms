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
  userApi,
  type Payment,
  type PreAdvice,
  type PreAdviceDocument,
  type QrBooking,
  type Schedule,
  type SlotAvailability,
  type UserListItem,
} from '../../services/api'
import { store } from '../../store'
import { resolveAssetUrl } from '../../utils/assetUrl'
import { formatScheduleDate, formatScheduleSlot, formatScheduleTime, SYSTEM_TIMEZONE, clampMinScheduleDate, isBeforeToday, todayIsoDate } from '../../utils/datetime'
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
  const [truckers, setTruckers] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [error, setError] = useState('')

  const [date, setDate] = useState('')
  const [time, setTime] = useState('08:00')
  const [slotNo, setSlotNo] = useState(1)
  const [truckerId, setTruckerId] = useState<number | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [slotInfo, setSlotInfo] = useState<SlotAvailability | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)
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
    Promise.all([scheduleApi.get(scheduleId), userApi.truckers()])
      .then(async ([scheduleRes, truckersRes]) => {
        const item = scheduleRes.data
        setSchedule(item)
        setTruckers(truckersRes.data)
        setDate(clampMinScheduleDate(item.date, minScheduleDate))
        setTime(formatScheduleTime(item.time))
        setSlotNo(item.slotNo > 0 ? item.slotNo : 1)
        setTruckerId(item.truckerId ?? truckersRes.data[0]?.id ?? '')

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

  const loadSlots = useCallback(
    (depotId: number, scheduleDate: string, excludeScheduleId?: number, preferredSlot?: number) => {
      if (!scheduleDate) return
      setSlotsLoading(true)
      scheduleApi
        .slots(depotId, scheduleDate, excludeScheduleId)
        .then(({ data }) => {
          setSlotInfo(data)
          const preferred = preferredSlot ?? 1
          if (!data.slots.some((s) => s.slotNo === preferred && s.available)) {
            const first = data.slots.find((s) => s.available)
            if (first) setSlotNo(first.slotNo)
          } else {
            setSlotNo(preferred)
          }
        })
        .catch(() => setSlotInfo(null))
        .finally(() => setSlotsLoading(false))
    },
    [],
  )

  useEffect(() => {
    if (!schedule || !date || !allowedRole) return
    if (schedule.status === 'Scheduled' && !editing) return
    loadSlots(schedule.depotId, date, schedule.id, slotNo)
  }, [date, schedule, allowedRole, loadSlots, editing, slotNo])

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

  const availableSlots = slotInfo?.slots.filter((s) => s.available) ?? []

  if (!allowedRole) {
    return <Navigate to="/" replace />
  }

  if (!scheduleId || Number.isNaN(scheduleId)) {
    return <Navigate to="/depot/schedules" replace />
  }

  const handleSave = async () => {
    if (!schedule || truckerId === '') {
      setActionError('Please select a trucker.')
      return
    }
    if (!date || isBeforeToday(date)) {
      setActionError('Return date cannot be in the past.')
      return
    }
    setSubmitting(true)
    setActionError('')
    try {
      await scheduleApi.update(schedule.id, {
        date,
        time: `${time}:00`,
        slotNo,
        status: 'Scheduled',
        truckerId: Number(truckerId),
      })
      setSaveSuccess(true)
      window.setTimeout(() => {
        navigate('/depot/schedules', {
          state: {
            message: `${schedule.referenceNo} scheduled successfully. Broker and trucker have been notified.`,
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
    if (!schedule || truckerId === '') {
      setActionError('Please select a trucker.')
      return
    }
    if (!date || isBeforeToday(date)) {
      setActionError('Return date cannot be in the past.')
      return
    }
    if (availableSlots.length === 0) {
      setActionError('No slots available for the selected date.')
      return
    }
    setConfirmOpen(true)
  }

  const cancelEdit = () => {
    if (!schedule) return
    setDate(clampMinScheduleDate(schedule.date, minScheduleDate))
    setTime(formatScheduleTime(schedule.time))
    setSlotNo(schedule.slotNo > 0 ? schedule.slotNo : 1)
    setTruckerId(schedule.truckerId ?? truckers[0]?.id ?? '')
    setActionError('')
    setEditing(false)
  }

  const showAssignForm = canAssign && (schedule?.status === 'WaitingSchedule' || editing)
  const showScheduledSummary = canAssign && schedule?.status === 'Scheduled' && !editing

  const selectedTrucker = truckers.find((t) => t.id === truckerId)

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
                    {schedule.truckerName && (
                      <Chip
                        icon={<LocalShippingOutlinedIcon sx={{ fontSize: '16px !important', color: 'inherit !important' }} />}
                        label={schedule.truckerName}
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
                    Return slot
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {formatScheduleSlot(schedule.date, schedule.time)}
                  </Typography>
                  {schedule.slotNo > 0 && (
                    <Typography variant="body2" sx={{ opacity: 0.88 }}>
                      Slot {schedule.slotNo}
                    </Typography>
                  )}
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
              This return is waiting for depot assignment. Set date, time, slot, and trucker in the
              Schedule assignment tab.
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
              slotNo={slotNo}
              truckerId={truckerId}
              truckers={truckers}
              slotInfo={slotInfo}
              slotsLoading={slotsLoading}
              availableSlots={availableSlots}
              minScheduleDate={minScheduleDate}
              actionError={actionError}
              submitting={submitting}
              onReloadDocuments={() => loadDocuments(preAdvice.id)}
              onProofPreview={() => setProofPreviewOpen(true)}
              onDownloadQr={downloadQr}
              onEditSchedule={() => setEditing(true)}
              onDateChange={setDate}
              onTimeChange={setTime}
              onSlotChange={setSlotNo}
              onTruckerChange={setTruckerId}
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
                Saving schedule and notifying broker & trucker…
              </Typography>
            </Box>
          ) : saveSuccess ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              Schedule saved successfully. Broker and trucker have been notified. Returning to the schedule
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
                The broker and assigned trucker will be notified. Please confirm the return details below.
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
                <Typography sx={{ fontWeight: 600 }}>
                  {formatScheduleTime(`${time}:00`)} {SYSTEM_TIMEZONE.label}
                </Typography>
                <Typography color="text.secondary">Slot</Typography>
                <Typography sx={{ fontWeight: 600 }}>Slot {slotNo}</Typography>
                <Typography color="text.secondary">Trucker</Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {selectedTrucker ? `${selectedTrucker.fullName} (${selectedTrucker.username})` : '—'}
                </Typography>
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
