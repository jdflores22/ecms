import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom'
import DemurrageFeeLineEditor from '../../components/demurrage/DemurrageFeeLineEditor'
import { BillingContextCard } from '../../components/demurrage/DemurrageBillingPrimitives'
import {
  billingToFeeRows,
  feeRowsToPayload,
  isExpiredValidUntil,
  validateFeeRows,
  type FeeRow,
} from '../../components/demurrage/demurrageBillingUtils'
import {
  DetailBackButton,
  DetailErrorState,
  DetailHero,
  DetailHeroAside,
  DetailLoadingState,
  ICS_PRIMARY,
  InfoTile,
  hexToRgba,
  infoGridSx,
  sectionPaperSx,
} from '../../components/layout/DetailPagePrimitives'
import AssetImage from '../../components/layout/AssetImage'
import { demurrageBillingApi, type DemurrageBilling } from '../../services/api'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { openSignedAsset } from '../../utils/openSignedAsset'
import { formatDate, formatDateTime, formatPeso } from '../../utils/datetime'
import { paymentStatusLabel } from '../../utils/truckerPayment'

const primaryDark = ICS_PRIMARY

function isImageProof(path: string) {
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(path)
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

function statusHeroChipStyle(status: string): { bgcolor: string; color: string } {
  switch (status) {
    case 'Pending':
      return { bgcolor: 'rgba(237, 108, 2, 0.92)', color: '#fff' }
    case 'ForVerification':
      return { bgcolor: 'rgba(2, 136, 209, 0.92)', color: '#fff' }
    case 'Paid':
      return { bgcolor: 'rgba(46, 125, 50, 0.92)', color: '#fff' }
    case 'Rejected':
      return { bgcolor: 'rgba(198, 40, 40, 0.92)', color: '#fff' }
    default:
      return { bgcolor: 'rgba(255,255,255,0.18)', color: '#fff' }
  }
}

function statusMessage(item: DemurrageBilling, isTrucker: boolean) {
  switch (item.status) {
    case 'Pending':
      return isTrucker
        ? 'Payment is due. Upload proof of payment to start admin verification.'
        : 'Outstanding — trucker has not uploaded payment proof yet.'
    case 'ForVerification':
      return isTrucker
        ? 'Your proof is under admin review. You will be notified when verified.'
        : 'Payment proof uploaded — awaiting admin verification.'
    case 'Paid':
      return 'Settled. The trucker may submit a new pre-forecast for this container.'
    case 'Rejected':
      return isTrucker
        ? 'Payment was rejected. Upload a new proof or contact support if the amount changed.'
        : 'Payment rejected — trucker must re-upload proof. You can edit fees if the amount changed.'
    default:
      return null
  }
}

export default function DemurrageBillingDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const billingId = Number(id)
  const isTrucker = location.pathname.startsWith('/trucker/')
  const listPath = isTrucker ? '/trucker/demurrage-billing' : '/evaluations/demurrage-billing'

  const [item, setItem] = useState<DemurrageBilling | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [proofPreviewOpen, setProofPreviewOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const proofFileUrl = useAssetUrl(item?.proofFile)

  const [feeDialogOpen, setFeeDialogOpen] = useState(false)
  const [feeRows, setFeeRows] = useState<FeeRow[]>([])
  const [feeError, setFeeError] = useState('')
  const [feeSaving, setFeeSaving] = useState(false)

  const load = useCallback(() => {
    if (!billingId) return
    setLoading(true)
    setError('')
    demurrageBillingApi
      .get(billingId)
      .then(({ data }) => setItem(data))
      .catch(() => setError('Demurrage billing not found or not accessible.'))
      .finally(() => setLoading(false))
  }, [billingId])

  useEffect(() => {
    load()
  }, [load])

  const feeLines = useMemo(() => {
    if (!item) return []
    if (item.feeLines?.length) return item.feeLines
    return [
      ...(item.demurrageAmount > 0
        ? [{ id: 0, description: 'Demurrage', amount: item.demurrageAmount, sortOrder: 1 }]
        : []),
      ...(item.detentionAmount > 0
        ? [{ id: 0, description: 'Detention', amount: item.detentionAmount, sortOrder: 2 }]
        : []),
    ]
  }, [item])

  const canUpload = item != null && (item.status === 'Pending' || item.status === 'Rejected') && isTrucker
  const canEditFees = item != null && (item.status === 'Pending' || item.status === 'Rejected') && !isTrucker

  const openFeeEditor = () => {
    if (!item) return
    setFeeRows(billingToFeeRows(item))
    setFeeError('')
    setFeeDialogOpen(true)
  }

  const saveFees = async () => {
    if (!item) return
    const validationError = validateFeeRows(feeRows)
    if (validationError) {
      setFeeError(validationError)
      return
    }
    setFeeSaving(true)
    setFeeError('')
    try {
      const { data } = await demurrageBillingApi.updateFees(item.id, feeRowsToPayload(feeRows))
      setItem(data)
      setFeeDialogOpen(false)
      setSuccessMessage('Fee lines updated.')
    } catch (err: unknown) {
      setFeeError(apiErrorMessage(err, 'Failed to save fee lines.'))
    } finally {
      setFeeSaving(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !item) return

    setUploading(true)
    setUploadError('')
    try {
      const { data } = await demurrageBillingApi.uploadProof(item.id, file)
      setItem(data)
      setSuccessMessage('Payment proof uploaded. Admin will verify shortly.')
    } catch (err: unknown) {
      setUploadError(apiErrorMessage(err, 'Upload failed. Try again with a clear payment proof.'))
    } finally {
      setUploading(false)
    }
  }

  if (!billingId || Number.isNaN(billingId)) {
    return (
      <Box>
        <DetailBackButton to={listPath} label="Back to demurrage billing" />
        <DetailErrorState message="Invalid billing reference." />
      </Box>
    )
  }

  if (loading) {
    return (
      <Box>
        <DetailBackButton to={listPath} label="Back to demurrage billing" />
        <DetailLoadingState />
      </Box>
    )
  }

  if (error || !item) {
    return (
      <Box>
        <DetailBackButton to={listPath} label="Back to demurrage billing" />
        <DetailErrorState message={error || 'Demurrage billing not found.'} />
      </Box>
    )
  }

  const statusMsg = statusMessage(item, isTrucker)
  const heroChipStyle = statusHeroChipStyle(item.status)

  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" hidden onChange={(e) => void handleUpload(e)} />

      <DetailBackButton to={listPath} label="Back to demurrage billing" />

      {(successMessage || uploadError) && (
        <Alert
          severity={uploadError ? 'error' : 'success'}
          sx={{ mb: 2, borderRadius: 2 }}
          onClose={() => {
            setSuccessMessage('')
            setUploadError('')
          }}
        >
          {uploadError || successMessage}
        </Alert>
      )}

      <DetailHero
        icon={<ReceiptLongOutlinedIcon />}
        title={item.referenceNo}
        subtitle={
          <>
            {item.containerNo} · {item.containerSize} {item.containerType}
            {!isTrucker && <> · {item.truckerName}</>}
          </>
        }
        chips={
          <>
            <Chip
              label={paymentStatusLabel[item.status] ?? item.status}
              size="small"
              sx={{ ...heroChipStyle, fontWeight: 700 }}
            />
            {isExpiredValidUntil(item.demurrageValidUntil) && (
              <Chip label={`${item.daysOverdue} days overdue`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: '#fff', fontWeight: 700 }} />
            )}
          </>
        }
        aside={
          <DetailHeroAside
            label="Total charges"
            primary={formatPeso(item.totalAmount)}
            secondary={item.status === 'Paid' && item.paidAt ? `Settled ${formatDateTime(item.paidAt)}` : undefined}
          />
        }
      />

      {statusMsg && (
        <Alert severity={item.status === 'Paid' ? 'success' : item.status === 'Rejected' ? 'warning' : 'info'} sx={{ mb: 3, borderRadius: 2.5 }}>
          {statusMsg}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Paper elevation={0} sx={sectionPaperSx}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
            Billing details
          </Typography>
          <Box sx={infoGridSx}>
            <InfoTile label="Pre-forecast" value={item.preAdviceReferenceNo} mono />
            <InfoTile label="Container" value={item.containerNo} mono />
            {!isTrucker && <InfoTile label="Trucker" value={item.truckerName} />}
            {!isTrucker && <InfoTile label="Shipping line" value={item.shippingLineName} />}
            <InfoTile label="Demurrage valid until" value={formatDate(item.demurrageValidUntil)} />
            <InfoTile label="Expired on" value={formatDate(item.expiredOn)} />
            <InfoTile label="Days overdue" value={String(item.daysOverdue)} />
            <InfoTile label="Created" value={formatDateTime(item.createdAt)} />
            {item.proofReferenceNo && <InfoTile label="Proof reference" value={item.proofReferenceNo} mono />}
            {item.proofTransactionAt && (
              <InfoTile label="Proof transaction" value={formatDateTime(item.proofTransactionAt)} />
            )}
          </Box>

          <Divider sx={{ my: 2.5 }} />

          <Button
            component={RouterLink}
            to={isTrucker ? `/preforecast/${item.preAdviceId}` : `/evaluations/${item.preAdviceId}`}
            variant="outlined"
            endIcon={<OpenInNewIcon />}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            {isTrucker ? 'View pre-forecast' : 'View pre-forecast evaluation'}
          </Button>

          {canEditFees && (
            <Button
              variant="contained"
              startIcon={<EditOutlinedIcon />}
              onClick={openFeeEditor}
              sx={{ ml: { sm: 1.5 }, mt: { xs: 1.5, sm: 0 }, fontWeight: 700, borderRadius: 2 }}
            >
              Edit fees
            </Button>
          )}
        </Paper>

        <Paper elevation={0} sx={sectionPaperSx}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
            Charge breakdown
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            All fee lines included in this billing.
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Amount
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {feeLines.map((line) => (
                  <TableRow key={`${line.description}-${line.sortOrder}`}>
                    <TableCell>{line.description}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {formatPeso(line.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, borderBottom: 'none' }}>Total</TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 800, color: primaryDark, fontVariantNumeric: 'tabular-nums', borderBottom: 'none' }}
                  >
                    {formatPeso(item.totalAmount)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      <Paper elevation={0} sx={{ ...sectionPaperSx, mt: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
          {canUpload ? 'Upload payment proof' : 'Payment proof'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {canUpload
            ? 'Attach a clear image or PDF of your payment receipt. Admin verifies before the container block is lifted.'
            : item.proofFile
              ? 'Submitted proof of payment for this billing.'
              : 'No payment proof uploaded yet.'}
        </Typography>

        {item.proofFile ? (
          <Box sx={{ mb: canUpload ? 3 : 0 }}>
            {isImageProof(item.proofFile) ? (
              <AssetImage
                path={item.proofFile}
                alt="Payment proof"
                onClick={() => setProofPreviewOpen(true)}
                skeletonHeight={280}
                skeletonMaxHeight={360}
                sx={{
                  width: '100%',
                  maxWidth: 480,
                  maxHeight: 360,
                  objectFit: 'contain',
                  display: 'block',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2.5,
                  bgcolor: '#fafafa',
                }}
              />
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: hexToRgba(primaryDark, 0.02),
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  maxWidth: 480,
                }}
              >
                <PictureAsPdfOutlinedIcon sx={{ fontSize: 40, color: primaryDark }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    PDF proof attached
                  </Typography>
                  <Button
                    size="small"
                    href={proofFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<OpenInNewIcon />}
                    sx={{ mt: 0.5, fontWeight: 600 }}
                  >
                    Open PDF
                  </Button>
                </Box>
              </Paper>
            )}
            {!canUpload && (
              <Button
                size="small"
                startIcon={<VisibilityOutlinedIcon />}
                onClick={() => (isImageProof(item.proofFile!) ? setProofPreviewOpen(true) : void openSignedAsset(item.proofFile))}
                sx={{ mt: 1.5, fontWeight: 600 }}
              >
                View proof
              </Button>
            )}
          </Box>
        ) : null}

        {canUpload && (
          <Button
            variant="contained"
            startIcon={uploading ? undefined : <UploadFileIcon />}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {uploading ? 'Uploading…' : `Upload proof · ${formatPeso(item.totalAmount)}`}
          </Button>
        )}
      </Paper>

      <Dialog open={proofPreviewOpen} onClose={() => setProofPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Payment proof</DialogTitle>
        <DialogContent>
          {item.proofFile && isImageProof(item.proofFile) && (
            <AssetImage
              path={item.proofFile}
              alt="Payment proof"
              skeletonHeight={400}
              sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProofPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={feeDialogOpen} onClose={() => !feeSaving && setFeeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Edit billing fees</DialogTitle>
        <DialogContent dividers>
          <BillingContextCard
            referenceNo={item.referenceNo}
            containerNo={item.containerNo}
            truckerName={item.truckerName}
            validUntil={item.demurrageValidUntil}
            daysOverdue={item.daysOverdue}
          />
          {feeError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {feeError}
            </Alert>
          )}
          <DemurrageFeeLineEditor rows={feeRows} onChange={setFeeRows} disabled={feeSaving} />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setFeeDialogOpen(false)} disabled={feeSaving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void saveFees()} disabled={feeSaving} sx={{ fontWeight: 700, borderRadius: 2 }}>
            {feeSaving ? 'Saving…' : 'Save fees'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export function demurrageBillingDetailPath(id: number, role: 'evaluator' | 'trucker') {
  return role === 'trucker' ? `/trucker/demurrage-billing/${id}` : `/evaluations/demurrage-billing/${id}`
}
