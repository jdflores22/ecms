import {
  Alert,
  Box,
  Button,
  Badge,
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
import {
  listHeroOutlineActionSx,
  listHeroPrimaryActionSx,
  listMobileActionsSx,
} from '../../components/layout/ListPagePrimitives'
import { CONTAINER_PHOTO_CATEGORIES } from '../../config/containerPhotoCategories'
import { LOGICTECK_QR } from '../../config/logicteckQr'
import {
  depotApi,
  cyAllocationApi,
  demurrageBillingApi,
  evaluationApi,
  paymentApi,
  preAdviceApi,
  type DemurrageBilling,
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
import { formatDate, formatScheduleSlot } from '../../utils/datetime'
import { formatContainerSizeLabel } from '../../utils/containerSize'
import { formatCySizeOptionLabel } from '../../utils/cyAllocation'
import PreAdviceCroEdoContextPanel from '../../components/preAdvice/PreAdviceCroEdoContextPanel'
import {
  croEdoTabNeedsAttention,
  isEvaluationFreeTimeExpired,
  initialApprovalFreeTimeDate,
  resolveEvaluationFreeTimeDate,
} from '../../utils/evaluationCroEdo'
import { isCroFreeTimeExpired, parseCroFreeTimeToIso } from '../../utils/croFreeTime'
import {
  buildEvaluationRejectCannedRemarks,
  defaultEvaluationRejectRemark,
} from '../../utils/evaluationRejectRemarks'
import {
  demurrageAudienceForRole,
  demurrageBillingDetailPath,
} from '../../utils/demurrageRoutes'

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

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function resolveSelectedDepotName(
  depotId: number | '',
  approvalAllocations: CyAllocationForApproval | null,
  depots: Depot[],
): string {
  if (depotId === '') return '—'
  const id = Number(depotId)
  const fromAlloc = approvalAllocations?.allocations.find((row) => row.depotId === id)
  if (fromAlloc) return fromAlloc.depotName
  return depots.find((d) => d.id === id)?.name ?? `CY #${id}`
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
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false)
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
  const [croFreeTimeDate, setCroFreeTimeDate] = useState('')
  const [croFreeTimeSaving, setCroFreeTimeSaving] = useState(false)
  const [croFreeTimeSaveError, setCroFreeTimeSaveError] = useState('')
  const [detDemBilling, setDetDemBilling] = useState<DemurrageBilling | null>(null)

  const isAdmin = user?.role === 'Administrator'
  const detDemAudience = demurrageAudienceForRole(user?.role)
  const isEvaluatorReadOnly = user?.role === 'ShippingLineEvaluator'
  const allowedRole = isAdmin || isEvaluatorReadOnly

  const loadDetDemBilling = useCallback(() => {
    if (!preAdviceId || !isAdmin) {
      setDetDemBilling(null)
      return
    }
    demurrageBillingApi
      .getByPreAdviceForStaff(preAdviceId)
      .then(({ data }) => setDetDemBilling(data ?? null))
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setDetDemBilling(null)
          return
        }
        setDetDemBilling(null)
      })
  }, [preAdviceId, isAdmin])

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
    loadDetDemBilling()
  }, [load, loadDocuments, loadDetDemBilling])

  useEffect(() => {
    if (!item) return
    const resolved = resolveEvaluationFreeTimeDate(item)
    setCroFreeTimeDate(resolved ?? '')
    setCroFreeTimeSaveError('')
  }, [item?.id, item?.demurrageValidUntil, item?.croEdoContext?.demurrageValidUntil])

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
    const allowed: EvaluationDetailTab[] = ['overview', 'croEdo', 'details', 'photos', 'activity']
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
  const freeTimeIso = item ? resolveEvaluationFreeTimeDate(item) : null
  const croFreeTimeExpired = Boolean(
    item
    && (isEvaluationFreeTimeExpired(item) || isCroFreeTimeExpired(croFreeTimeDate)),
  )
  const detDemPaid = detDemBilling?.status === 'Paid'
  const approvalFreeTimeIso = approvalDemurrageUntil.trim() || null
  const requireFreshFreeTimeOnApprove = Boolean(
    detDemPaid || (freeTimeIso && isCroFreeTimeExpired(freeTimeIso)),
  )

  const openApproveDialog = () => {
    setRemarks('')
    setActionError('')
    const draftIso = parseCroFreeTimeToIso(croFreeTimeDate.trim() || null)
    const needFresh = Boolean(
      detDemBilling?.status === 'Paid' || (freeTimeIso && isCroFreeTimeExpired(freeTimeIso)),
    )
    setApprovalDemurrageUntil(initialApprovalFreeTimeDate(freeTimeIso, draftIso, needFresh))
    setApproveOpen(true)
  }

  const canEditCroFreeTime = Boolean(
    isAdmin
    && item
    && ['Submitted', 'UnderEvaluation', 'ForCompliance'].includes(item.status),
  )
  const detDemBlocksApprove = Boolean(item && croFreeTimeExpired && !detDemPaid)
  const showExpiredRejectAction = Boolean(
    canDecide && croFreeTimeExpired && !detDemBilling,
  )

  const croEdoTabAttention = Boolean(
    item && croEdoTabNeedsAttention(item, croFreeTimeDate, canEditCroFreeTime, detDemPaid),
  )

  const rejectEffectiveFreeTimeIso =
    freeTimeIso ?? parseCroFreeTimeToIso(croFreeTimeDate.trim() || null)
  const rejectFreeTimeExpired = Boolean(
    rejectEffectiveFreeTimeIso && isCroFreeTimeExpired(rejectEffectiveFreeTimeIso),
  )
  const rejectCannedRemarks = item
    ? buildEvaluationRejectCannedRemarks({
        referenceNo: item.referenceNo,
        containerNo: item.containerNo,
        freeTimeIso: rejectEffectiveFreeTimeIso,
        freeTimeExpired: rejectFreeTimeExpired,
      })
    : []

  const beginRejectFlow = () => {
    setRemarks('')
    setActionError('')
    setRejectConfirmOpen(true)
  }

  const closeRejectConfirm = () => {
    if (submitting) return
    setRejectConfirmOpen(false)
  }

  const proceedRejectAfterConfirm = () => {
    setRejectConfirmOpen(false)
    if (item) {
      setRemarks(
        defaultEvaluationRejectRemark({
          referenceNo: item.referenceNo,
          containerNo: item.containerNo,
          freeTimeIso: rejectEffectiveFreeTimeIso,
          freeTimeExpired: rejectFreeTimeExpired,
        }),
      )
    } else {
      setRemarks('')
    }
    setRejectOpen(true)
  }

  const handleSaveCroFreeTime = async () => {
    if (!item || !croFreeTimeDate.trim()) return
    setCroFreeTimeSaving(true)
    setCroFreeTimeSaveError('')
    try {
      await evaluationApi.setCroFreeTime(item.id, croFreeTimeDate.trim())
      const { data } = await preAdviceApi.get(item.id)
      setItem(data)
    } catch (err) {
      setCroFreeTimeSaveError(apiErrorMessage(err, 'Failed to save free time date.'))
    } finally {
      setCroFreeTimeSaving(false)
    }
  }

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

  const validateApproveForm = (): string | null => {
    if (!item || depotId === '') {
      return 'Please select a container yard (CY).'
    }
    if (detDemBlocksApprove) {
      return detDemBilling
        ? 'Waiting for trucker DET-DEM receipt or ICS verification before approval.'
        : 'CRO/eDO free time expired. Reject so the trucker can upload shipping line DET-DEM payment proof.'
    }
    const approvalDate = approvalDemurrageUntil.trim()
    if (!approvalDate) {
      return requireFreshFreeTimeOnApprove
        ? 'Enter a new free time date (today or later) after DET-DEM settlement.'
        : 'Enter the free time date for empty return scheduling.'
    }
    if (approvalDate < todayIsoDate()) {
      return 'Free time date must be today or later.'
    }
    if (freeTimeIso && isCroFreeTimeExpired(freeTimeIso) && approvalDate <= freeTimeIso) {
      return 'Set a new free time date after the previous expired date.'
    }
    return null
  }

  const openApproveConfirm = () => {
    const validationError = validateApproveForm()
    if (validationError) {
      setActionError(validationError)
      return
    }
    setActionError('')
    setApproveConfirmOpen(true)
  }

  const closeApproveFlow = () => {
    if (submitting) return
    setApproveConfirmOpen(false)
    setApproveOpen(false)
  }

  const handleApprove = async () => {
    const validationError = validateApproveForm()
    if (validationError || !item) {
      setActionError(validationError ?? 'Pre-forecast not loaded.')
      setApproveConfirmOpen(false)
      return
    }
    const approvalDate = approvalDemurrageUntil.trim()
    setSubmitting(true)
    setActionError('')
    try {
      await evaluationApi.approve({
        preAdviceId: item.id,
        depotId: Number(depotId),
        demurrageValidUntil: approvalDate,
        remarks: remarks || undefined,
      })
      setApproveConfirmOpen(false)
      setApproveOpen(false)
      navigate('/evaluations')
    } catch (err) {
      setApproveConfirmOpen(false)
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
      const savedIso = resolveEvaluationFreeTimeDate(item)
      if (croFreeTimeDate.trim() && croFreeTimeDate.trim() !== savedIso) {
        await evaluationApi.setCroFreeTime(item.id, croFreeTimeDate.trim())
      }
      await evaluationApi.reject({ preAdviceId: item.id, remarks: remarks.trim() })
      setRejectOpen(false)
      loadDetDemBilling()
      load()
      if (croFreeTimeExpired) {
        setActiveTab('croEdo')
        setSearchParams({ tab: 'croEdo' }, { replace: true })
      } else {
        navigate('/evaluations')
      }
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
                {freeTimeIso && (
                  <Chip
                    label={
                      croFreeTimeExpired
                        ? `Free time expired (${freeTimeIso})`
                        : `Free time until ${freeTimeIso}`
                    }
                    size="small"
                    sx={{
                      fontWeight: 700,
                      bgcolor: croFreeTimeExpired ? 'rgba(198, 40, 40, 0.92)' : 'rgba(255,255,255,0.95)',
                      color: croFreeTimeExpired ? '#fff' : primaryDark,
                    }}
                  />
                )}
                <TimezoneChip />
              </>
            }
            aside={
              canDecide || (isAdmin && detDemBilling) ? (
                <Box sx={{ ...listMobileActionsSx, mt: 0, flexShrink: 0 }}>
                  {canDecide && (
                    <Button
                      startIcon={<CancelIcon />}
                      variant="outlined"
                      color="error"
                      onClick={beginRejectFlow}
                      sx={listHeroOutlineActionSx}
                    >
                      Reject
                    </Button>
                  )}
                  {isAdmin && detDemBilling && (
                    <Button
                      component={RouterLink}
                      to={demurrageBillingDetailPath(detDemBilling.id, detDemAudience)}
                      variant="outlined"
                      sx={listHeroOutlineActionSx}
                    >
                      DET-DEM
                    </Button>
                  )}
                  {canDecide && !croFreeTimeExpired && (
                    <Button
                      startIcon={<AssignmentReturnIcon />}
                      variant="outlined"
                      onClick={() => {
                        setRemarks('')
                        setActionError('')
                        setComplianceOpen(true)
                      }}
                      sx={listHeroOutlineActionSx}
                    >
                      Return for compliance
                    </Button>
                  )}
                  {canDecide && (
                    <Button
                      startIcon={<CheckCircleIcon />}
                      variant="contained"
                      disabled={detDemBlocksApprove}
                      onClick={openApproveDialog}
                      sx={listHeroPrimaryActionSx}
                    >
                      Approve
                    </Button>
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

          {detDemBlocksApprove && (
            <Alert
              severity="error"
              sx={{ mb: 2, borderRadius: 2 }}
              action={
                showExpiredRejectAction ? (
                  <Button color="inherit" size="small" sx={{ fontWeight: 700 }} onClick={beginRejectFlow}>
                    Reject
                  </Button>
                ) : detDemBilling ? (
                  <Button
                    component={RouterLink}
                    size="small"
                    color="inherit"
                    sx={{ fontWeight: 700 }}
                    to={demurrageBillingDetailPath(detDemBilling.id, detDemAudience)}
                  >
                    Open DET-DEM
                  </Button>
                ) : undefined
              }
            >
              {detDemBilling
                ? `CRO/eDO free time expired. DET-DEM ${detDemBilling.referenceNo} is linked — trucker uploads shipping line receipt; approve after ICS verifies.`
                : 'CRO/eDO free time expired. Reject to notify the trucker and link DET-DEM for shipping line payment proof.'}
            </Alert>
          )}

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
              <Tab
                value="croEdo"
                sx={{
                  minWidth: { xs: 132, sm: 152 },
                  ...(croEdoTabAttention && {
                    pr: { xs: 2.75, sm: 3.25 },
                    mr: { xs: 0.5, sm: 0.75 },
                  }),
                }}
                label={
                  <Badge
                    color="error"
                    badgeContent="!"
                    invisible={!croEdoTabAttention}
                    sx={{
                      '& .MuiBadge-badge': {
                        fontWeight: 800,
                        fontSize: '0.65rem',
                        minWidth: 18,
                        height: 18,
                        padding: '0 4px',
                        right: 2,
                        top: 4,
                      },
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-block',
                        pr: croEdoTabAttention ? 2.5 : 0,
                      }}
                    >
                      CRO / eDO
                    </Box>
                  </Badge>
                }
              />
              {showScheduleTabs ? <Tab label="Return schedule" value="schedule" /> : null}
              {showScheduleTabs ? <Tab label={LOGICTECK_QR.tabLabel} value="qr" /> : null}
              <Tab label="Container details" value="details" />
              <Tab
                label={`Container identity photos (${photoProgress.uploaded}/${photoProgress.total})`}
                value="photos"
              />
              <Tab label="Activity log" value="activity" />
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
              croFreeTimeDate={croFreeTimeDate}
              onCroFreeTimeDateChange={setCroFreeTimeDate}
              canEditCroFreeTime={canEditCroFreeTime}
              croFreeTimeSaving={croFreeTimeSaving}
              croFreeTimeSaveError={croFreeTimeSaveError}
              onSaveCroFreeTime={() => void handleSaveCroFreeTime()}
              detDemBilling={detDemBilling}
              detDemDetailPath={
                detDemBilling ? demurrageBillingDetailPath(detDemBilling.id, detDemAudience) : null
              }
              onOpenRejectExpired={beginRejectFlow}
              showExpiredRejectAction={showExpiredRejectAction}
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

      <Dialog open={approveOpen} onClose={closeApproveFlow} maxWidth="sm" fullWidth>
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
              {requireFreshFreeTimeOnApprove && (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  {detDemPaid
                    ? 'DET-DEM is settled. Enter a new CRO/eDO free time date (today or later) for empty return scheduling.'
                    : 'Free time expired. After DET-DEM is verified, enter a new free time date here before approving.'}
                </Alert>
              )}
              {freeTimeIso && isCroFreeTimeExpired(freeTimeIso) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Previous free time expired: {formatDate(freeTimeIso)}
                </Typography>
              )}
              {freeTimeIso && !isCroFreeTimeExpired(freeTimeIso) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Current saved free time: {formatDate(freeTimeIso)} — confirm or update below.
                </Typography>
              )}
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Free time valid until"
                required
                value={approvalDemurrageUntil}
                onChange={(e) => setApprovalDemurrageUntil(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: todayIsoDate() },
                }}
                sx={fieldSx}
                helperText="Required on every approval so the trucker can book empty return within demurrage validity."
              />

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
          <Button onClick={closeApproveFlow} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={openApproveConfirm}
            disabled={submitting || !approvalFreeTimeIso || depotId === ''}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Review & approve
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={approveConfirmOpen}
        onClose={() => !submitting && setApproveConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm approval</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Confirm the new free time date and CY assignment before submitting.
          </Typography>
          {item && (
            <Stack spacing={1.25}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Pre-forecast
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {item.referenceNo} · {item.containerNo}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.shippingLineName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Free time valid until
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {approvalFreeTimeIso ? formatDate(approvalFreeTimeIso) : '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Container yard (CY)
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {resolveSelectedDepotName(depotId, approvalAllocations, depots)}
                </Typography>
              </Box>
              {remarks.trim() && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Remarks
                  </Typography>
                  <Typography variant="body2">{remarks.trim()}</Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setApproveConfirmOpen(false)} disabled={submitting}>
            Go back
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => void handleApprove()}
            disabled={submitting}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {submitting ? 'Submitting…' : 'Confirm approve'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectConfirmOpen} onClose={closeRejectConfirm} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm rejection?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: croFreeTimeExpired ? 2 : 0 }}>
            You are about to reject this pre-forecast. This cannot be undone from this screen — the trucker will be
            notified.
          </Typography>
          {croFreeTimeExpired && (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              CRO/eDO free time is expired. Rejecting links a DET-DEM record for the trucker to upload shipping line
              payment proof.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeRejectConfirm}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={proceedRejectAfterConfirm}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Yes, continue
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectOpen} onClose={() => !submitting && setRejectOpen(false)} maxWidth="sm" fullWidth>
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
          {croFreeTimeExpired && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              Free time expired — rejecting will create DET-DEM billing so the trucker can attach payment and settle
              before filing again.
            </Alert>
          )}
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {actionError}
            </Alert>
          )}
          {rejectCannedRemarks.length > 0 && (
            <Box sx={{ mt: 1, mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Canned response
                {rejectEffectiveFreeTimeIso
                  ? rejectFreeTimeExpired
                    ? ` · free time expired ${formatDate(rejectEffectiveFreeTimeIso)}`
                    : ` · valid until ${formatDate(rejectEffectiveFreeTimeIso)}`
                  : ' · no free time date'}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {rejectCannedRemarks.map((canned) => (
                  <Chip
                    key={canned.id}
                    label={canned.label}
                    size="small"
                    clickable
                    variant={remarks === canned.text ? 'filled' : 'outlined'}
                    color={remarks === canned.text ? 'primary' : 'default'}
                    onClick={() => setRemarks(canned.text)}
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Box>
            </Box>
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
            helperText="A canned message is pre-filled from free time status; edit or pick another chip above."
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
