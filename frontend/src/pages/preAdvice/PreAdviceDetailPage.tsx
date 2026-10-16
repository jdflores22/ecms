import {
  Alert,
  Backdrop,
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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined'
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'
import CancelIcon from '@mui/icons-material/Cancel'
import DeleteIcon from '@mui/icons-material/Delete'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import EditIcon from '@mui/icons-material/Edit'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import SendIcon from '@mui/icons-material/Send'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PreAdviceDetailTabPanels, {
  type PreAdviceDetailTab,
} from '../../components/preAdvice/PreAdviceDetailTabPanels'
import PreAdvicePhotoTabLabel from '../../components/preAdvice/PreAdvicePhotoTabLabel'
import type { PreAdvicePhotoReadiness } from '../../components/preAdvice/PreAdvicePhotoReadinessAlert'
import { getPreAdviceContainerUnit } from '../../utils/preAdviceContainerUnit'
import type { PreAdvicePhotosWorkspaceHandle } from '../../components/preAdvice/PreAdvicePhotosWorkspace'
import EvaluationProgressStrip, {
  buildPreAdviceProgressSteps,
} from '../../components/evaluations/EvaluationProgressStrip'
import BookingQrPreviewDialog from '../../components/qr/BookingQrPreviewDialog'
import { confirmedPreForecastCopy } from '../../config/confirmedPreForecast'
import { downloadBookingConfirmationPdf } from '../../utils/downloadBookingConfirmationPdf'
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
import { listMobileActionsSx } from '../../components/layout/ListPagePrimitives'
import { REQUIRED_CONTAINER_PHOTO_CATEGORIES } from '../../config/containerPhotoCategories'
import {
  countIdentityPhotoProgress,
  hasCroEdoForUnit,
  missingIdentityPhotoLabels,
  unitIdentityPhotoProgress,
  unitIdentityPhotosComplete,
} from '../../utils/preAdviceIdentityUnit'
import { LOGICTECK_QR, qrLookupStatusColor, qrLookupStatusLabel, qrLogicteckStatusFromPreAdvice } from '../../config/logicteckQr'
import { isPreAdviceManager } from '../../config/roleConfig'
import { fetchPreAdviceLookups } from '../../utils/preAdviceLookupsCache'
import { formatPreAdviceDuplicateWarning } from '../../utils/preAdviceDuplicate'
import {
  demurrageBillingApi,
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
import {
  isScheduleDetailsVisible,
  truckerScheduleStatusHint,
} from '../../utils/truckerSchedule'
import { isCroFreeTimeExpired } from '../../utils/croFreeTime'
import { canOpenLogicteckConfirm, openLogicteckNewReturn } from '../../utils/logicteckBooking'
import { formatContainerSizeLabel } from '../../utils/containerSize'
import { prefetchSignedAssetUrls } from '../../utils/assetUrl'
import { getPreAdviceListStatus, isScheduleForPayment } from '../../utils/scheduleStatus'
import { truckerPaymentPath } from '../../utils/truckerPayment'

const primaryDark = ICS_PRIMARY

const statusLabel: Record<string, string> = {
  UnderEvaluation: 'Under evaluation',
  ForCompliance: 'For compliance',
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
            ? 'Return schedule is confirmed. Pre-forecast stays Approved in ICS — use Book with LOGICTECK when the yard is integrated (status: Book with LOGICTECK → Booked on LOGICTECK → Retrieved).'
            : schedule?.status === 'Scheduled'
              ? 'Return date assigned. Upload payment proof to confirm your return slot.'
              : 'Approved. The depot will assign a return schedule and notify the assigned trucker.',
      }
    case 'Rejected':
      return {
        severity: 'error',
        message: 'This request was rejected. Create a new pre-forecast if you need to resubmit.',
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

const PHOTO_DETAIL_TABS: PreAdviceDetailTab[] = ['photos', 'photos-primary', 'photos-companion']

function allowedDetailTabs(item: PreAdvice): PreAdviceDetailTab[] {
  const tabs: PreAdviceDetailTab[] = ['overview', 'details', 'activity']
  if (item.isBackToBack) tabs.push('photos-primary', 'photos-companion')
  else tabs.push('photos')
  if (item.status === 'Approved') tabs.push('schedule', 'qr')
  return tabs
}

function normalizeDetailTabParam(tab: string | null, item: PreAdvice | null): PreAdviceDetailTab | null {
  if (!tab) return null
  if (tab === 'photos' && item?.isBackToBack) return 'photos-primary'
  if (
    tab === 'overview' ||
    tab === 'details' ||
    tab === 'activity' ||
    tab === 'schedule' ||
    tab === 'qr' ||
    PHOTO_DETAIL_TABS.includes(tab as PreAdviceDetailTab)
  ) {
    return tab as PreAdviceDetailTab
  }
  return null
}

function initialDetailTab(): PreAdviceDetailTab {
  const tab = normalizeDetailTabParam(new URLSearchParams(window.location.search).get('tab'), null)
  if (tab && tab !== 'photos-primary' && tab !== 'photos-companion') return tab
  if (tab === 'photos-primary' || tab === 'photos-companion') return tab
  return 'details'
}

export default function PreAdviceDetailPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const preAdviceId = Number(id)

  const [item, setItem] = useState<PreAdvice | null>(null)
  const [lookups, setLookups] = useState<PreAdviceLookups | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'uploading' | 'submitting'>('idle')
  const submitInProgress = submitPhase !== 'idle'
  const [actionError, setActionError] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [documents, setDocuments] = useState<PreAdviceDocument[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [primaryPendingPhotoCategories, setPrimaryPendingPhotoCategories] = useState<string[]>([])
  const [companionPendingPhotoCategories, setCompanionPendingPhotoCategories] = useState<string[]>([])
  const pendingPhotoCategories = useMemo(
    () => [...primaryPendingPhotoCategories, ...companionPendingPhotoCategories],
    [primaryPendingPhotoCategories, companionPendingPhotoCategories],
  )
  const photosRef = useRef<PreAdvicePhotosWorkspaceHandle>(null)
  const primaryPhotosRef = useRef<PreAdvicePhotosWorkspaceHandle>(null)
  const companionPhotosRef = useRef<PreAdvicePhotosWorkspaceHandle>(null)
  const [photoError, setPhotoError] = useState('')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [qrBooking, setQrBooking] = useState<QrBooking | null>(null)
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false)
  const [bookLogicteckLoading, setBookLogicteckLoading] = useState(false)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [activeTab, setActiveTab] = useState<PreAdviceDetailTab>(initialDetailTab)
  const [linkedDemurrage, setLinkedDemurrage] = useState<{
    id: number
    referenceNo: string
    status: string
    totalAmount: number
  } | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const tabContextRef = useRef<{ id: number; status: string } | null>(null)

  const handleDocumentsChange = useCallback((next: PreAdviceDocument[]) => {
    setDocuments(next)
  }, [])

  const handleLegacyPendingPhotoCategoriesChange = useCallback((cats: string[]) => {
    setPrimaryPendingPhotoCategories(cats)
    setCompanionPendingPhotoCategories([])
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

  const loadCore = useCallback(() => {
    if (!preAdviceId) return
    setLoading(true)
    setDocumentsLoading(true)
    setError('')
    Promise.all([preAdviceApi.get(preAdviceId), preAdviceApi.documents(preAdviceId)])
      .then(([itemRes, docsRes]) => {
        setItem(itemRes.data)
        setDocuments(docsRes.data)
      })
      .catch(() => setError('Pre-forecast request not found.'))
      .finally(() => {
        setLoading(false)
        setDocumentsLoading(false)
      })
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
        const needsQr =
          data.status === 'Confirmed' ||
          data.status === 'Completed' ||
          data.status === 'NoShow' ||
          Boolean(data.hasQrBooking)
        const parallel: Promise<void>[] = []
        if (data.truckerId) {
          parallel.push(
            paymentApi
              .getBySchedule(data.id)
              .then(({ data: paymentData }) => setPayment(paymentData))
              .catch(() => setPayment(null)),
          )
        }
        if (needsQr) {
          setQrLoading(true)
          parallel.push(
            qrApi
              .getBySchedule(data.id)
              .then(async (qrRes) => {
                setQrBooking(qrRes.data)
                const imageUrl = await loadQrImage(qrRes.data.id)
                setQrImageUrl(imageUrl)
              })
              .catch(() => {
                setQrBooking(null)
                setQrImageUrl(null)
              })
              .finally(() => setQrLoading(false)),
          )
        }
        await Promise.all(parallel)
      })
      .catch(() => setSchedule(null))
      .finally(() => setScheduleLoading(false))
  }, [preAdviceId])

  useEffect(() => {
    loadCore()
  }, [loadCore])

  useEffect(() => {
    if (item?.status !== 'Approved') {
      setSchedule(null)
      setQrBooking(null)
      setQrImageUrl(null)
      setPayment(null)
      return
    }
    loadSchedule()
  }, [item?.status, item?.id, loadSchedule])

  useEffect(() => {
    if (!documents.length) return
    void prefetchSignedAssetUrls(
      documents.flatMap((d) => [d.filePath, ...(d.thumbPath ? [d.thumbPath] : [])]),
    )
  }, [documents])

  useEffect(() => {
    return () => {
      if (qrImageUrl) URL.revokeObjectURL(qrImageUrl)
    }
  }, [qrImageUrl])

  useEffect(() => {
    if (isPreAdviceManager(user?.role)) {
      fetchPreAdviceLookups()
        .then((data) => setLookups(data))
        .catch(() => {})
    }
  }, [user?.role])

  useEffect(() => {
    if (!item || !lookups || (item.status !== 'Draft' && item.status !== 'ForCompliance')) {
      setDuplicateWarning(null)
      return
    }

    const containerSizeId = lookups.containerSizes.find((s) => s.label === item.containerSize)?.id
    const containerTypeId = lookups.containerTypes.find(
      (t) => t.code === item.containerType || t.label === item.containerType,
    )?.id

    if (!containerSizeId || !containerTypeId || !item.containerNo.trim()) {
      setDuplicateWarning(null)
      return
    }

    preAdviceApi
      .checkDuplicate({
        containerNo: item.containerNo.trim().toUpperCase(),
        containerSizeId,
        containerTypeId,
        excludePreAdviceId: item.id,
      })
      .then(({ data }) => {
        setDuplicateWarning(data.isDuplicate ? formatPreAdviceDuplicateWarning(data) : null)
      })
      .catch(() => setDuplicateWarning(null))
  }, [item, lookups])

  useEffect(() => {
    if (!item) return

    const tab = normalizeDetailTabParam(searchParams.get('tab'), item)
    const allowed = allowedDetailTabs(item)

    const contextChanged =
      tabContextRef.current?.id !== item.id || tabContextRef.current?.status !== item.status

    if (contextChanged) {
      tabContextRef.current = { id: item.id, status: item.status }
      if (tab && allowed.includes(tab)) {
        setActiveTab(tab)
      } else if (item.status === 'Draft' || item.status === 'ForCompliance') {
        setActiveTab(item.isBackToBack ? 'photos-primary' : 'photos')
      } else {
        setActiveTab('overview')
      }
      return
    }

    if (tab && allowed.includes(tab)) {
      setActiveTab(tab)
    }
  }, [item?.id, item?.status, item?.isBackToBack, searchParams])

  const showScheduleTabs = item?.status === 'Approved'
  const primaryContainerUnit = item ? getPreAdviceContainerUnit(item, 'Primary') : null
  const companionContainerUnit =
    item?.isBackToBack && item ? getPreAdviceContainerUnit(item, 'Companion') : null

  const handleTabChange = (_: React.SyntheticEvent, value: PreAdviceDetailTab) => {
    if (submitInProgress) return
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

  const photoProgress = useMemo(() => {
    if (!item) return { uploaded: 0, total: 0 }
    const perUnit = REQUIRED_CONTAINER_PHOTO_CATEGORIES.length
    const total = item.isBackToBack ? perUnit * 2 : perUnit
    let uploaded = countIdentityPhotoProgress(documents, pendingPhotoCategories, 'Primary')
    if (item.isBackToBack) {
      uploaded += countIdentityPhotoProgress(documents, pendingPhotoCategories, 'Companion')
    }
    return { uploaded, total }
  }, [documents, pendingPhotoCategories, item])

  const missingPhotoLabels = useMemo(() => {
    if (!item) return []
    const primary = missingIdentityPhotoLabels(documents, pendingPhotoCategories, 'Primary').map(
      (l) => `Primary — ${l}`,
    )
    if (!item.isBackToBack) return primary
    const companion = missingIdentityPhotoLabels(documents, pendingPhotoCategories, 'Companion').map(
      (l) => `Companion — ${l}`,
    )
    return [...primary, ...companion]
  }, [documents, pendingPhotoCategories, item])

  const croComplete = useMemo(() => {
    if (!item) return true
    const primaryVerified = Boolean(item.croEdoReferenceNo || item.croEdoContext)
    const primaryOk = hasCroEdoForUnit(documents, 'Primary', primaryVerified)
    const companionOk = !item.isBackToBack || hasCroEdoForUnit(documents, 'Companion', false)
    return primaryOk && companionOk
  }, [documents, item])

  const photosComplete = missingPhotoLabels.length === 0 && croComplete

  const showPhotoActionBadges =
    item != null &&
    (item.status === 'Draft' || item.status === 'ForCompliance') &&
    !submitInProgress

  const primaryPhotoTabProgress = useMemo(
    () => unitIdentityPhotoProgress(documents, pendingPhotoCategories, 'Primary'),
    [documents, pendingPhotoCategories],
  )
  const companionPhotoTabProgress = useMemo(
    () => unitIdentityPhotoProgress(documents, pendingPhotoCategories, 'Companion'),
    [documents, pendingPhotoCategories],
  )
  const primaryPhotosNeedAction =
    showPhotoActionBadges && !unitIdentityPhotosComplete(documents, pendingPhotoCategories, 'Primary')
  const companionPhotosNeedAction =
    showPhotoActionBadges &&
    Boolean(item?.isBackToBack) &&
    !unitIdentityPhotosComplete(documents, pendingPhotoCategories, 'Companion')

  const uploadAllPendingPhotos = useCallback(async () => {
    const uploadUnit = async (
      ref: React.RefObject<PreAdvicePhotosWorkspaceHandle | null>,
      hasPending: boolean,
    ) => {
      if (!hasPending) return true
      if (!ref.current) return false
      return (await ref.current.uploadAllPending()) ?? false
    }

    if (item?.isBackToBack) {
      const primaryOk = await uploadUnit(
        primaryPhotosRef,
        primaryPendingPhotoCategories.length > 0,
      )
      const companionOk = await uploadUnit(
        companionPhotosRef,
        companionPendingPhotoCategories.length > 0,
      )
      return primaryOk && companionOk
    }
    return await uploadUnit(photosRef, pendingPhotoCategories.length > 0)
  }, [
    item?.isBackToBack,
    primaryPendingPhotoCategories.length,
    companionPendingPhotoCategories.length,
    pendingPhotoCategories.length,
  ])

  const openQrPreview = useCallback(() => {
    setActiveTab('qr')
    setSearchParams({ tab: 'qr' }, { replace: true })
    setQrPreviewOpen(true)
  }, [setSearchParams])

  const openPhotoTab = useCallback(
    (tab: PreAdviceDetailTab) => {
      if (submitInProgress) return
      setActiveTab(tab)
      if (tab === 'overview') {
        setSearchParams({}, { replace: true })
      } else {
        setSearchParams({ tab }, { replace: true })
      }
    },
    [setSearchParams, submitInProgress],
  )

  const openPhotosTab = useCallback(() => {
    openPhotoTab(item?.isBackToBack ? 'photos-primary' : 'photos')
  }, [openPhotoTab, item?.isBackToBack])

  const progressSteps = useMemo(() => {
    if (!item) return []
    return buildPreAdviceProgressSteps(
      item,
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
    schedule,
    scheduleLoading,
    qrBooking,
    qrLoading,
    openQrPreview,
    openPhotosTab,
    openScheduleTab,
  ])

  const freeTimeExpired = !!(item?.demurrageValidUntil && isCroFreeTimeExpired(item.demurrageValidUntil))
  const demurrageSettled = linkedDemurrage?.status === 'Paid'
  const demurragePending = freeTimeExpired && !demurrageSettled

  useEffect(() => {
    if (!item || !freeTimeExpired) {
      setLinkedDemurrage(null)
      return
    }
    let cancelled = false

    const applyMatch = (match: {
      id: number
      referenceNo: string
      status: string
      totalAmount: number
    } | undefined) => {
      if (cancelled) return
      setLinkedDemurrage(
        match
          ? {
              id: match.id,
              referenceNo: match.referenceNo,
              status: String(match.status),
              totalAmount: match.totalAmount,
            }
          : null,
      )
    }

    ;(async () => {
      try {
        let match: {
          id: number
          referenceNo: string
          status: string
          totalAmount: number
        } | undefined
        try {
          const { data } = await demurrageBillingApi.getByPreAdvice(item.id)
          match = {
            id: data.id,
            referenceNo: data.referenceNo,
            status: String(data.status),
            totalAmount: data.totalAmount,
          }
        } catch (err) {
          if (!axios.isAxiosError(err) || err.response?.status !== 404) {
            throw err
          }
          if (item.status === 'Draft' || item.status === 'ForCompliance') {
            try {
              const ensured = await demurrageBillingApi.ensureExpiredFreeTime(item.id)
              match = {
                id: ensured.data.id,
                referenceNo: ensured.data.referenceNo,
                status: String(ensured.data.status),
                totalAmount: ensured.data.totalAmount,
              }
            } catch {
              // Billing may already exist under another filter, or free time not expired server-side.
            }
          }
        }
        applyMatch(match)
      } catch {
        if (!cancelled) setLinkedDemurrage(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [item, freeTimeExpired, item?.id, item?.status])

  const guidance = useMemo(() => {
    if (!item) return null
    if ((item.status === 'Draft' || item.status === 'ForCompliance') && freeTimeExpired && !demurrageSettled) {
      return {
        severity: 'error' as const,
        message: linkedDemurrage
          ? `CRO/eDO free time expired on ${item.demurrageValidUntil}. Demurrage billing ${linkedDemurrage.referenceNo} (₱${linkedDemurrage.totalAmount.toLocaleString()}) is ${linkedDemurrage.status}. You cannot submit until the shipping line marks charges Paid — settle under Demurrage.`
          : `CRO/eDO free time expired on ${item.demurrageValidUntil}. Demurrage and detention charges must be settled with the shipping line before you can submit this pre-forecast.`,
      }
    }
    if ((item.status === 'Draft' || item.status === 'ForCompliance') && freeTimeExpired && demurrageSettled) {
      return {
        severity: 'success' as const,
        message: 'Demurrage and detention are settled. You can submit this pre-forecast now.',
      }
    }
    return statusGuidance(item.status, schedule, item.complianceRemarks)
  }, [
    item,
    schedule,
    freeTimeExpired,
    demurrageSettled,
    linkedDemurrage,
  ])

  const photoReadiness = useMemo((): PreAdvicePhotoReadiness | null => {
    if (!item || photosComplete) return null
    if (item.status !== 'Draft' && item.status !== 'ForCompliance') return null
    const perUnitTotal = REQUIRED_CONTAINER_PHOTO_CATEGORIES.length
    const primaryMissing = missingIdentityPhotoLabels(
      documents,
      pendingPhotoCategories,
      'Primary',
    ).length
    const companionMissing = item.isBackToBack
      ? missingIdentityPhotoLabels(documents, pendingPhotoCategories, 'Companion').length
      : 0
    return {
      resubmit: item.status === 'ForCompliance',
      uploaded: photoProgress.uploaded,
      total: photoProgress.total,
      perUnitTotal,
      primaryUploaded: primaryPhotoTabProgress.uploaded,
      primaryMissing,
      companionUploaded: companionPhotoTabProgress.uploaded,
      companionMissing,
      croComplete,
    }
  }, [
    item,
    photosComplete,
    documents,
    pendingPhotoCategories,
    photoProgress,
    primaryPhotoTabProgress,
    companionPhotoTabProgress,
    croComplete,
  ])

  const openRequestDetailsForEdit = useCallback(() => {
    setEditing(true)
    openPhotoTab('details')
  }, [openPhotoTab])

  if (!isPreAdviceManager(user?.role)) {
    return <Navigate to="/" replace />
  }

  if (!preAdviceId || Number.isNaN(preAdviceId)) {
    return <Navigate to="/preforecast" replace />
  }

  const isDraft = item?.status === 'Draft'
  const isForCompliance = item?.status === 'ForCompliance'
  const canSubmitRequest =
    (isDraft || isForCompliance) &&
    photosComplete &&
    (!freeTimeExpired || demurrageSettled) &&
    !duplicateWarning
  const canCancel = item?.status === 'Submitted' || item?.status === 'UnderEvaluation'
  const canManageDocuments = (item?.status === 'Draft' || isForCompliance) && !submitInProgress
  const deferPhotoUpload = canManageDocuments
  const showHeroActions = !editing && (canCancel || isDraft || isForCompliance)
  const effectiveScheduleStatus = schedule?.status ?? item?.scheduleStatus ?? null
  const showsFlowStatus = item?.status === 'Approved' && !!effectiveScheduleStatus
  const flowStatusBadge = item
    ? getPreAdviceListStatus({ status: item.status, scheduleStatus: effectiveScheduleStatus })
    : null
  const showPaymentAction = schedule != null && isScheduleForPayment(schedule.status)

  const paymentHeroButtonSx = {
    bgcolor: '#fff',
    color: primaryDark,
    fontWeight: 700,
    '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
  } as const

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
      setActionError(err instanceof Error ? err.message : confirmedPreForecastCopy.downloadFailed)
    }
  }

  const handleOpenLogicteckConfirm = async () => {
    if (!qrBooking || !canOpenLogicteckConfirm(qrBooking, schedule)) return
    setBookLogicteckLoading(true)
    setActionError('')
    try {
      await openLogicteckNewReturn(qrBooking.qrCode)
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Could not open LOGICTECK.'))
    } finally {
      setBookLogicteckLoading(false)
    }
  }

  const logicteckHeroStatus = qrBooking
    ? qrLookupStatusLabel(qrBooking)
    : qrLogicteckStatusFromPreAdvice(item ?? {})
  const logicteckUpdateMessage = qrBooking?.logicteckUpdateMessage || item?.logicteckUpdateMessage

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
      setActionError(apiErrorMessage(err, 'Failed to update pre-forecast.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (!item || !photosComplete || submitInProgress) return
    const hasPendingUploads = pendingPhotoCategories.length > 0
    setSubmitPhase(hasPendingUploads ? 'uploading' : 'submitting')
    setSubmitting(true)
    setActionError('')
    try {
      if (deferPhotoUpload) {
        const uploaded = await uploadAllPendingPhotos()
        if (!uploaded) {
          setActionError(
            'Some container photos could not be uploaded. Open each container’s Photos tab, then try submit again.',
          )
          return
        }
        const { data: freshDocs } = await preAdviceApi.documents(item.id)
        setDocuments(freshDocs)
        const primaryMissing = missingIdentityPhotoLabels(freshDocs, [], 'Primary')
        const companionMissing = item.isBackToBack
          ? missingIdentityPhotoLabels(freshDocs, [], 'Companion')
          : []
        if (primaryMissing.length > 0 || companionMissing.length > 0) {
          const parts: string[] = []
          if (primaryMissing.length > 0) {
            parts.push(`Primary: ${primaryMissing.join(', ')}`)
          }
          if (companionMissing.length > 0) {
            parts.push(`Companion (${item.backToBackCompanionContainerNo ?? '2nd container'}): ${companionMissing.join(', ')}`)
          }
          setActionError(
            `Container photos are not complete on the server. Missing — ${parts.join('; ')}. Open each container’s Photos tab and upload again.`,
          )
          return
        }
      }
      setSubmitPhase('submitting')
      const { data } = await preAdviceApi.submit(item.id)
      setItem(data)
      setSubmitOpen(false)
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to submit pre-forecast.'))
      setSubmitOpen(false)
      // Refresh linked demurrage if submit created billing for expired free time.
      if (freeTimeExpired) {
        try {
          const { data: billing } = await demurrageBillingApi.getByPreAdvice(item.id)
          setLinkedDemurrage({
            id: billing.id,
            referenceNo: billing.referenceNo,
            status: String(billing.status),
            totalAmount: billing.totalAmount,
          })
        } catch {
          /* ignore */
        }
      }
    } finally {
      setSubmitting(false)
      setSubmitPhase('idle')
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
      setActionError(apiErrorMessage(err, 'Failed to cancel pre-forecast.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!item || !window.confirm('Delete this draft pre-forecast request?')) return
    setSubmitting(true)
    setActionError('')
    try {
      await preAdviceApi.delete(item.id)
      navigate('/preforecast')
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to delete pre-forecast.'))
      setSubmitting(false)
    }
  }

  const startEditing = () => {
    setActiveTab('details')
    setSearchParams({ tab: 'details' }, { replace: true })
    setEditing(true)
  }

  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      <DetailBackButton to="/preforecast" label="Back to list" disabled={submitInProgress} />

      {loading && !item ? (
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
                  label={
                    showsFlowStatus && flowStatusBadge
                      ? flowStatusBadge.label
                      : (statusLabel[item.status] ?? item.status)
                  }
                  size="small"
                  sx={
                    showsFlowStatus && flowStatusBadge
                      ? {
                          fontWeight: 700,
                          bgcolor: 'rgba(255,255,255,0.95)',
                          color: flowStatusBadge.color,
                          border: `1px solid ${flowStatusBadge.border}`,
                        }
                      : { fontWeight: 700, ...heroStatusChipStyle(item.status) }
                  }
                />
                {(item.hasQrBooking || qrBooking) && logicteckHeroStatus && (
                  <Chip
                    icon={
                      <QrCode2OutlinedIcon sx={{ fontSize: '16px !important', color: 'inherit !important' }} />
                    }
                    label={
                      logicteckUpdateMessage
                        ? `LOGICTECK · ${logicteckHeroStatus} — ${logicteckUpdateMessage}`
                        : `LOGICTECK · ${logicteckHeroStatus}`
                    }
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
                {item.isBackToBack && (
                  <Chip
                    label="Back-to-Back"
                    size="small"
                    color="secondary"
                    sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.95)' }}
                  />
                )}
                <PhotoProgressChip uploaded={photoProgress.uploaded} total={photoProgress.total} />
                {freeTimeExpired && (
                  <Chip
                    label={
                      demurrageSettled
                        ? 'CRO free time expired · settled'
                        : 'CRO free time expired · settle demurrage'
                    }
                    size="small"
                    sx={{
                      fontWeight: 700,
                      bgcolor: demurrageSettled ? 'rgba(46, 125, 50, 0.92)' : 'rgba(211, 47, 47, 0.92)',
                      color: '#fff',
                    }}
                  />
                )}
                <TimezoneChip />
              </>
            }
            aside={
              showHeroActions ? (
                <Box sx={{ ...listMobileActionsSx, mt: 0, flexShrink: 0 }}>
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
                          duplicateWarning
                            ? duplicateWarning
                            : demurragePending
                              ? 'Settle demurrage and detention charges with the shipping line before you can submit.'
                              : !photosComplete
                                ? `Upload all ${photoProgress.total} container identity photos before submitting (${photoProgress.uploaded}/${photoProgress.total})`
                                : ''
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
                            disabled={submitting || !canSubmitRequest}
                            sx={paymentHeroButtonSx}
                          >
                            Submit
                          </Button>
                        </span>
                      </Tooltip>
                      {(linkedDemurrage || demurragePending) && (
                        <Button
                          component={RouterLink}
                          to={
                            linkedDemurrage
                              ? `/trucker/demurrage-billing/${linkedDemurrage.id}`
                              : '/trucker/demurrage-billing'
                          }
                          startIcon={<PaymentOutlinedIcon />}
                          variant="outlined"
                          sx={{
                            color: '#fff',
                            borderColor: 'rgba(255,255,255,0.45)',
                            fontWeight: 600,
                            '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                          }}
                        >
                          {demurrageSettled ? 'Demurrage settled' : 'Pay demurrage'}
                        </Button>
                      )}
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
                          duplicateWarning
                            ? duplicateWarning
                            : demurragePending
                              ? 'Settle demurrage and detention charges with the shipping line before you can resubmit.'
                              : !photosComplete
                                ? `Upload all ${photoProgress.total} container identity photos before resubmitting (${photoProgress.uploaded}/${photoProgress.total})`
                                : ''
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
                            disabled={submitting || !canSubmitRequest}
                            sx={paymentHeroButtonSx}
                          >
                            Resubmit
                          </Button>
                        </span>
                      </Tooltip>
                      {(linkedDemurrage || demurragePending) && (
                        <Button
                          component={RouterLink}
                          to={
                            linkedDemurrage
                              ? `/trucker/demurrage-billing/${linkedDemurrage.id}`
                              : '/trucker/demurrage-billing'
                          }
                          startIcon={<PaymentOutlinedIcon />}
                          variant="outlined"
                          sx={{
                            color: '#fff',
                            borderColor: 'rgba(255,255,255,0.45)',
                            fontWeight: 600,
                            '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                          }}
                        >
                          {demurrageSettled ? 'Demurrage settled' : 'Pay demurrage'}
                        </Button>
                      )}
                    </>
                  )}
                </Box>
              ) : showPaymentAction || schedule ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: { xs: 'stretch', sm: 'flex-end' },
                    gap: 1.5,
                    flexShrink: 0,
                  }}
                >
                  {schedule && isScheduleDetailsVisible(schedule) && schedule.date && (
                    <DetailHeroAside
                      label="Return slot"
                      primary={formatScheduleSlot(schedule.date, schedule.time)}
                      secondary={schedule.slotNo > 0 ? `Slot ${schedule.slotNo}` : undefined}
                    />
                  )}
                  {schedule && !isScheduleDetailsVisible(schedule) && (
                    <DetailHeroAside label="Return schedule" primary={truckerScheduleStatusHint(schedule)} />
                  )}
                  {showPaymentAction && schedule && (
                    <Button
                      component={RouterLink}
                      to={truckerPaymentPath(schedule.id)}
                      startIcon={<PaymentOutlinedIcon />}
                      variant="contained"
                      sx={paymentHeroButtonSx}
                    >
                      Go to payment
                    </Button>
                  )}
                </Box>
              ) : undefined
            }
          />

          <EvaluationProgressStrip steps={progressSteps} />

          {duplicateWarning && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
              {duplicateWarning} Wait for that request to finish or contact support before submitting.
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
              {showScheduleTabs ? <Tab label="Return schedule" value="schedule" /> : null}
              {showScheduleTabs ? <Tab label={LOGICTECK_QR.tabLabel} value="qr" /> : null}
              <Tab label="Request details" value="details" />
              {item.isBackToBack
                ? [
                    <Tab
                      key="photos-primary"
                      value="photos-primary"
                      label={
                        <PreAdvicePhotoTabLabel
                          containerNo={primaryContainerUnit!.containerNo}
                          sizeTypeLine={primaryContainerUnit!.sizeTypeLine}
                          uploaded={primaryPhotoTabProgress.uploaded}
                          total={primaryPhotoTabProgress.total}
                          needsAction={primaryPhotosNeedAction}
                        />
                      }
                    />,
                    <Tab
                      key="photos-companion"
                      value="photos-companion"
                      label={
                        <PreAdvicePhotoTabLabel
                          containerNo={companionContainerUnit!.containerNo}
                          sizeTypeLine={companionContainerUnit!.sizeTypeLine}
                          uploaded={companionPhotoTabProgress.uploaded}
                          total={companionPhotoTabProgress.total}
                          needsAction={companionPhotosNeedAction}
                        />
                      }
                    />,
                  ]
                : (
                  <Tab
                    key="photos"
                    value="photos"
                    label={
                      <PreAdvicePhotoTabLabel
                        containerNo={primaryContainerUnit!.containerNo}
                        sizeTypeLine={primaryContainerUnit!.sizeTypeLine}
                        uploaded={primaryPhotoTabProgress.uploaded}
                        total={primaryPhotoTabProgress.total}
                        needsAction={primaryPhotosNeedAction}
                      />
                    }
                  />
                )}
              <Tab label="Activity log" value="activity" />
            </Tabs>

            <PreAdviceDetailTabPanels
              activeTab={activeTab}
              item={item}
              preAdviceId={preAdviceId}
              documents={documents}
              documentsLoading={documentsLoading}
              canManageDocuments={canManageDocuments}
              deferPhotoUpload={deferPhotoUpload}
              photosRef={photosRef}
              primaryPhotosRef={primaryPhotosRef}
              companionPhotosRef={companionPhotosRef}
              onPendingPhotoCategoriesChange={handleLegacyPendingPhotoCategoriesChange}
              onPrimaryPendingChange={setPrimaryPendingPhotoCategories}
              onCompanionPendingChange={setCompanionPendingPhotoCategories}
              onOpenPhotoTab={openPhotoTab}
              photoError={photoError}
              onPhotoError={setPhotoError}
              editing={editing}
              lookups={lookups}
              submitting={submitting}
              statusGuidance={guidance}
              photoReadiness={photoReadiness}
              onOpenRequestDetails={openRequestDetailsForEdit}
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
              onBookLogicteck={
                qrBooking && canOpenLogicteckConfirm(qrBooking, schedule) ? handleOpenLogicteckConfirm : undefined
              }
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
        preAdvice={item}
        payment={payment}
        onDownload={downloadQr}
        onDownloadConfirmationPdf={() => void downloadConfirmationPdf()}
        onBookLogicteck={
          qrBooking && canOpenLogicteckConfirm(qrBooking, schedule) ? handleOpenLogicteckConfirm : undefined
        }
        bookLogicteckLoading={bookLogicteckLoading}
      />

      <Backdrop
        open={submitInProgress}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1, color: '#fff', flexDirection: 'column', gap: 2 }}
      >
        <CircularProgress color="inherit" />
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {submitPhase === 'uploading' ? 'Uploading container photos…' : 'Submitting pre-forecast…'}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          Please wait. Do not close or navigate away.
        </Typography>
      </Backdrop>

      <Dialog
        open={submitOpen}
        onClose={(_, reason) => {
          if (submitInProgress) return
          if (reason === 'backdropClick') return
          setSubmitOpen(false)
          setActionError('')
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isForCompliance ? 'Resubmit pre-forecast for evaluation' : 'Submit pre-forecast for evaluation'}
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
              ? 'This will send your corrected pre-forecast back to the shipping-line evaluator for another review.'
              : 'This will send the pre-forecast to a shipping-line evaluator. You will not be able to edit container details after submission, but you can still cancel while evaluation is in progress.'}
          </Typography>
          {freeTimeExpired && (
            <Alert severity={demurrageSettled ? 'success' : 'error'} sx={{ mb: 2, borderRadius: 2 }}>
              {demurrageSettled
                ? 'Demurrage and detention are settled. You can submit this pre-forecast.'
                : 'CRO/eDO free time has expired. You cannot submit until demurrage and detention charges are settled with the shipping line.'}
            </Alert>
          )}
          <Alert severity="success" sx={{ mb: actionError ? 2 : 0, borderRadius: 2 }}>
            All {photoProgress.total} container identity photos are uploaded and ready for review.
          </Alert>
          {submitInProgress && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary">
                {submitPhase === 'uploading'
                  ? 'Uploading container photos…'
                  : 'Submitting pre-forecast for evaluation…'}
              </Typography>
            </Box>
          )}
          {actionError && submitOpen && !submitInProgress && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {actionError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSubmitOpen(false)} disabled={submitInProgress}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={submitInProgress || !photosComplete}
            startIcon={submitInProgress ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {submitInProgress
              ? submitPhase === 'uploading'
                ? 'Uploading photos…'
                : 'Submitting…'
              : isForCompliance
                ? 'Resubmit for evaluation'
                : 'Submit for evaluation'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Cancel pre-forecast request</DialogTitle>
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
