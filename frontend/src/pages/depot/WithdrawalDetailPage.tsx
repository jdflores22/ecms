import {
  DetailLoadingState,
  InfoTile,
  hexToRgba,
  infoGridSx,
  sectionPaperSx,
} from '../../components/layout/DetailPagePrimitives'
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Paper, TextField, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate, useParams } from 'react-router-dom'
import WithdrawalLinesTable from '../../components/withdrawals/WithdrawalLinesTable'
import WithdrawalReleaseCertificates from '../../components/withdrawals/WithdrawalReleaseCertificates'
import WithdrawalStatusTimeline from '../../components/withdrawals/WithdrawalStatusTimeline'
import { withdrawalApi, type Withdrawal, type WithdrawalDocument, type WithdrawalLine } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { formatDateTime, formatScheduleDate } from '../../utils/datetime'
import { formatContainerSizeLabel } from '../../utils/containerSize'

const primaryDark = '#0B3D91'

const statusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Submitted: 'info',
  UnderReview: 'warning',
  Approved: 'success',
  Rejected: 'error',
  Released: 'success',
  CyAssigned: 'info',
  Scheduled: 'info',
  Booked: 'warning',
}

function statusLabel(status: string) {
  if (status === 'UnderReview') return 'Under review'
  if (status === 'CyAssigned') return 'CY assigned'
  return status
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
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
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [releaseLine, setReleaseLine] = useState<WithdrawalLine | null>(null)
  const [releaseSuccess, setReleaseSuccess] = useState('')
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [approveRemarks, setApproveRemarks] = useState('')
  const [acting, setActing] = useState(false)

  const closeApproveDialog = () => {
    if (acting) return
    setApproveOpen(false)
    setActionError('')
  }

  const closeRejectDialog = () => {
    if (acting) return
    setRejectOpen(false)
    setActionError('')
  }

  const closeReleaseDialog = () => {
    if (acting) return
    setReleaseOpen(false)
    setReleaseLine(null)
    setActionError('')
  }

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

  const atwDoc = documents.find((d) => d.documentType === 'AtwCertificate')
  const atwDocUrl = useAssetUrl(atwDoc?.filePath)

  if (user?.role !== 'DepotPersonnel') {
    return <Navigate to="/" replace />
  }

  if (!Number.isFinite(withdrawalId)) {
    return <Navigate to="/depot/withdrawals" replace />
  }

  const bookFirst = Boolean(item?.bookingNumber || item?.bookedAt)
  const shippingLineIssuedAtw = Boolean(item && !bookFirst && item.hasAtwDocument)
  const canReview = item?.status === 'Submitted' || item?.status === 'UnderReview'
  const pendingReleaseLines = item?.lines.filter((line) => line.lineStatus === 'Approved') ?? []
  const canRelease = item?.status === 'Approved' && pendingReleaseLines.length > 0

  const handleReleaseLine = async () => {
    if (!item || !releaseLine) return
    setActing(true)
    setActionError('')
    setReleaseSuccess('')
    try {
      const { data } = await withdrawalApi.releaseLine(item.id, releaseLine.id)
      setItem(data)
      const docsRes = await withdrawalApi.documents(item.id)
      setDocuments(docsRes.data)
      setReleaseOpen(false)
      setReleaseLine(null)
      const remaining = data.lines.filter((line) => line.lineStatus === 'Approved').length
      if (data.status === 'Released') {
        setReleaseSuccess(`${data.referenceNo} — all containers released. Shipping line and trucker notified.`)
      } else {
        setReleaseSuccess(
          `${releaseLine.containerNo} released. ${remaining} container${remaining === 1 ? '' : 's'} remaining under this ATW.`,
        )
      }
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to release container.'))
    } finally {
      setActing(false)
    }
  }

  const handleApprove = async () => {
    if (!item) return
    setActing(true)
    setActionError('')
    try {
      const { data } = await withdrawalApi.approve(item.id, approveRemarks.trim() || undefined)
      setApproveOpen(false)
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

  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
      <Button
        component={RouterLink}
        to="/depot/withdrawals"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}
      >
        Back to queue
      </Button>

      {loading ? (
        <DetailLoadingState />
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
                  flexShrink: 0,
                }}
              >
                <UnarchiveOutlinedIcon />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="overline" sx={{ opacity: 0.8, display: 'block' }}>
                  {item.referenceNo}
                  {item.bookingNumber ? ` · ${item.bookingNumber}` : ''}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, wordBreak: 'break-word' }}>
                  ATW {item.atwNumber}
                </Typography>
                <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
                  {item.truckerName} · {item.containerCount} container{item.containerCount === 1 ? '' : 's'} ·{' '}
                  {item.currentDepotName} → {item.destination}
                </Typography>
              </Box>
              <Chip
                label={statusLabel(item.status)}
                color={statusColor[item.status] ?? 'default'}
                sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#fff', fontWeight: 700, flexShrink: 0 }}
              />
            </Box>
          </Paper>

          <WithdrawalStatusTimeline
            status={item.status}
            issuedByShippingLine={shippingLineIssuedAtw}
            bookFirst={bookFirst}
          />

          {releaseSuccess && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setReleaseSuccess('')}>
              {releaseSuccess}
            </Alert>
          )}

          {actionError && !approveOpen && !rejectOpen && !releaseOpen && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {actionError}
            </Alert>
          )}

          {shippingLineIssuedAtw && item.status === 'CyAssigned' && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              Shipping line issued this ATW with your container yard assigned. Review the official certificate to confirm
              the assignment. The trucker will submit the withdrawal request for your validation.
            </Alert>
          )}

          {item.status === 'CyAssigned' && bookFirst && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              CY assigned — schedule a pick-up slot from the withdrawals queue when ready.
            </Alert>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.15fr 1fr' },
              gap: 2,
              alignItems: 'start',
              mb: 2,
            }}
          >
            <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Request details
              </Typography>

              <Box
                sx={{
                  ...infoGridSx,
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(2, 1fr)' },
                  mb: 2,
                }}
              >
                <InfoTile label="Shipping line" value={item.shippingLineName} />
                <InfoTile label="Trucker" value={item.truckerName} />
                <InfoTile label="Assigned CY" value={item.assignedDepotName ?? item.currentDepotName} />
                <InfoTile label="Destination" value={item.destination} />
                <InfoTile label="Purpose" value={item.purpose === 'Export' ? 'Export' : 'Repositioning'} />
                <InfoTile label="Issue date" value={formatScheduleDate(item.issueDate)} />
                <InfoTile label="Expiration date" value={formatScheduleDate(item.expirationDate)} />
                {item.bookingNumber && <InfoTile label="Booking #" value={item.bookingNumber} mono />}
                {item.truckingCompany && <InfoTile label="Trucking company" value={item.truckingCompany} />}
                {item.plateNumber && <InfoTile label="Plate #" value={item.plateNumber} mono />}
                {item.driverName && <InfoTile label="Driver" value={item.driverName} />}
                {item.cyAssignedAt && (
                  <InfoTile label="CY assigned" value={formatDateTime(item.cyAssignedAt)} />
                )}
                {item.submittedAt && <InfoTile label="Submitted" value={formatDateTime(item.submittedAt)} />}
              </Box>

              {item.remarks && (
                <Box sx={{ mb: 2 }}>
                  <InfoTile label="Trucker remarks" value={item.remarks} />
                </Box>
              )}

              {item.reviewRemarks && (
                <Box>
                  <InfoTile label="Review remarks" value={item.reviewRemarks} />
                </Box>
              )}
            </Paper>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  ATW certificate
                </Typography>

                {atwDoc ? (
                  <Box
                    sx={{
                      p: 2,
                      mb: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                    }}
                  >
                    {shippingLineIssuedAtw && (
                      <Chip size="small" color="success" label="Issued by shipping line" sx={{ mb: 1 }} />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                      {atwDoc.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {shippingLineIssuedAtw ? 'Generated' : 'Uploaded'} {formatDateTime(atwDoc.createdAt)}
                    </Typography>
                    <Button
                      component="a"
                      href={atwDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="contained"
                      endIcon={<OpenInNewIcon />}
                      sx={{ mt: 1.5, fontWeight: 600, borderRadius: 2 }}
                    >
                      View document
                    </Button>
                  </Box>
                ) : (
                  <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                    No ATW document attached.
                  </Alert>
                )}

                {canReview && <Divider sx={{ mb: 2 }} />}

                {canReview && (
                  <>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      CY validation
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Button
                        variant="contained"
                        color="success"
                        fullWidth
                        startIcon={<CheckCircleOutlinedIcon />}
                        disabled={acting || !atwDoc}
                        onClick={() => {
                          setActionError('')
                          setApproveRemarks('')
                          setApproveOpen(true)
                        }}
                        sx={{ fontWeight: 700, borderRadius: 2 }}
                      >
                        Approve withdrawal
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        fullWidth
                        startIcon={<HighlightOffIcon />}
                        disabled={acting}
                        onClick={() => {
                          setActionError('')
                          setRejectRemarks('')
                          setRejectOpen(true)
                        }}
                        sx={{ fontWeight: 700, borderRadius: 2 }}
                      >
                        Reject
                      </Button>
                    </Box>
                  </>
                )}

                {!canReview && item.status === 'CyAssigned' && shippingLineIssuedAtw && (
                  <Typography variant="body2" color="text.secondary">
                    Awaiting trucker submission. You can approve or reject once the withdrawal request is submitted.
                  </Typography>
                )}
              </Paper>

              <WithdrawalReleaseCertificates documents={documents} />
            </Box>
          </Box>

          <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 2, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Containers
                </Typography>
                {canRelease && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Release containers one at a time under this ATW. The shipping line and trucker are notified for each
                    release.
                  </Typography>
                )}
              </Box>
              {item.status === 'Released' && (
                <Chip size="small" color="success" label="All containers released" sx={{ fontWeight: 600 }} />
              )}
            </Box>
            <Box sx={{ overflowX: 'auto', minWidth: 0 }}>
              <WithdrawalLinesTable
                lines={item.lines}
                summary={item.containerSummary}
                showLineStatus
                showReleaseAction={canRelease}
                releasingLineId={acting ? releaseLine?.id ?? null : null}
                onReleaseLine={(line) => {
                  setActionError('')
                  setReleaseLine(line)
                  setReleaseOpen(true)
                }}
              />
            </Box>
          </Paper>
        </>
      )}

      <Dialog open={approveOpen} onClose={closeApproveDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Approve withdrawal request?</DialogTitle>
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
                {item.referenceNo} · ATW {item.atwNumber}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.truckerName} · {item.containerCount} container{item.containerCount === 1 ? '' : 's'} ·{' '}
                {item.containerSummary} → {item.destination}
              </Typography>
            </Paper>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The trucker will be notified that this withdrawal was approved by your container yard.
          </Typography>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {actionError}
            </Alert>
          )}
          <TextField
            label="Approval remarks (optional)"
            value={approveRemarks}
            onChange={(e) => setApproveRemarks(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            autoFocus
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeApproveDialog} disabled={acting}>
            Cancel
          </Button>
          <Button
            color="success"
            variant="contained"
            disabled={acting || !atwDoc}
            onClick={() => void handleApprove()}
            startIcon={<CheckCircleOutlinedIcon />}
            sx={{ fontWeight: 700 }}
          >
            {acting ? 'Approving…' : 'Confirm approval'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectOpen} onClose={closeRejectDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Reject withdrawal request?</DialogTitle>
        <DialogContent>
          {item && (
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                mb: 2,
                borderRadius: 2,
                bgcolor: hexToRgba('#D32F2F', 0.04),
                border: '1px solid',
                borderColor: hexToRgba('#D32F2F', 0.15),
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {item.referenceNo} · ATW {item.atwNumber}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.truckerName} · {item.containerCount} container{item.containerCount === 1 ? '' : 's'} ·{' '}
                {item.containerSummary}
              </Typography>
            </Paper>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide a reason for rejection. The trucker and shipping line will be notified.
          </Typography>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {actionError}
            </Alert>
          )}
          <TextField
            label="Rejection remarks"
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            required
            fullWidth
            multiline
            minRows={3}
            autoFocus
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeRejectDialog} disabled={acting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={acting || !rejectRemarks.trim()}
            onClick={() => void handleReject()}
            startIcon={<HighlightOffIcon />}
            sx={{ fontWeight: 700 }}
          >
            {acting ? 'Rejecting…' : 'Confirm rejection'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={releaseOpen} onClose={closeReleaseDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Release container?</DialogTitle>
        <DialogContent>
          {item && releaseLine && (
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                mb: 2,
                borderRadius: 2,
                bgcolor: hexToRgba('#2E7D32', 0.06),
                border: '1px solid',
                borderColor: hexToRgba('#2E7D32', 0.2),
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                {releaseLine.containerNo}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.referenceNo} · ATW {item.atwNumber} · {formatContainerSizeLabel(releaseLine.containerSize)} ·{' '}
                {releaseLine.containerType}
              </Typography>
            </Paper>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Confirm that this container has been released to the trucker. The shipping line and trucker will be notified.
            {pendingReleaseLines.length > 1
              ? ` ${pendingReleaseLines.length - 1} other container${pendingReleaseLines.length - 1 === 1 ? '' : 's'} will remain under this ATW.`
              : ' This is the last container under this ATW.'}
          </Typography>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {actionError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeReleaseDialog} disabled={acting}>
            Cancel
          </Button>
          <Button
            color="primary"
            variant="contained"
            disabled={acting || !releaseLine}
            onClick={() => void handleReleaseLine()}
            startIcon={<LocalShippingOutlinedIcon />}
            sx={{ fontWeight: 700 }}
          >
            {acting ? 'Releasing…' : 'Confirm release'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
