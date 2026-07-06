import { DetailLoadingState } from '../../components/layout/DetailPagePrimitives'
import { Alert, Box, Button, Chip, Divider, Paper, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AssignCyDialog from '../../components/withdrawals/AssignCyDialog'
import WithdrawalLinesTable from '../../components/withdrawals/WithdrawalLinesTable'
import WithdrawalReleaseCertificates from '../../components/withdrawals/WithdrawalReleaseCertificates'
import WithdrawalStatusTimeline from '../../components/withdrawals/WithdrawalStatusTimeline'
import { InfoTile, infoGridSx } from '../../components/layout/DetailPagePrimitives'
import { withdrawalApi, type Withdrawal, type WithdrawalDocument } from '../../services/api'
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

function statusLabel(status: string) {
  if (status === 'UnderReview') return 'Under review'
  if (status === 'CyAssigned') return 'CY assigned'
  return status
}

export default function EvaluatorAtwDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const user = useAppSelector((s) => s.auth.user)
  const [item, setItem] = useState<Withdrawal | null>(null)
  const [documents, setDocuments] = useState<WithdrawalDocument[]>([])
  const [depots, setDepots] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [assignOpen, setAssignOpen] = useState(false)

  const withdrawalId = Number(id)
  const backTo = searchParams.get('tab') === 'awaiting-cy' ? '/evaluations/atw?tab=awaiting-cy' : '/evaluations/atw'
  const bookFirst = Boolean(item?.bookingNumber || item?.bookedAt)
  const shippingLineIssued = !bookFirst && (item?.status === 'Issued' || item?.status === 'CyAssigned')

  const load = useCallback(() => {
    if (!Number.isFinite(withdrawalId)) return
    setLoading(true)
    setError('')
    Promise.all([
      withdrawalApi.get(withdrawalId),
      withdrawalApi.documents(withdrawalId),
      withdrawalApi.evaluatorLookups(),
    ])
      .then(([itemRes, docsRes, lookupsRes]) => {
        setItem(itemRes.data)
        setDocuments(docsRes.data)
        setDepots(lookupsRes.data.depots)
      })
      .catch(() => setError('Failed to load ATW record.'))
      .finally(() => setLoading(false))
  }, [withdrawalId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message
    if (message) setSuccessMessage(message)
  }, [location.state])

  const atwDoc = documents.find((d) => d.documentType === 'AtwCertificate')
  const atwDocUrl = useAssetUrl(atwDoc?.filePath)

  if (user?.role !== 'ShippingLineEvaluator') {
    return <Navigate to="/" replace />
  }

  if (!Number.isFinite(withdrawalId)) {
    return <Navigate to="/evaluations/atw" replace />
  }

  const canAssignCy = item?.status === 'Booked'

  return (
    <Box>
      <Button
        component={RouterLink}
        to={backTo}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}
      >
        Back to ATW list
      </Button>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {loading ? (
        <DetailLoadingState />
      ) : error || !item ? (
        <Alert severity="error">{error || 'ATW record not found.'}</Alert>
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
                <AssignmentTurnedInOutlinedIcon />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="overline" sx={{ opacity: 0.8 }}>
                  {item.referenceNo}
                  {item.bookingNumber ? ` · ${item.bookingNumber}` : ''}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
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
                sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#fff', fontWeight: 700 }}
              />
            </Box>
          </Paper>

          <WithdrawalStatusTimeline
            status={item.status}
            issuedByShippingLine={shippingLineIssued}
            bookFirst={bookFirst}
          />

          {canAssignCy && (
            <Alert
              severity="warning"
              sx={{ mb: 2, borderRadius: 2 }}
              action={
                <Button color="inherit" size="small" variant="outlined" onClick={() => setAssignOpen(true)} sx={{ fontWeight: 600 }}>
                  Assign CY
                </Button>
              }
            >
              This ICS booking is waiting for container yard assignment. Review the ATW certificate, then assign a CY for depot scheduling.
            </Alert>
          )}

          {item.status === 'CyAssigned' && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              CY assigned to <strong>{item.assignedDepotName ?? item.currentDepotName}</strong>
              {item.cyAssignedAt ? ` on ${formatDateTime(item.cyAssignedAt)}` : ''}.
              {bookFirst
                ? ' Awaiting depot pick-up schedule.'
                : ' The container yard will review the official ATW certificate; the trucker can submit when ready.'}
            </Alert>
          )}

          {item.pickupSchedule && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              Pick-up scheduled: {formatScheduleDate(item.pickupSchedule.date)} at{' '}
              {formatScheduleTime(item.pickupSchedule.time)}
              {item.pickupSchedule.slotNo > 0 ? ` · Slot ${item.pickupSchedule.slotNo}` : ''} ·{' '}
              {item.pickupSchedule.depotName}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' }, gap: 2, alignItems: 'start' }}>
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                {bookFirst ? 'ICS booking details' : 'ATW details'}
              </Typography>

              <Box
                sx={{
                  ...infoGridSx,
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
                  mb: 2,
                }}
              >
                <InfoTile label="Shipping line" value={item.shippingLineName} />
                <InfoTile label="Authorized trucker" value={item.truckerName} />
                <InfoTile label="Purpose" value={item.purpose === 'Export' ? 'Export' : 'Repositioning'} />
                {item.bookingNumber && <InfoTile label="Booking #" value={item.bookingNumber} />}
                {item.truckingCompany && <InfoTile label="Trucking company" value={item.truckingCompany} />}
                {item.plateNumber && <InfoTile label="Plate #" value={item.plateNumber} />}
                {item.driverName && <InfoTile label="Driver" value={item.driverName} />}
                <InfoTile label="Current CY" value={item.currentDepotName} />
                {item.assignedDepotName && item.assignedDepotName !== item.currentDepotName && (
                  <InfoTile label="Assigned CY" value={item.assignedDepotName} />
                )}
                <InfoTile label="Destination" value={item.destination} />
                <InfoTile label="Issue date" value={formatScheduleDate(item.issueDate)} />
                <InfoTile label="Expiration date" value={formatScheduleDate(item.expirationDate)} />
                {item.bookedAt && <InfoTile label="Booked" value={formatDateTime(item.bookedAt)} />}
                {item.submittedAt && <InfoTile label="Submitted" value={formatDateTime(item.submittedAt)} />}
              </Box>

              {item.remarks && (
                <Box sx={{ mb: 2 }}>
                  <InfoTile label="Trucker remarks" value={item.remarks} />
                </Box>
              )}

              {item.reviewRemarks && (
                <Box sx={{ mb: 2 }}>
                  <InfoTile label="CY review remarks" value={item.reviewRemarks} />
                </Box>
              )}

              <Divider sx={{ mb: 2 }} />

              <WithdrawalLinesTable lines={item.lines} summary={item.containerSummary} showLineStatus />
            </Paper>

            <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                ATW certificate
              </Typography>

              {atwDoc ? (
                <Box sx={{ mb: 2 }}>
                  {shippingLineIssued && item.hasAtwDocument && (
                    <Chip size="small" color="success" label="System-generated certificate" sx={{ mb: 1 }} />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {atwDoc.fileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {shippingLineIssued ? 'Generated' : 'Uploaded'} {formatDateTime(atwDoc.createdAt)}
                  </Typography>
                  <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Button
                      component="a"
                      href={atwDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="contained"
                      endIcon={<OpenInNewIcon />}
                    >
                      View document
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                  No ATW document attached yet. CY assignment requires the ATW certificate.
                </Alert>
              )}

              <WithdrawalReleaseCertificates documents={documents} embedded />

              {canAssignCy && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Next step
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Confirm the ATW matches the containers below, then assign the container yard where pick-up will happen.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<WarehouseOutlinedIcon />}
                    onClick={() => setAssignOpen(true)}
                    disabled={!item.hasAtwDocument}
                    sx={{ fontWeight: 600, borderRadius: 2 }}
                  >
                    Assign container yard
                  </Button>
                  {!item.hasAtwDocument && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Waiting for the ATW certificate to be attached.
                    </Typography>
                  )}
                </>
              )}

              {shippingLineIssued && item.status === 'CyAssigned' && (
                <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                  Container yard assigned at issue. The depot will review the official ATW certificate; the trucker can
                  submit the withdrawal request when ready.
                </Alert>
              )}

              {item.status === 'Issued' && !item.hasAtwDocument && (
                <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                  ATW issued to trucker. They must attach the certificate and submit to the container yard.
                </Alert>
              )}
            </Paper>
          </Box>
        </>
      )}

      <AssignCyDialog
        open={assignOpen}
        item={item}
        depots={depots}
        onClose={() => setAssignOpen(false)}
        onAssigned={(updated) => {
          setItem(updated)
          setSuccessMessage(`Container yard assigned for ${updated.referenceNo}.`)
          setAssignOpen(false)
          navigate(`/evaluations/atw/${updated.id}`, {
            replace: true,
            state: { message: `Container yard assigned. ${updated.assignedDepotName ?? updated.currentDepotName} will schedule pick-up.` },
          })
        }}
      />
    </Box>
  )
}
