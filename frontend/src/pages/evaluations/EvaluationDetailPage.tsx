import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import EvaluationDetailTabPanels, {
  type EvaluationDetailTab,
} from '../../components/evaluations/EvaluationDetailTabPanels'
import EvaluationProgressStrip, {
  buildEvaluationProgressSteps,
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
import { LOGICTECK_QR } from '../../config/logicteckQr'
import {
  depotApi,
  evaluationApi,
  paymentApi,
  preAdviceApi,
  qrApi,
  scheduleApi,
  type Depot,
  type Evaluation,
  type Payment,
  type PreAdvice,
  type PreAdviceDocument,
  type QrBooking,
  type Schedule,
} from '../../services/api'
import { store } from '../../store'
import { useAppSelector } from '../../store/hooks'
import { formatScheduleSlot } from '../../utils/datetime'

const primaryDark = ICS_PRIMARY
const PENDING_STATUSES = ['Submitted', 'UnderEvaluation']

const statusLabel: Record<string, string> = {
  UnderEvaluation: 'Under evaluation',
}

const scheduleStatusLabel: Record<string, string> = {
  WaitingSchedule: 'Waiting schedule',
}

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

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

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

export default function EvaluationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const preAdviceId = Number(id)

  const [item, setItem] = useState<PreAdvice | null>(null)
  const [documents, setDocuments] = useState<PreAdviceDocument[]>([])
  const [decision, setDecision] = useState<Evaluation | null>(null)
  const [depots, setDepots] = useState<Depot[]>([])
  const [loading, setLoading] = useState(true)
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [error, setError] = useState('')

  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [depotId, setDepotId] = useState<number | ''>('')
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [qrBooking, setQrBooking] = useState<QrBooking | null>(null)
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [activeTab, setActiveTab] = useState<EvaluationDetailTab>('details')

  const allowedRole = user?.role === 'ShippingLineEvaluator' || user?.role === 'Administrator'

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
    Promise.all([preAdviceApi.get(preAdviceId), evaluationApi.list(), depotApi.list()])
      .then(([preAdviceRes, evalRes, depotRes]) => {
        setItem(preAdviceRes.data)
        setDecision(evalRes.data.find((e) => e.preAdviceId === preAdviceId) ?? null)
        setDepots(depotRes.data)
        setDepotId(depotRes.data[0]?.id ?? '')
      })
      .catch(() => setError('Pre-advice request not found or not accessible.'))
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
        setSchedule(data)
        if (data.truckerId) {
          const { data: paymentData } = await paymentApi.getBySchedule(data.id)
          setPayment(paymentData)
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
    if (!item) return
    if (PENDING_STATUSES.includes(item.status)) setActiveTab('photos')
    else if (schedule?.status === 'Confirmed' || schedule?.status === 'Completed') setActiveTab('qr')
    else if (item.status === 'Approved') setActiveTab('schedule')
  }, [item?.id, item?.status, schedule?.status])

  const photoProgress = useMemo(() => {
    const uploaded = CONTAINER_PHOTO_CATEGORIES.filter((c) =>
      documents.some((d) => d.category === c.value),
    ).length
    return { uploaded, total: CONTAINER_PHOTO_CATEGORIES.length }
  }, [documents])

  const openQrPreview = useCallback(() => {
    setActiveTab('qr')
    setQrPreviewOpen(true)
  }, [])

  const progressSteps = useMemo(() => {
    if (!item) return []
    return buildEvaluationProgressSteps(
      item,
      decision,
      schedule,
      scheduleLoading,
      qrBooking,
      qrLoading,
      openQrPreview,
      () => setActiveTab('photos'),
    )
  }, [item, decision, schedule, scheduleLoading, qrBooking, qrLoading, openQrPreview])

  if (!allowedRole) {
    return <Navigate to="/" replace />
  }

  if (!preAdviceId || Number.isNaN(preAdviceId)) {
    return <Navigate to="/evaluations" replace />
  }

  const canDecide = item && PENDING_STATUSES.includes(item.status)

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

  const handleApprove = async () => {
    if (!item || depotId === '') {
      setActionError('Please select a container yard (CY).')
      return
    }
    setSubmitting(true)
    setActionError('')
    try {
      await evaluationApi.approve({
        preAdviceId: item.id,
        depotId: Number(depotId),
        remarks: remarks || undefined,
      })
      setApproveOpen(false)
      navigate('/evaluations')
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Approval failed.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!item || !remarks.trim()) {
      setActionError('Rejection remarks are required.')
      return
    }
    setSubmitting(true)
    setActionError('')
    try {
      await evaluationApi.reject({ preAdviceId: item.id, remarks: remarks.trim() })
      setRejectOpen(false)
      navigate('/evaluations')
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Rejection failed.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      <DetailBackButton to="/evaluations" label="Back to evaluations" />

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
                  icon={
                    <LocalShippingOutlinedIcon sx={{ fontSize: '16px !important', color: 'inherit !important' }} />
                  }
                  label={item.brokerName}
                  size="small"
                  sx={{ ...heroMutedChipSx, '& .MuiChip-icon': { color: 'inherit' } }}
                />
                <PhotoProgressChip uploaded={photoProgress.uploaded} total={photoProgress.total} />
                <TimezoneChip />
              </>
            }
            aside={
              canDecide ? (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>
                  <Button
                    startIcon={<CancelIcon />}
                    variant="outlined"
                    onClick={() => {
                      setRemarks('')
                      setActionError('')
                      setRejectOpen(true)
                    }}
                    sx={{
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.45)',
                      fontWeight: 600,
                      '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    startIcon={<CheckCircleIcon />}
                    variant="contained"
                    onClick={() => {
                      setRemarks('')
                      setActionError('')
                      setApproveOpen(true)
                    }}
                    sx={{
                      bgcolor: '#fff',
                      color: primaryDark,
                      fontWeight: 700,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
                    }}
                  >
                    Approve
                  </Button>
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
              onChange={(_, value: EvaluationDetailTab) => setActiveTab(value)}
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
              <Tab label="Return schedule" value="schedule" />
              <Tab label={LOGICTECK_QR.tabLabel} value="qr" />
            </Tabs>

            <EvaluationDetailTabPanels
              activeTab={activeTab}
              item={item}
              preAdviceId={preAdviceId}
              documents={documents}
              documentsLoading={documentsLoading}
              decision={decision}
              schedule={schedule}
              scheduleLoading={scheduleLoading}
              qrBooking={qrBooking}
              qrImageUrl={qrImageUrl}
              qrLoading={qrLoading}
              onReloadDocuments={loadDocuments}
              onDownloadQr={downloadQr}
              onQrPreview={openQrPreview}
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
      />

      <Dialog open={approveOpen} onClose={() => setApproveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Approve pre-advice</DialogTitle>
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
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {actionError}
            </Alert>
          )}
          <FormControl fullWidth margin="normal" required sx={fieldSx}>
            <InputLabel>Container yard (CY)</InputLabel>
            <Select
              label="Container yard (CY)"
              value={depotId}
              onChange={(e) => setDepotId(e.target.value as number)}
            >
              {depots.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name} — {d.address} (cap. {d.capacity})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Remarks (optional)"
            margin="normal"
            multiline
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setApproveOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={submitting}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Approve & assign CY
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Reject pre-advice</DialogTitle>
        <DialogContent>
          {item && (
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                mb: 2,
                borderRadius: 2,
                bgcolor: 'rgba(211, 47, 47, 0.04)',
                border: '1px solid',
                borderColor: 'rgba(211, 47, 47, 0.15)',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {item.referenceNo}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.containerNo}
              </Typography>
            </Paper>
          )}
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {actionError}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Rejection remarks"
            margin="normal"
            multiline
            rows={3}
            required
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            helperText="Explain why this request is rejected."
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={submitting}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Reject request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
