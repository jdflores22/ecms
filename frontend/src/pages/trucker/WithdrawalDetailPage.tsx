import { DetailLoadingState } from '../../components/layout/DetailPagePrimitives'
import { Alert, Box, Button, Chip, Divider, Paper, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import SendIcon from '@mui/icons-material/Send'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link as RouterLink, Navigate, useParams } from 'react-router-dom'
import WithdrawalForm, { type WithdrawalFormSubmitValues } from '../../components/withdrawals/WithdrawalForm'
import WithdrawalLinesTable from '../../components/withdrawals/WithdrawalLinesTable'
import WithdrawalStatusTimeline from '../../components/withdrawals/WithdrawalStatusTimeline'
import WithdrawalGatePassCard from '../../components/withdrawals/WithdrawalGatePassCard'
import WithdrawalReleaseCertificates from '../../components/withdrawals/WithdrawalReleaseCertificates'
import { InfoTile, infoGridSx } from '../../components/layout/DetailPagePrimitives'
import { isPreAdviceManager } from '../../config/roleConfig'
import { withdrawalApi, type Withdrawal, type WithdrawalDocument, type WithdrawalLookups } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { formatDateTime, formatScheduleDate, formatScheduleTime } from '../../utils/datetime'

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
  Booked: 'warning',
  CyAssigned: 'info',
  Scheduled: 'info',
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

function WithdrawalSummaryGrid({ item }: { item: Withdrawal }) {
  return (
    <>
      <Box
        sx={{
          ...infoGridSx,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
          mb: 2,
        }}
      >
        <InfoTile label="Shipping line" value={item.shippingLineName} />
        <InfoTile label="Assigned CY" value={item.assignedDepotName ?? item.currentDepotName} />
        <InfoTile label="Destination" value={item.destination} />
        <InfoTile label="Purpose" value={item.purpose === 'Export' ? 'Export' : 'Repositioning'} />
        {item.bookingNumber && <InfoTile label="Booking #" value={item.bookingNumber} />}
        {item.truckingCompany && <InfoTile label="Trucking company" value={item.truckingCompany} />}
        {item.plateNumber && <InfoTile label="Plate #" value={item.plateNumber} />}
        {item.driverName && <InfoTile label="Driver" value={item.driverName} />}
        <InfoTile label="Issue date" value={formatScheduleDate(item.issueDate)} />
        <InfoTile label="Expiration date" value={formatScheduleDate(item.expirationDate)} />
        {item.submittedAt && (
          <InfoTile label="Submitted" value={formatDateTime(item.submittedAt)} />
        )}
      </Box>

      {item.remarks && (
        <Box sx={{ mb: 2 }}>
          <InfoTile label="Remarks" value={item.remarks} />
        </Box>
      )}

      {item.reviewRemarks && (
        <Box sx={{ mb: 2 }}>
          <InfoTile label="CY review remarks" value={item.reviewRemarks} />
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      <WithdrawalLinesTable lines={item.lines} summary={item.containerSummary} showLineStatus />
    </>
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

  const atwDoc = documents.find((d) => d.documentType === 'AtwCertificate')
  const atwDocUrl = useAssetUrl(atwDoc?.filePath)

  if (!isPreAdviceManager(user?.role)) {
    return <Navigate to="/" replace />
  }

  if (!Number.isFinite(withdrawalId)) {
    return <Navigate to="/trucker/withdrawals" replace />
  }

  const detailsEditable = item?.status === 'Draft'
  const bookFirst = Boolean(item?.bookingNumber || item?.bookedAt)
  const shippingLineIssued = !bookFirst && (item?.status === 'Issued' || item?.status === 'CyAssigned')
  const systemIssuedCertificate = Boolean(shippingLineIssued && item?.hasAtwDocument)
  const canUploadAtw = detailsEditable || (item?.status === 'Issued' && !item?.hasAtwDocument)
  const canSubmitToDepot =
    detailsEditable ||
    (shippingLineIssued && Boolean(item?.hasAtwDocument) && (item?.status === 'Issued' || item?.status === 'CyAssigned'))
  const showGatePass = Boolean(item && ['Approved', 'Released', 'Completed'].includes(item.status))

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

          <WithdrawalStatusTimeline
            status={item.status}
            issuedByShippingLine={shippingLineIssued}
            bookFirst={bookFirst}
          />

          {item.pickupSchedule && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              Pick-up scheduled: {formatScheduleDate(item.pickupSchedule.date)} at {formatScheduleTime(item.pickupSchedule.time)}
              {item.pickupSchedule.slotNo > 0 ? ` · Slot ${item.pickupSchedule.slotNo}` : ''} · {item.pickupSchedule.depotName}
            </Alert>
          )}

          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {actionError}
            </Alert>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' },
              alignItems: 'start',
              gap: 2,
            }}
          >
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                {detailsEditable ? 'Request details' : 'Withdrawal summary'}
              </Typography>

              {shippingLineIssued && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                  {systemIssuedCertificate ? (
                    <>
                      This ATW was issued by <strong>{item.shippingLineName}</strong> with CY assigned at{' '}
                      <strong>{item.assignedDepotName ?? item.currentDepotName}</strong>. View the official certificate
                      below and submit to the container yard.
                    </>
                  ) : (
                    <>
                      This ATW was issued by <strong>{item.shippingLineName}</strong>. Request details cannot be changed
                      — attach the ATW certificate and submit to the container yard.
                    </>
                  )}
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
                <WithdrawalSummaryGrid item={item} />
              )}
            </Paper>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  ATW certificate
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {systemIssuedCertificate
                    ? 'Official Authority to Withdraw certificate from your shipping line.'
                    : 'Attach the Authority to Withdraw document issued by the shipping line (PDF or image).'}
                </Typography>

                {atwDoc ? (
                  <Box sx={{ mb: 2 }}>
                    {systemIssuedCertificate && (
                      <Chip size="small" color="success" label="Official certificate" sx={{ mb: 1 }} />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {atwDoc.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {systemIssuedCertificate ? 'Generated' : 'Uploaded'} {formatDateTime(atwDoc.createdAt)}
                    </Typography>
                    <Box sx={{ mt: 1.5 }}>
                      <Button
                        component="a"
                        href={atwDocUrl}
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

                <WithdrawalReleaseCertificates documents={documents} embedded />

                {canUploadAtw && (
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

                {canSubmitToDepot ? (
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
                ) : !detailsEditable ? (
                  <Chip
                    label={item.status === 'UnderReview' ? 'Under review' : item.status}
                    color={statusColor[item.status] ?? 'default'}
                    sx={{ fontWeight: 700 }}
                  />
                ) : null}
              </Paper>

              {showGatePass && (
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: '#fff',
                    boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
                  }}
                >
                  <WithdrawalGatePassCard withdrawalId={item.id} status={item.status} />
                </Paper>
              )}
            </Box>
          </Box>
        </>
      )}
    </Box>
  )
}
