import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import SendIcon from '@mui/icons-material/Send'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link as RouterLink, Navigate, useParams } from 'react-router-dom'
import WithdrawalForm, { type WithdrawalFormSubmitValues } from '../../components/withdrawals/WithdrawalForm'
import WithdrawalLinesTable from '../../components/withdrawals/WithdrawalLinesTable'
import { isPreAdviceManager } from '../../config/roleConfig'
import { withdrawalApi, type Withdrawal, type WithdrawalDocument, type WithdrawalLookups } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { resolveAssetUrl } from '../../utils/assetUrl'
import { formatDateTime } from '../../utils/datetime'

const primaryDark = '#0B3D91'

const statusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Draft: 'default',
  Issued: 'info',
  Submitted: 'info',
  UnderReview: 'warning',
  Approved: 'success',
  Rejected: 'error',
  Released: 'success',
  Completed: 'success',
  Cancelled: 'default',
}

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

export default function WithdrawalDetailPage() {
  const { id } = useParams()
  const user = useAppSelector((s) => s.auth.user)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [item, setItem] = useState<Withdrawal | null>(null)
  const [documents, setDocuments] = useState<WithdrawalDocument[]>([])
  const [lookups, setLookups] = useState<WithdrawalLookups | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const withdrawalId = Number(id)

  const load = useCallback(() => {
    if (!Number.isFinite(withdrawalId)) return
    setLoading(true)
    setError('')
    Promise.all([
      withdrawalApi.get(withdrawalId),
      withdrawalApi.documents(withdrawalId),
      withdrawalApi.lookups(),
    ])
      .then(([itemRes, docsRes, lookupsRes]) => {
        setItem(itemRes.data)
        setDocuments(docsRes.data)
        setLookups(lookupsRes.data)
      })
      .catch(() => setError('Failed to load withdrawal request.'))
      .finally(() => setLoading(false))
  }, [withdrawalId])

  useEffect(() => {
    load()
  }, [load])

  if (!isPreAdviceManager(user?.role)) {
    return <Navigate to="/" replace />
  }

  if (!Number.isFinite(withdrawalId)) {
    return <Navigate to="/trucker/withdrawals" replace />
  }

  const detailsEditable = item?.status === 'Draft'
  const shippingLineIssued = item?.status === 'Issued'
  const canUploadAndSubmit = detailsEditable || shippingLineIssued
  const atwDoc = documents.find((d) => d.documentType === 'AtwCertificate')

  const handleSave = async (values: WithdrawalFormSubmitValues) => {
    if (!item) return
    setSaving(true)
    setActionError('')
    try {
      const { data } = await withdrawalApi.update(item.id, values)
      setItem(data)
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to save changes.'))
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (file: File) => {
    if (!item) return
    setUploading(true)
    setActionError('')
    try {
      const { data } = await withdrawalApi.uploadDocument(item.id, file)
      setDocuments((prev) => [...prev.filter((d) => d.documentType !== 'AtwCertificate'), data])
      setItem((prev) => (prev ? { ...prev, hasAtwDocument: true } : prev))
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to upload ATW document.'))
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!item) return
    setSubmitting(true)
    setActionError('')
    try {
      const { data } = await withdrawalApi.submit(item.id)
      setItem(data)
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to submit withdrawal request.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/trucker/withdrawals"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}
      >
        Back to list
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
                  {item.containerCount} container{item.containerCount === 1 ? '' : 's'} · {item.containerSummary} · {item.currentDepotName} → {item.destination}
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
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                {detailsEditable ? 'Request details' : 'Withdrawal summary'}
              </Typography>

              {shippingLineIssued && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                  This ATW was issued by <strong>{item.shippingLineName}</strong>. Request details cannot be changed — attach the ATW certificate and submit to the container yard.
                </Alert>
              )}

              {detailsEditable && lookups ? (
                <WithdrawalForm
                  lookups={lookups}
                  initial={{
                    atwNumber: item.atwNumber,
                    shippingLineId: item.shippingLineId,
                    lines: item.lines.map((line) => ({
                      containerNo: line.containerNo,
                      containerSizeId: line.containerSizeId,
                      containerTypeId: line.containerTypeId,
                    })),
                    currentDepotId: item.currentDepotId,
                    destination: item.destination,
                    issueDate: item.issueDate,
                    expirationDate: item.expirationDate,
                    remarks: item.remarks ?? '',
                  }}
                  excludeWithdrawalId={item.id}
                  onSubmit={handleSave}
                  submitLabel="Save changes"
                  submitting={saving}
                />
              ) : (
                <>
                  <InfoRow label="Shipping line" value={item.shippingLineName} />
                  <InfoRow label="Current CY" value={item.currentDepotName} />
                  <InfoRow label="Destination" value={item.destination} />
                  <InfoRow label="Purpose" value="Repositioning" />
                  <InfoRow label="Issue date" value={item.issueDate} />
                  <InfoRow label="Expiration date" value={item.expirationDate} />
                  {item.remarks && <InfoRow label="Remarks" value={item.remarks} />}
                  {item.submittedAt && <InfoRow label="Submitted" value={formatDateTime(item.submittedAt)} />}
                  {item.reviewRemarks && <InfoRow label="CY review remarks" value={item.reviewRemarks} />}
                  <Box sx={{ pt: 2 }}>
                    <WithdrawalLinesTable lines={item.lines} summary={item.containerSummary} showLineStatus />
                  </Box>
                </>
              )}
            </Paper>

            <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                ATW certificate
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Attach the Authority to Withdraw document issued by the shipping line (PDF or image).
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
                  No ATW document attached yet.
                </Alert>
              )}

              {canUploadAndSubmit && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleUpload(file)
                      e.target.value = ''
                    }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    {uploading ? 'Uploading…' : atwDoc ? 'Replace ATW document' : 'Upload ATW document'}
                  </Button>
                </>
              )}

              <Divider sx={{ my: 2 }} />

              {canUploadAndSubmit && (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<SendIcon />}
                  disabled={submitting || !item.hasAtwDocument}
                  onClick={() => void handleSubmit()}
                  sx={{ fontWeight: 700 }}
                >
                  {submitting ? 'Submitting…' : 'Submit to container yard'}
                </Button>
              )}

              {!canUploadAndSubmit && (
                <Chip
                  label={item.status === 'UnderReview' ? 'Under review' : item.status}
                  color={statusColor[item.status] ?? 'default'}
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Paper>
          </Box>
        </>
      )}
    </Box>
  )
}
