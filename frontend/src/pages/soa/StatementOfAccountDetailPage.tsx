import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import {
  DetailBackButton,
  DetailErrorState,
  DetailHero,
  DetailHeroAside,
  DetailLoadingState,
  InfoTile,
  infoGridSx,
} from '../../components/layout/DetailPagePrimitives'
import { statementOfAccountApi, type StatementOfAccount } from '../../services/api'
import { formatDateTime, formatPeso } from '../../utils/datetime'

function normalizeStatus(status: StatementOfAccount['status']) {
  if (typeof status === 'string') return status
  return ['Draft', 'Issued', 'ForVerification', 'Paid', 'Cancelled'][status] ?? 'Draft'
}

function statusLabel(status: string) {
  switch (status) {
    case 'ForVerification':
      return 'Under review'
    default:
      return status
  }
}

function statusHeroChipStyle(status: string): { bgcolor: string; color: string } {
  switch (status) {
    case 'Issued':
      return { bgcolor: 'rgba(237, 108, 2, 0.92)', color: '#fff' }
    case 'ForVerification':
      return { bgcolor: 'rgba(2, 136, 209, 0.92)', color: '#fff' }
    case 'Paid':
      return { bgcolor: 'rgba(46, 125, 50, 0.92)', color: '#fff' }
    case 'Cancelled':
      return { bgcolor: 'rgba(198, 40, 40, 0.92)', color: '#fff' }
    default:
      return { bgcolor: 'rgba(255,255,255,0.18)', color: '#fff' }
  }
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

export default function StatementOfAccountDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const soaId = Number(id)
  const isTrucker = location.pathname.startsWith('/trucker/')
  const listPath = isTrucker ? '/trucker/statement-of-accounts' : '/evaluations/statement-of-accounts'

  const [item, setItem] = useState<StatementOfAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [verifyApprove, setVerifyApprove] = useState(true)
  const [actionError, setActionError] = useState('')
  const [actionSaving, setActionSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!soaId || Number.isNaN(soaId)) return
    setLoading(true)
    setError('')
    try {
      const { data } = await statementOfAccountApi.get(soaId)
      setItem(data)
    } catch {
      setError('Statement of account not found or not accessible.')
    } finally {
      setLoading(false)
    }
  }, [soaId])

  useEffect(() => {
    void load()
  }, [load])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !item) return
    setUploading(true)
    setUploadError('')
    try {
      const { data } = await statementOfAccountApi.uploadProof(item.id, file)
      setItem(data)
      setSuccessMessage('Payment proof uploaded. Shipping line will verify shortly.')
    } catch (err) {
      setUploadError(apiErrorMessage(err, 'Upload failed.'))
    } finally {
      setUploading(false)
    }
  }

  const runVerify = async () => {
    if (!item) return
    setActionSaving(true)
    setActionError('')
    try {
      const { data } = await statementOfAccountApi.verify(item.id, { approved: verifyApprove })
      setItem(data)
      setVerifyOpen(false)
      setSuccessMessage(verifyApprove ? 'SOA payment approved. Billings marked paid.' : 'SOA payment rejected.')
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to update SOA verification.'))
    } finally {
      setActionSaving(false)
    }
  }

  const cancelSoa = async () => {
    if (!item || !window.confirm(`Cancel ${item.referenceNo}? Billings will return to outstanding.`)) return
    setActionSaving(true)
    setActionError('')
    try {
      const { data } = await statementOfAccountApi.cancel(item.id)
      setItem(data)
      setSuccessMessage('SOA cancelled.')
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to cancel SOA.'))
    } finally {
      setActionSaving(false)
    }
  }

  const issueSoa = async () => {
    if (!item) return
    setActionSaving(true)
    setActionError('')
    try {
      const { data } = await statementOfAccountApi.issue(item.id, {})
      setItem(data)
      setSuccessMessage('SOA issued to trucker.')
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to issue SOA.'))
    } finally {
      setActionSaving(false)
    }
  }

  if (!soaId || Number.isNaN(soaId)) {
    return (
      <Box>
        <DetailBackButton to={listPath} label="Back to statements" />
        <DetailErrorState message="Invalid SOA reference." />
      </Box>
    )
  }

  if (loading) {
    return (
      <Box>
        <DetailBackButton to={listPath} label="Back to statements" />
        <DetailLoadingState />
      </Box>
    )
  }

  if (error || !item) {
    return (
      <Box>
        <DetailBackButton to={listPath} label="Back to statements" />
        <DetailErrorState message={error || 'Statement not found.'} />
      </Box>
    )
  }

  const status = normalizeStatus(item.status)
  const heroChipStyle = statusHeroChipStyle(status)
  const canUpload = isTrucker && status === 'Issued' && item.amountDue > 0
  const canVerify = !isTrucker && (status === 'ForVerification' || (status === 'Issued' && item.amountDue <= 0))
  const canIssue = !isTrucker && status === 'Draft'
  const canCancel = !isTrucker && status !== 'Paid' && status !== 'Cancelled'

  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" hidden onChange={(e) => void handleUpload(e)} />

      <DetailBackButton to={listPath} label="Back to statements" />

      {(successMessage || uploadError || actionError) && (
        <Alert
          severity={uploadError || actionError ? 'error' : 'success'}
          sx={{ mb: 2, borderRadius: 2 }}
          onClose={() => {
            setSuccessMessage('')
            setUploadError('')
            setActionError('')
          }}
        >
          {uploadError || actionError || successMessage}
        </Alert>
      )}

      <DetailHero
        icon={<DescriptionOutlinedIcon />}
        title={item.referenceNo}
        subtitle={
          <>
            {item.shippingLineName}
            {!isTrucker && <> · {item.truckerName}</>}
          </>
        }
        chips={
          <Chip
            label={statusLabel(status)}
            size="small"
            sx={{ ...heroChipStyle, fontWeight: 700 }}
          />
        }
        aside={
          <DetailHeroAside
            label="Amount due"
            primary={formatPeso(item.amountDue)}
            secondary={`Total ${formatPeso(item.totalAmount)}`}
          />
        }
      />

      <Box sx={{ ...infoGridSx, mb: 3 }}>
        <InfoTile label="Credit applied" value={formatPeso(item.creditApplied)} />
        <InfoTile label="Due date" value={item.dueDate ?? '—'} />
        <InfoTile label="Period" value={`${item.periodFrom ?? '—'} → ${item.periodTo ?? '—'}`} />
        <InfoTile label="Issued" value={item.issuedAt ? formatDateTime(item.issuedAt) : '—'} />
        {item.paidAt && <InfoTile label="Paid" value={formatDateTime(item.paidAt)} />}
      </Box>

      {item.remarks && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Remarks
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {item.remarks}
          </Typography>
        </Paper>
      )}

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Included billings ({item.lines.length})
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Billing ref</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Container</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Pre-forecast</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {item.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.demurrageBillingReferenceNo}</TableCell>
                  <TableCell>{line.containerNo}</TableCell>
                  <TableCell>{line.preAdviceReferenceNo}</TableCell>
                  <TableCell align="right">{formatPeso(line.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {canUpload && (
          <Button
            variant="contained"
            startIcon={<UploadFileOutlinedIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {uploading ? 'Uploading…' : 'Upload payment proof'}
          </Button>
        )}
        {canIssue && (
          <Button variant="contained" onClick={() => void issueSoa()} disabled={actionSaving} sx={{ fontWeight: 700, borderRadius: 2 }}>
            Issue to trucker
          </Button>
        )}
        {canVerify && (
          <>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleOutlinedIcon />}
              onClick={() => {
                setVerifyApprove(true)
                setVerifyOpen(true)
              }}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Approve payment
            </Button>
            {item.amountDue > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<HighlightOffIcon />}
                onClick={() => {
                  setVerifyApprove(false)
                  setVerifyOpen(true)
                }}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Reject proof
              </Button>
            )}
          </>
        )}
        {canCancel && (
          <Button variant="outlined" color="warning" onClick={() => void cancelSoa()} disabled={actionSaving}>
            Cancel SOA
          </Button>
        )}
      </Box>

      <Dialog open={verifyOpen} onClose={() => setVerifyOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {verifyApprove ? 'Approve SOA payment' : 'Reject SOA payment'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {verifyApprove
              ? 'Mark this SOA as paid and settle all included demurrage billings.'
              : 'Return SOA to issued status so the trucker can upload a new proof.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setVerifyOpen(false)}>Cancel</Button>
          <Button variant="contained" color={verifyApprove ? 'success' : 'error'} onClick={() => void runVerify()} disabled={actionSaving}>
            {actionSaving ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
