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
  Divider,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { detailTabsSx, hexToRgba } from '../../components/layout/DetailPagePrimitives'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  LIST_PRIMARY,
  listMobileActionsSx,
  listPageRootSx,
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'
import { LOGICTECK_QR } from '../../config/logicteckQr'
import { paymentApi, demurrageBillingApi, type Payment, type DemurrageBilling } from '../../services/api'
import { isCrossOriginAssetUrl, resolveAssetUrl } from '../../utils/assetUrl'
import { formatDateTime, formatPeso } from '../../utils/datetime'
import { extractPaymentProofMetadata } from '../../utils/paymentProofOcr'
import {
  formatProofReferenceNo,
  fromDatetimeLocalValue,
  normalizeProofReferenceNo,
  toDatetimeLocalValue,
} from '../../utils/paymentProofTextParser'

const primaryDark = LIST_PRIMARY

type VerifyAction = 'approve' | 'reject'
type PaymentTab = 'pending' | 'verified' | 'rejected'

const paymentStatusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  ForVerification: 'warning',
  Paid: 'success',
  Rejected: 'error',
}

const paymentStatusLabel: Record<string, string> = {
  ForVerification: 'For verification',
  Paid: 'Verified',
  Rejected: 'Rejected',
}

const tabEmptyMessage: Record<PaymentTab, string> = {
  pending: 'No payments awaiting verification.',
  verified: 'No verified payments yet.',
  rejected: 'No rejected payments.',
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

function isImageProof(path: string) {
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(path)
}

function isPdfProof(path: string) {
  return /\.pdf$/i.test(path)
}

function SummaryCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  )
}

function PaymentSummaryPaper({ payment, variant }: { payment: Payment; variant: 'approve' | 'reject' | 'neutral' }) {
  const summaryBg =
    variant === 'reject' ? 'rgba(211, 47, 47, 0.04)' : hexToRgba(primaryDark, 0.04)
  const summaryBorder = variant === 'reject' ? 'rgba(211, 47, 47, 0.15)' : hexToRgba(primaryDark, 0.1)

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        mb: 2,
        borderRadius: 2,
        bgcolor: summaryBg,
        border: '1px solid',
        borderColor: summaryBorder,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Schedule #{payment.scheduleId}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {payment.truckerName} · {formatPeso(payment.amount)}
      </Typography>
      {payment.paidAt && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
          Uploaded {formatDateTime(payment.paidAt)}
        </Typography>
      )}
      {(payment.proofReferenceNo || payment.proofTransactionAt) && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
          Ref {formatProofReferenceNo(payment.proofReferenceNo)}
          {payment.proofTransactionAt ? ` · ${formatDateTime(payment.proofTransactionAt)}` : ''}
        </Typography>
      )}
    </Paper>
  )
}

function PaymentActions({
  payment,
  tab,
  onViewProof,
  onApprove,
  onReject,
}: {
  payment: Payment
  tab: PaymentTab
  onViewProof: (payment: Payment) => void
  onApprove: (payment: Payment) => void
  onReject: (payment: Payment) => void
}) {
  return (
    <Box sx={listMobileActionsSx}>
      {payment.proofFile && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<VisibilityOutlinedIcon />}
          onClick={() => onViewProof(payment)}
          sx={{ fontWeight: 600, borderRadius: 2 }}
        >
          View proof
        </Button>
      )}
      <Button
        component={RouterLink}
        to={`/depot/schedules/${payment.scheduleId}`}
        size="small"
        variant="text"
        endIcon={<OpenInNewIcon />}
        sx={{ fontWeight: 600 }}
      >
        Schedule
      </Button>
      {tab === 'pending' && payment.status === 'ForVerification' && (
        <>
          <Button
            size="small"
            color="success"
            variant="outlined"
            startIcon={<CheckCircleOutlinedIcon />}
            onClick={() => onApprove(payment)}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Approve
          </Button>
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<CancelOutlinedIcon />}
            onClick={() => onReject(payment)}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Reject
          </Button>
        </>
      )}
    </Box>
  )
}

