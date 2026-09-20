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
  FormHelperText,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams, Link as RouterLink } from 'react-router-dom'
import EvaluationDetailTabPanels, {
  type EvaluationDetailTab,
} from '../../components/evaluations/EvaluationDetailTabPanels'
import EvaluationProgressStrip, {
  buildEvaluationProgressSteps,
} from '../../components/evaluations/EvaluationProgressStrip'
import DamageReportChip from '../../components/evaluations/DamageReportChip'
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
  heroMutedChipSx,
  sectionPaperSx,
} from '../../components/layout/DetailPagePrimitives'
import { listMobileActionsSx } from '../../components/layout/ListPagePrimitives'
import { CONTAINER_PHOTO_CATEGORIES } from '../../config/containerPhotoCategories'
import { LOGICTECK_QR } from '../../config/logicteckQr'
import {
  depotApi,
  cyAllocationApi,
  evaluationApi,
  paymentApi,
  preAdviceApi,
  qrApi,
  scheduleApi,
  shippingLineCyFillApi,
  type CyAllocation,
  type CyAllocationForApproval,
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
import { formatContainerSizeLabel } from '../../utils/containerSize'
import { formatCySizeOptionLabel } from '../../utils/cyAllocation'
import PreAdviceCroEdoContextPanel from '../../components/preAdvice/PreAdviceCroEdoContextPanel'

const primaryDark = ICS_PRIMARY
const PENDING_STATUSES = ['Submitted', 'UnderEvaluation']

const statusLabel: Record<string, string> = {
  UnderEvaluation: 'Under evaluation',
  ForCompliance: 'For compliance',
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
    case 'ForCompliance':
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
    case 'NoShow':
      return { bgcolor: 'rgba(198, 40, 40, 0.92)', color: '#fff' }
    default:
      return { bgcolor: 'rgba(255,255,255,0.95)', color: primaryDark }
  }
}

function sortAllocationsByRecommended(allocations: CyAllocation[], depotIdsInOrder: number[]) {
  const rank = new Map(depotIdsInOrder.map((id, index) => [id, index]))
  return [...allocations].sort(
    (a, b) => (rank.get(a.depotId) ?? 9999) - (rank.get(b.depotId) ?? 9999),
  )
}

function resolveDemurrageValidUntil(item: PreAdvice): string | null {
  return item.croEdoContext?.demurrageValidUntil ?? item.demurrageValidUntil ?? null
}

