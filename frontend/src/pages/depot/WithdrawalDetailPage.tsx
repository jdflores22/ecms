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
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate, useParams } from 'react-router-dom'
import WithdrawalLinesTable from '../../components/withdrawals/WithdrawalLinesTable'
import { withdrawalApi, type Withdrawal, type WithdrawalDocument } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { resolveAssetUrl } from '../../utils/assetUrl'
import { formatDateTime } from '../../utils/datetime'

const primaryDark = '#0B3D91'

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ py: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
  )
}

export default function DepotWithdrawalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const [item, setItem] = useState<Withdrawal | null>(null)
  const [documents, setDocuments] = useState<WithdrawalDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [approveRemarks, setApproveRemarks] = useState('')
  const [acting, setActing] = useState(false)

  const withdrawalId = Number(id)

  const load = useCallback(() => {
    if (!Number.isFinite(withdrawalId)) return
    setLoading(true)
    setError('')
    Promise.all([withdrawalApi.get(withdrawalId), withdrawalApi.documents(withdrawalId)])
      .then(([itemRes, docsRes]) => {
        setItem(itemRes.data)
        setDocuments(docsRes.data)
      })
      .catch(() => setError('Failed to load withdrawal request.'))
      .finally(() => setLoading(false))
  }, [withdrawalId])

  useEffect(() => {
    load()
  }, [load])

  if (user?.role !== 'DepotPersonnel') {
    return <Navigate to="/" replace />
  }

  if (!Number.isFinite(withdrawalId)) {
    return <Navigate to="/depot/withdrawals" replace />
  }

  const atwDoc = documents.find((d) => d.documentType === 'AtwCertificate')
  const canReview = item?.status === 'Submitted' || item?.status === 'UnderReview'
  const canRelease = item?.status === 'Approved'

  const handleApprove = async () => {
    if (!item) return
    setActing(true)
    setActionError('')
    try {
      const { data } = await withdrawalApi.approve(item.id, approveRemarks.trim() || undefined)
      setItem(data)
      navigate('/depot/withdrawals', { state: { message: `${data.referenceNo} approved.` } })
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to approve request.'))
    } finally {
      setActing(false)
    }
  }

  const handleReject = async () => {
    if (!item || !rejectRemarks.trim()) return
    setActing(true)
    setActionError('')
    try {
      const { data } = await withdrawalApi.reject(item.id, rejectRemarks.trim())
      setRejectOpen(false)
      navigate('/depot/withdrawals', { state: { message: `${data.referenceNo} rejected.` } })
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to reject request.'))
    } finally {
      setActing(false)
    }
  }

  const handleRelease = async () => {
    if (!item) return
    setActing(true)
    setActionError('')
    try {
      const { data } = await withdrawalApi.release(item.id)
      setItem(data)
      navigate('/depot/withdrawals', { state: { message: `${data.referenceNo} marked as released.` } })
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to mark as released.'))
    } finally {
      setActing(false)
    }
  }

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/depot/withdrawals"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}
      >
        Back to queue
      </Button>

      {loading ? (
        <Paper elevation={0} sx={{ py: 8, textAlign: 'center', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CircularProgress sx={{ color: primaryDark }} />
        </Paper>
      ) : error || !item ? (
        <Alert severity="error">{error || 'Withdrawal request not found.'}</Alert>
      ) : (
        <>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3 },
              mb: 3,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${primaryDark} 0%, #0A3580 60%, #0C4DA8 100%)`,
              color: '#fff',
            }}
          >
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.14)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <UnarchiveOutlinedIcon />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="overline" sx={{ opacity: 0.8 }}>
                  {item.referenceNo}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  ATW {item.atwNumber}
                </Typography>
                <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
                  {item.truckerName} · {item.containerCount} container{item.containerCount === 1 ? '' : 's'} → {item.destination}
                </Typography>
              </Box>
              <Chip
                label={item.status === 'UnderReview' ? 'Under review' : item.status}
                sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#fff', fontWeight: 700 }}
              />
            </Box>
          </Paper>

          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {actionError}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' }, gap: 2 }}>
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Request details
              </Typography>
              <InfoRow label="Shipping line" value={item.shippingLineName} />
              <InfoRow label="Trucker" value={item.truckerName} />
              <InfoRow label="Current CY" value={item.currentDepotName} />
              <InfoRow label="Destination" value={item.destination} />
              <InfoRow label="Issue date" value={item.issueDate} />
              <InfoRow label="Expiration date" value={item.expirationDate} />
              {item.remarks && <InfoRow label="Trucker remarks" value={item.remarks} />}
              {item.submittedAt && <InfoRow label="Submitted" value={formatDateTime(item.submittedAt)} />}
              {item.reviewRemarks && <InfoRow label="Review remarks" value={item.reviewRemarks} />}
              <Box sx={{ pt: 2 }}>
                <WithdrawalLinesTable lines={item.lines} summary={item.containerSummary} showLineStatus />
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                ATW certificate
              </Typography>
              {atwDoc ? (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {atwDoc.fileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Uploaded {formatDateTime(atwDoc.createdAt)}
                  </Typography>
                  <Box sx={{ mt: 1.5 }}>
                    <Button
                      component="a"
                      href={resolveAssetUrl(atwDoc.filePath)}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                    >
                      View document
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                  No ATW document attached.
                </Alert>
              )}

              {canReview && (
                <>
                  <TextField
                    label="Approval remarks (optional)"
                    value={approveRemarks}
                    onChange={(e) => setApproveRemarks(e.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleOutlinedIcon />}
                      disabled={acting || !atwDoc}
                      onClick={() => void handleApprove()}
                      sx={{ fontWeight: 700 }}
                    >
                      Approve withdrawal
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<HighlightOffIcon />}
                      disabled={acting}
                      onClick={() => setRejectOpen(true)}
                      sx={{ fontWeight: 700 }}
                    >
                      Reject
                    </Button>
                  </Box>
                </>
              )}

              {canRelease && (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<LocalShippingOutlinedIcon />}
                  disabled={acting}
                  onClick={() => void handleRelease()}
                  sx={{ fontWeight: 700, mt: 1 }}
                >
                  Confirm container release
                </Button>
              )}
            </Paper>
          </Box>
        </>
      )}

      <Dialog open={rejectOpen} onClose={() => !acting && setRejectOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Reject withdrawal request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide a reason for rejection. The trucker and shipping line will be notified.
          </Typography>
          <TextField
            label="Rejection remarks"
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            required
            fullWidth
            multiline
            minRows={3}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectOpen(false)} disabled={acting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={acting || !rejectRemarks.trim()}
            onClick={() => void handleReject()}
          >
            Reject request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