function PaymentTable({
  items,
  tab,
  onViewProof,
  onApprove,
  onReject,
}: {
  items: Payment[]
  tab: PaymentTab
  onViewProof: (payment: Payment) => void
  onApprove: (payment: Payment) => void
  onReject: (payment: Payment) => void
}) {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow
            sx={{
              bgcolor: hexToRgba(primaryDark, 0.04),
              '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
            }}
          >
            <TableCell>Schedule</TableCell>
            <TableCell>Trucker</TableCell>
            <TableCell>Ref. no.</TableCell>
            <TableCell>Transaction</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Uploaded</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((p) => (
            <TableRow key={p.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
              <TableCell>
                <Button
                  component={RouterLink}
                  to={`/depot/schedules/${p.scheduleId}`}
                  size="small"
                  sx={{ fontWeight: 700, color: primaryDark }}
                >
                  #{p.scheduleId}
                </Button>
              </TableCell>
              <TableCell>{p.truckerName}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {formatProofReferenceNo(p.proofReferenceNo)}
              </TableCell>
              <TableCell>
                {p.proofTransactionAt ? formatDateTime(p.proofTransactionAt) : '—'}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{formatPeso(p.amount)}</TableCell>
              <TableCell>{p.paidAt ? formatDateTime(p.paidAt) : '—'}</TableCell>
              <TableCell>
                <Chip
                  label={paymentStatusLabel[p.status] ?? p.status}
                  color={paymentStatusColor[p.status] ?? 'default'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </TableCell>
              <TableCell align="right">
                <PaymentActions
                  payment={p}
                  tab={tab}
                  onViewProof={onViewProof}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default function AdminPaymentsPage() {
  const [pending, setPending] = useState<Payment[]>([])
  const [reviewed, setReviewed] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<PaymentTab>('pending')

  const [proofPreview, setProofPreview] = useState<Payment | null>(null)
  const [verifyAction, setVerifyAction] = useState<VerifyAction | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [actionError, setActionError] = useState('')
  const [detectingProofId, setDetectingProofId] = useState<number | null>(null)
  const [verifyReferenceNo, setVerifyReferenceNo] = useState('')
  const [verifyTransactionLocal, setVerifyTransactionLocal] = useState('')
  const [demurrageItems, setDemurrageItems] = useState<DemurrageBilling[]>([])
  const [demurrageSubmittingId, setDemurrageSubmittingId] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([paymentApi.pending(), paymentApi.depot(), demurrageBillingApi.list()])
      .then(([pendingRes, reviewedRes, demurrageRes]) => {
        setPending(pendingRes.data)
        setReviewed(reviewedRes.data)
        setDemurrageItems(demurrageRes.data)
      })
      .catch(() => setError('Failed to load payments.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const verified = useMemo(() => reviewed.filter((p) => p.status === 'Paid'), [reviewed])
  const rejected = useMemo(() => reviewed.filter((p) => p.status === 'Rejected'), [reviewed])
  const demurragePending = useMemo(
    () => demurrageItems.filter((b) => b.status === 'ForVerification'),
    [demurrageItems],
  )

  const handleDemurrageVerify = async (id: number, approved: boolean) => {
    setDemurrageSubmittingId(id)
    setError('')
    try {
      await demurrageBillingApi.verify(id, approved)
      setMessage(approved ? 'Demurrage payment verified.' : 'Demurrage payment rejected.')
      load()
    } catch {
      setError('Failed to update demurrage billing.')
    } finally {
      setDemurrageSubmittingId(null)
    }
  }

  const summary = useMemo(
    () => ({
      pending: pending.length,
      verified: verified.length,
      rejected: rejected.length,
      pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
    }),
    [pending, verified, rejected],
  )

  const tabItems = useMemo(() => {
    switch (tab) {
      case 'verified':
        return verified
      case 'rejected':
        return rejected
      default:
        return pending
    }
  }, [tab, pending, verified, rejected])

  const verifyOpen = verifyAction !== null && selectedPayment !== null

  const openVerify = (payment: Payment, action: VerifyAction) => {
    setActionError('')
    setSaveSuccess(false)
    setSelectedPayment(payment)
    setVerifyAction(action)
    setVerifyReferenceNo(payment.proofReferenceNo ?? '')
    setVerifyTransactionLocal(toDatetimeLocalValue(payment.proofTransactionAt))
  }

  const closeVerify = () => {
    if (submitting || saveSuccess) return
    setVerifyAction(null)
    setSelectedPayment(null)
    setActionError('')
    setVerifyReferenceNo('')
    setVerifyTransactionLocal('')
  }

  const mergePaymentInLists = (updated: Payment) => {
    setPending((items) => items.map((p) => (p.id === updated.id ? updated : p)))
    setReviewed((items) => items.map((p) => (p.id === updated.id ? updated : p)))
    setProofPreview((current) => (current?.id === updated.id ? updated : current))
    setSelectedPayment((current) => (current?.id === updated.id ? updated : current))
  }

  const detectProofMetadata = async (payment: Payment) => {
    if (!payment.proofFile || !isImageProof(payment.proofFile)) return
    setDetectingProofId(payment.id)
    setError('')
    try {
      let referenceNo: string | null = null
      let transactionAt: string | null = null

      if (isCrossOriginAssetUrl(payment.proofFile)) {
        try {
          const { data } = await paymentApi.extractProofMetadata(payment.id)
          referenceNo = data.proofReferenceNo ?? null
          transactionAt = data.proofTransactionAt ?? null
        } catch {
          /* server OCR unavailable — try client via authenticated download */
        }

        if (!referenceNo && !transactionAt) {
          const { data: blob } = await paymentApi.downloadProofFile(payment.id)
          const extracted = await extractPaymentProofMetadata(blob)
          referenceNo = extracted.referenceNo
          transactionAt = extracted.transactionAt
        }
      } else {
        const extracted = await extractPaymentProofMetadata(resolveAssetUrl(payment.proofFile))
        referenceNo = extracted.referenceNo
        transactionAt = extracted.transactionAt
      }

      const { data } = await paymentApi.updateProofMetadata(payment.id, {
        proofReferenceNo: referenceNo,
        proofTransactionAt: transactionAt,
      })
      mergePaymentInLists(data)
      setVerifyReferenceNo(data.proofReferenceNo ?? '')
      setVerifyTransactionLocal(toDatetimeLocalValue(data.proofTransactionAt))
      if (!data.proofReferenceNo && !data.proofTransactionAt) {
        setError('Could not read reference number or transaction time from this proof.')
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError(
          'Proof file not found on the API server (common after a Railway redeploy without a volume). Ask the trucker to re-upload the proof.',
        )
      } else {
        setError('Could not read reference number or transaction time from this proof.')
      }
    } finally {
      setDetectingProofId(null)
    }
  }

  const handleVerify = async () => {
    if (!selectedPayment || !verifyAction) return
    const approved = verifyAction === 'approve'
    setSubmitting(true)
    setActionError('')
    try {
      const metadata = {
        proofReferenceNo: normalizeProofReferenceNo(verifyReferenceNo),
        proofTransactionAt: fromDatetimeLocalValue(verifyTransactionLocal),
      }
      await paymentApi.verify(selectedPayment.id, approved, metadata)
      setSaveSuccess(true)
      setMessage(
        approved
          ? `Payment for schedule #${selectedPayment.scheduleId} approved. ${LOGICTECK_QR.approveSuccess}`
          : `Payment for schedule #${selectedPayment.scheduleId} rejected. Trucker can re-upload proof.`,
      )
      window.setTimeout(() => {
        setVerifyAction(null)
        setSelectedPayment(null)
        setSaveSuccess(false)
        setTab(approved ? 'verified' : 'rejected')
        load()
      }, 1500)
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Verification failed. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={listPageRootSx}>
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
            right: -30,
            top: -30,
            width: 140,
            height: 140,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
          }}
        />
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', position: 'relative' }}>
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
            <VerifiedOutlinedIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              Payment verification
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 560 }}>
              Review trucker payment proofs, approve returns, and publish booking QR for LOGICTECK integration.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <SummaryCard label="Awaiting verification" value={summary.pending} color={primaryDark} />
        <SummaryCard label="Verified" value={summary.verified} color="#2E7D32" />
        <SummaryCard label="Rejected" value={summary.rejected} color="#D32F2F" />
        <SummaryCard label="Pending amount" value={formatPeso(summary.pendingAmount)} color="#ED6C02" />
      </Box>

      <Paper elevation={0} sx={listTablePaperSx}>
        <Tabs
          value={tab}
          onChange={(_, value: PaymentTab) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ ...detailTabsSx, px: { xs: 1, sm: 2 } }}
        >
          <Tab label={`Pending (${summary.pending})`} value="pending" />
          <Tab label={`Verified (${summary.verified})`} value="verified" />
          <Tab label={`Rejected (${summary.rejected})`} value="rejected" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: primaryDark }} />
          </Box>
        ) : tabItems.length === 0 ? (
          <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
            {tabEmptyMessage[tab]}
          </Typography>
        ) : (
          <>
            <ListMobileOnly>
              {tabItems.map((p) => (
                <ListMobileCard key={p.id}>
                  <ListMobileChipRow>
                    <ListMobileTitle>Schedule #{p.scheduleId}</ListMobileTitle>
                    <Chip
                      label={paymentStatusLabel[p.status] ?? p.status}
                      color={paymentStatusColor[p.status] ?? 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </ListMobileChipRow>
                  <ListMobileMeta>{p.truckerName}</ListMobileMeta>
                  <ListMobileMeta>
                    Ref {formatProofReferenceNo(p.proofReferenceNo)}
                    {p.proofTransactionAt ? ` · ${formatDateTime(p.proofTransactionAt)}` : ''}
                  </ListMobileMeta>
                  <ListMobileMeta>
                    {formatPeso(p.amount)}
                    {p.paidAt ? ` · ${formatDateTime(p.paidAt)}` : ''}
                  </ListMobileMeta>
                  <PaymentActions
                    payment={p}
                    tab={tab}
                    onViewProof={setProofPreview}
                    onApprove={(payment) => openVerify(payment, 'approve')}
                    onReject={(payment) => openVerify(payment, 'reject')}
                  />
                </ListMobileCard>
              ))}
            </ListMobileOnly>

            <ListDesktopOnly>
              <PaymentTable
                items={tabItems}
                tab={tab}
                onViewProof={setProofPreview}
                onApprove={(payment) => openVerify(payment, 'approve')}
                onReject={(payment) => openVerify(payment, 'reject')}
              />
            </ListDesktopOnly>
          </>
        )}
      </Paper>

      {demurragePending.length > 0 && (
        <Paper elevation={0} sx={{ ...listTablePaperSx, mt: 3, p: { xs: 2, sm: 2.5 } }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Demurrage & detention ({demurragePending.length} awaiting verification)
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Container</TableCell>
                  <TableCell>Trucker</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {demurragePending.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{item.referenceNo}</TableCell>
                    <TableCell>{item.containerNo}</TableCell>
                    <TableCell>{item.truckerName}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formatPeso(item.totalAmount)}
                      </Typography>
                      {(item.feeLines?.length
                        ? item.feeLines
                        : [
                            ...(item.demurrageAmount > 0
                              ? [{ description: 'Demurrage', amount: item.demurrageAmount, sortOrder: 1 }]
                              : []),
                            ...(item.detentionAmount > 0
                              ? [{ description: 'Detention', amount: item.detentionAmount, sortOrder: 2 }]
                              : []),
                          ]
                      ).map((line) => (
                        <Typography key={`${line.description}-${line.sortOrder}`} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {line.description}: {formatPeso(line.amount)}
                        </Typography>
                      ))}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="success"
                        startIcon={<CheckCircleOutlinedIcon />}
                        disabled={demurrageSubmittingId === item.id}
                        onClick={() => void handleDemurrageVerify(item.id, true)}
                        sx={{ mr: 1 }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<CancelOutlinedIcon />}
                        disabled={demurrageSubmittingId === item.id}
                        onClick={() => void handleDemurrageVerify(item.id, false)}
                      >
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={proofPreview !== null} onClose={() => setProofPreview(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Payment proof</DialogTitle>
        <DialogContent>
          {proofPreview && (
            <>
              <PaymentSummaryPaper payment={proofPreview} variant="neutral" />
              {(proofPreview.proofReferenceNo || proofPreview.proofTransactionAt) && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                  Detected ref {formatProofReferenceNo(proofPreview.proofReferenceNo)}
                  {proofPreview.proofTransactionAt
                    ? ` · ${formatDateTime(proofPreview.proofTransactionAt)}`
                    : ''}
                </Alert>
              )}
              {proofPreview.proofFile ? (
                <>
                  {isImageProof(proofPreview.proofFile) ? (
                    <Box
                      component="img"
                      src={resolveAssetUrl(proofPreview.proofFile)}
                      alt="Payment proof"
                      sx={{
                        width: '100%',
                        maxHeight: 420,
                        objectFit: 'contain',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: '#fafafa',
                      }}
                    />
                  ) : isPdfProof(proofPreview.proofFile) ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        textAlign: 'center',
                        bgcolor: hexToRgba(primaryDark, 0.02),
                      }}
                    >
                      <PictureAsPdfOutlinedIcon sx={{ fontSize: 48, color: primaryDark, mb: 1 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        PDF proof file — open in a new tab to review.
                      </Typography>
                      <Button
                        variant="outlined"
                        href={resolveAssetUrl(proofPreview.proofFile)}
                        target="_blank"
                        rel="noreferrer"
                        endIcon={<OpenInNewIcon />}
                        sx={{ fontWeight: 600, borderRadius: 2 }}
                      >
                        Open PDF
                      </Button>
                    </Paper>
                  ) : (
                    <Button
                      variant="outlined"
                      href={resolveAssetUrl(proofPreview.proofFile)}
                      target="_blank"
                      rel="noreferrer"
                      endIcon={<OpenInNewIcon />}
                      sx={{ fontWeight: 600, borderRadius: 2 }}
                    >
                      Open proof file
                    </Button>
                  )}
                </>
              ) : (
                <Typography color="text.secondary">No proof file attached.</Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setProofPreview(null)}>Close</Button>
          {proofPreview?.proofFile && isImageProof(proofPreview.proofFile) && (
            <Button
              variant="outlined"
              startIcon={
                detectingProofId === proofPreview.id ? (
                  <CircularProgress size={16} />
                ) : (
                  <AutoFixHighOutlinedIcon />
                )
              }
              disabled={detectingProofId === proofPreview.id}
              onClick={() => void detectProofMetadata(proofPreview)}
              sx={{ fontWeight: 600, borderRadius: 2 }}
            >
              Detect from proof
            </Button>
          )}
          {proofPreview?.proofFile && (
            <Button
              variant="contained"
              href={resolveAssetUrl(proofPreview.proofFile)}
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

      <Dialog open={verifyOpen} onClose={closeVerify} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {saveSuccess
            ? verifyAction === 'approve'
              ? 'Payment approved'
              : 'Payment rejected'
            : verifyAction === 'approve'
              ? 'Approve payment'
              : 'Reject payment'}
        </DialogTitle>
        <DialogContent>
          {submitting ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
              <CircularProgress size={40} sx={{ color: primaryDark }} />
              <Typography color="text.secondary" align="center">
                {verifyAction === 'approve'
                  ? 'Approving payment and publishing booking QR…'
                  : 'Rejecting payment and notifying trucker…'}
              </Typography>
            </Box>
          ) : saveSuccess ? (
            <Alert severity={verifyAction === 'approve' ? 'success' : 'info'} sx={{ borderRadius: 2 }}>
              {verifyAction === 'approve'
                ? LOGICTECK_QR.approveSuccess
                : 'Payment rejected. The trucker has been notified to re-upload proof.'}
            </Alert>
          ) : (
            selectedPayment && (
              <>
                <PaymentSummaryPaper
                  payment={selectedPayment}
                  variant={verifyAction === 'reject' ? 'reject' : 'approve'}
                />

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {verifyAction === 'approve'
                    ? LOGICTECK_QR.approveConfirmHint
                    : 'Rejecting will notify the trucker to upload a new payment proof before the return can be confirmed.'}
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
                  <Typography color="text.secondary">Schedule</Typography>
                  <Typography sx={{ fontWeight: 600 }}>#{selectedPayment.scheduleId}</Typography>
                  <Typography color="text.secondary">Trucker</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{selectedPayment.truckerName}</Typography>
                  <Typography color="text.secondary">Amount</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{formatPeso(selectedPayment.amount)}</Typography>
                  {selectedPayment.paidAt && (
                    <>
                      <Typography color="text.secondary">Uploaded</Typography>
                      <Typography sx={{ fontWeight: 600 }}>{formatDateTime(selectedPayment.paidAt)}</Typography>
                    </>
                  )}
                </Box>

                <Box sx={{ display: 'grid', gap: 1.5, mt: 2 }}>
                  <TextField
                    label="Proof reference no."
                    value={verifyReferenceNo}
                    onChange={(e) => setVerifyReferenceNo(e.target.value)}
                    placeholder="e.g. 5014349566710"
                    size="small"
                    fullWidth
                    slotProps={{ input: { sx: { fontFamily: 'monospace' } } }}
                  />
                  <TextField
                    label="Proof transaction (PHT)"
                    type="datetime-local"
                    value={verifyTransactionLocal}
                    onChange={(e) => setVerifyTransactionLocal(e.target.value)}
                    size="small"
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  {selectedPayment.proofFile && isImageProof(selectedPayment.proofFile) && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={
                        detectingProofId === selectedPayment.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <AutoFixHighOutlinedIcon />
                        )
                      }
                      disabled={detectingProofId === selectedPayment.id}
                      onClick={() => void detectProofMetadata(selectedPayment)}
                      sx={{ justifySelf: 'flex-start', fontWeight: 600, borderRadius: 2 }}
                    >
                      Detect from proof
                    </Button>
                  )}
                </Box>

                {selectedPayment.proofFile && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityOutlinedIcon />}
                      onClick={() => setProofPreview(selectedPayment)}
                      sx={{ fontWeight: 600, borderRadius: 2 }}
                    >
                      Review proof before confirming
                    </Button>
                  </Box>
                )}
              </>
            )
          )}
        </DialogContent>
        {!submitting && !saveSuccess && (
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeVerify} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color={verifyAction === 'reject' ? 'error' : 'success'}
              onClick={handleVerify}
              disabled={submitting}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              {verifyAction === 'approve' ? 'Approve & publish QR' : 'Reject payment'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  )
}