function isLegacyManualPreAdvice(item: PreAdvice): boolean {
  return item.croEdoContext?.linkType === 'LegacyUpload'
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
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
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [complianceOpen, setComplianceOpen] = useState(false)
  const [depotId, setDepotId] = useState<number | ''>('')
  const [remarks, setRemarks] = useState('')
  const [recommendedDepotIds, setRecommendedDepotIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [qrBooking, setQrBooking] = useState<QrBooking | null>(null)
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [activeTab, setActiveTab] = useState<EvaluationDetailTab>('overview')
  const tabContextRef = useRef<{ id: number; status: string } | null>(null)
  const [approvalAllocations, setApprovalAllocations] = useState<CyAllocationForApproval | null>(null)
  const [allocationsLoading, setAllocationsLoading] = useState(false)
  const [approvalDemurrageUntil, setApprovalDemurrageUntil] = useState('')

  const isAdmin = user?.role === 'Administrator'
  const isEvaluatorReadOnly = user?.role === 'ShippingLineEvaluator'
  const allowedRole = isAdmin || isEvaluatorReadOnly

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
    Promise.all([preAdviceApi.get(preAdviceId), evaluationApi.getByPreAdvice(preAdviceId), depotApi.list()])
      .then(([preAdviceRes, evalRes, depotRes]) => {
        setItem(preAdviceRes.data)
        setDecision(evalRes.data)
        setDepots(depotRes.data)
        setDepotId(depotRes.data[0]?.id ?? '')
      })
      .catch(() => setError('Pre-forecast request not found or not accessible.'))
      .finally(() => setLoading(false))
  }, [preAdviceId])

  useEffect(() => {
    if (!approveOpen || !item) {
      setApprovalAllocations(null)
      return
    }
    setAllocationsLoading(true)
    const recommendedPromise = item.shippingLineId
      ? shippingLineCyFillApi.recommended(item.shippingLineId)
      : Promise.resolve({ data: { depotIdsInOrder: [] as number[] } })

    Promise.all([cyAllocationApi.forApproval(item.id), recommendedPromise])
      .then(([allocationRes, recommendedRes]) => {
        const order = recommendedRes.data.depotIdsInOrder ?? []
        setRecommendedDepotIds(order)
        const sorted = sortAllocationsByRecommended(allocationRes.data.allocations, order)
        const data = { ...allocationRes.data, allocations: sorted }
        setApprovalAllocations(data)

        const croDepotId = item.croEdoContext?.returnEmptyToDepotId
        const recommendedFirst = order
          .map((id) => sorted.find((a) => a.depotId === id && a.hasCapacity))
          .find(Boolean)
        const croDepotMatch =
          croDepotId != null
            ? sorted.find((a) => a.depotId === croDepotId && a.hasCapacity)
            : undefined
        const firstFit = recommendedFirst ?? croDepotMatch ?? sorted.find((a) => a.hasCapacity)
        setDepotId(firstFit?.depotId ?? sorted[0]?.depotId ?? '')
      })
      .catch(() => {
        setApprovalAllocations(null)
        setRecommendedDepotIds([])
      })
      .finally(() => setAllocationsLoading(false))
  }, [approveOpen, item])

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

    const tab = searchParams.get('tab') as EvaluationDetailTab | null
    const showScheduleTabs = item.status === 'Approved'
    const allowed: EvaluationDetailTab[] = ['overview', 'details', 'photos']
    if (showScheduleTabs) allowed.push('schedule', 'qr')

    const contextChanged =
      tabContextRef.current?.id !== item.id || tabContextRef.current?.status !== item.status

    if (contextChanged) {
      tabContextRef.current = { id: item.id, status: item.status }
      if (tab && allowed.includes(tab)) {
        setActiveTab(tab)
      } else if (PENDING_STATUSES.includes(item.status)) {
        setActiveTab('photos')
      } else {
        setActiveTab('overview')
      }
      return
    }

    if (tab && allowed.includes(tab)) {
      setActiveTab(tab)
    }
  }, [item?.id, item?.status, searchParams])

  const showScheduleTabs = item?.status === 'Approved'

  const handleTabChange = (_: React.SyntheticEvent, value: EvaluationDetailTab) => {
    setActiveTab(value)
    if (value === 'overview') {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ tab: value }, { replace: true })
    }
  }

  const openScheduleTab = useCallback(() => {
    setActiveTab('schedule')
    setSearchParams({ tab: 'schedule' }, { replace: true })
  }, [setSearchParams])

  const openPhotosTab = useCallback(() => {
    setActiveTab('photos')
    setSearchParams({ tab: 'photos' }, { replace: true })
  }, [setSearchParams])

  const photoProgress = useMemo(() => {
    const uploaded = CONTAINER_PHOTO_CATEGORIES.filter((c) =>
      documents.some((d) => d.category === c.value),
    ).length
    return { uploaded, total: CONTAINER_PHOTO_CATEGORIES.length }
  }, [documents])

  const openQrPreview = useCallback(() => {
    setActiveTab('qr')
    setSearchParams({ tab: 'qr' }, { replace: true })
    setQrPreviewOpen(true)
  }, [setSearchParams])

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
      openPhotosTab,
      openScheduleTab,
    )
  }, [
    item,
    decision,
    schedule,
    scheduleLoading,
    qrBooking,
    qrLoading,
    openQrPreview,
    openPhotosTab,
    openScheduleTab,
  ])

  if (!allowedRole) {
    return <Navigate to="/" replace />
  }

  if (!preAdviceId || Number.isNaN(preAdviceId)) {
    return <Navigate to="/evaluations" replace />
  }

  const canDecide = isAdmin && item && PENDING_STATUSES.includes(item.status)
  const demurrageFromCro = item ? resolveDemurrageValidUntil(item) : null
  const legacyManualPreAdvice = item ? isLegacyManualPreAdvice(item) : false
  const demurrageForApproval =
    demurrageFromCro ?? (approvalDemurrageUntil.trim() ? approvalDemurrageUntil.trim() : null)

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
    const effectiveDemurrage = demurrageFromCro ?? approvalDemurrageUntil.trim()
    if (!effectiveDemurrage) {
      setActionError(
        legacyManualPreAdvice
          ? 'Enter demurrage free-time validity from the trucker’s uploaded legacy CRO/eDO.'
          : 'Demurrage free-time validity must be set before approval.',
      )
      return
    }
    if (!demurrageFromCro && effectiveDemurrage < todayIsoDate()) {
      setActionError('Demurrage validity date cannot be in the past.')
      return
    }
    setSubmitting(true)
    setActionError('')
    try {
      await evaluationApi.approve({
        preAdviceId: item.id,
        depotId: Number(depotId),
        remarks: remarks || undefined,
        ...(!demurrageFromCro ? { demurrageValidUntil: effectiveDemurrage } : {}),
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

  const handleReturnForCompliance = async () => {
    if (!item || !remarks.trim()) {
      setActionError('Compliance instructions are required.')
      return
    }
    setSubmitting(true)
    setActionError('')
    try {
      await evaluationApi.returnForCompliance({ preAdviceId: item.id, remarks: remarks.trim() })
      setComplianceOpen(false)
      navigate('/evaluations')
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to return for compliance.'))
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
            subtitle={`${item.shippingLineName} · ${item.containerNo} · ${formatContainerSizeLabel(item.containerSize)} · ${item.containerType}`}
            chips={
              <>
                {item.hasDamageReport && <DamageReportChip />}
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
                  label={`Trucker · ${item.truckerName}`}
                  size="small"
                  sx={{ ...heroMutedChipSx, '& .MuiChip-icon': { color: 'inherit' } }}
                />
                <PhotoProgressChip uploaded={photoProgress.uploaded} total={photoProgress.total} />
                {item.demurrageValidUntil && (
                  <Chip
                    label={`Demurrage valid until ${item.demurrageValidUntil}`}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      bgcolor:
                        item.demurrageValidUntil < new Date().toISOString().slice(0, 10)
                          ? 'rgba(198, 40, 40, 0.92)'
                          : 'rgba(255,255,255,0.95)',
                      color:
                        item.demurrageValidUntil < new Date().toISOString().slice(0, 10) ? '#fff' : primaryDark,
                    }}
                  />
                )}
                <TimezoneChip />
              </>
            }
            aside={
              canDecide ? (
                <Box sx={{ ...listMobileActionsSx, mt: 0, flexShrink: 0 }}>
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
                    startIcon={<AssignmentReturnIcon />}
                    variant="outlined"
                    onClick={() => {
                      setRemarks('')
                      setActionError('')
                      setComplianceOpen(true)
                    }}
                    sx={{
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.45)',
                      fontWeight: 600,
                      '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    Return for compliance
                  </Button>
                  <Button
                    startIcon={<CheckCircleIcon />}
                    variant="contained"
                    onClick={() => {
                      setRemarks('')
                      setActionError('')
                      setApprovalDemurrageUntil(item?.demurrageValidUntil ?? '')
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
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={detailTabsSx}
            >
              <Tab label="Full overview" value="overview" />
              {showScheduleTabs ? <Tab label="Return schedule" value="schedule" /> : null}
              {showScheduleTabs ? <Tab label={LOGICTECK_QR.tabLabel} value="qr" /> : null}
              <Tab label="Request details" value="details" />
              <Tab
                label={`Container identity photos (${photoProgress.uploaded}/${photoProgress.total})`}
                value="photos"
              />
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
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Approve pre-forecast</DialogTitle>
        <DialogContent dividers sx={{ px: 2.5, py: 2 }}>
          <Stack spacing={2}>
            {item && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {item.referenceNo}
                  <Typography component="span" variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {' '}
                    · {item.containerNo} · {item.shippingLineName}
                  </Typography>
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <PreAdviceCroEdoContextPanel item={item} documents={documents} dialog />
                </Box>
              </Box>
            )}

            {actionError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {actionError}
              </Alert>
            )}

            <Stack spacing={1.5}>
              {demurrageFromCro ? (
                <TextField
                  fullWidth
                  size="small"
                  label="Demurrage valid until"
                  value={demurrageFromCro}
                  disabled
                  sx={fieldSx}
                />
              ) : (
                <TextField
                  fullWidth
                  size="small"
                  required
                  label="Demurrage valid until"
                  type="date"
                  value={approvalDemurrageUntil}
                  onChange={(e) => setApprovalDemurrageUntil(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayIsoDate() } }}
                  helperText={
                    legacyManualPreAdvice
                      ? 'Read this date from the uploaded legacy CRO/eDO above.'
                      : 'Enter free-time end date from the CRO/eDO.'
                  }
                  sx={fieldSx}
                />
              )}

              <FormControl fullWidth size="small" required sx={fieldSx} disabled={allocationsLoading}>
                <InputLabel>Container yard (CY)</InputLabel>
                <Select
                  label="Container yard (CY)"
                  value={depotId}
                  onChange={(e) => setDepotId(e.target.value as number)}
                >
                  {approvalAllocations?.allocations.length
                    ? approvalAllocations.allocations.map((row) => {
                        const isRecommended =
                          recommendedDepotIds.length > 0 && row.depotId === recommendedDepotIds[0]
                        const label = formatCySizeOptionLabel(
                          row.depotName,
                          row,
                          approvalAllocations.containerSize,
                          row.hasCapacity,
                        )
                        return (
                          <MenuItem key={row.depotId} value={row.depotId} disabled={!row.hasCapacity}>
                            {isRecommended ? `${label} · Recommended` : label}
                          </MenuItem>
                        )
                      })
                    : depots.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.name} — {d.address}
                        </MenuItem>
                      ))}
                </Select>
                <FormHelperText>
                  {approvalAllocations && item ? (
                    <>
                      Yards ordered by shipping line fill priority.{' '}
                      <Link
                        component={RouterLink}
                        to={`/evaluations/cy-allocation?preAdviceId=${item.id}`}
                        underline="hover"
                      >
                        View allocation
                      </Link>
                      {item.croEdoContext?.returnEmptyToName ? '. ' : ''}
                    </>
                  ) : null}
                  {item?.croEdoContext?.returnEmptyToName
                    ? `Prefer CY matching CRO return: ${item.croEdoContext.returnEmptyToName}.`
                    : null}
                </FormHelperText>
              </FormControl>

              <TextField
                fullWidth
                size="small"
                label="Remarks (optional)"
                multiline
                minRows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                sx={fieldSx}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setApproveOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={submitting || !demurrageForApproval || depotId === ''}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Approve & assign CY
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Reject pre-forecast</DialogTitle>
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

      <Dialog open={complianceOpen} onClose={() => setComplianceOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Return for compliance</DialogTitle>
        <DialogContent>
          {item && (
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                mb: 2,
                borderRadius: 2,
                bgcolor: 'rgba(237, 108, 2, 0.06)',
                border: '1px solid',
                borderColor: 'rgba(237, 108, 2, 0.2)',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {item.referenceNo}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.containerNo} · The trucker can fix issues and resubmit
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
            label="Compliance instructions"
            margin="normal"
            multiline
            rows={4}
            required
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            helperText="Describe what the trucker must correct (photos, container details, etc.)."
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setComplianceOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleReturnForCompliance}
            disabled={submitting}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Return for compliance
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
