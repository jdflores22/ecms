import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined'
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, Navigate, useLocation, useParams } from 'react-router-dom'
import { withdrawalApi, type Withdrawal } from '../../services/api'
import WithdrawalLinesTable from '../../components/withdrawals/WithdrawalLinesTable'
import { useAppSelector } from '../../store/hooks'
import { formatDateTime } from '../../utils/datetime'

const primaryDark = '#0B3D91'

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

export default function EvaluatorAtwDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const user = useAppSelector((s) => s.auth.user)
  const [item, setItem] = useState<Withdrawal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const withdrawalId = Number(id)

  const load = useCallback(() => {
    if (!Number.isFinite(withdrawalId)) return
    setLoading(true)
    setError('')
    withdrawalApi
      .get(withdrawalId)
      .then(({ data }) => setItem(data))
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

  if (user?.role !== 'ShippingLineEvaluator') {
    return <Navigate to="/" replace />
  }

  if (!Number.isFinite(withdrawalId)) {
    return <Navigate to="/evaluations/atw" replace />
  }

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/evaluations/atw"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}
      >
        Back to list
      </Button>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {loading ? (
        <Paper elevation={0} sx={{ py: 8, textAlign: 'center', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CircularProgress sx={{ color: primaryDark }} />
        </Paper>
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
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  ATW {item.atwNumber}
                </Typography>
                <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
                  {item.truckerName} · {item.containerCount} container{item.containerCount === 1 ? '' : 's'}
                </Typography>
              </Box>
              <Chip
                label={item.status === 'UnderReview' ? 'Under review' : item.status}
                sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#fff', fontWeight: 700 }}
              />
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <InfoRow label="Authorized trucker" value={item.truckerName} />
            <InfoRow label="Current CY" value={item.currentDepotName} />
            <InfoRow label="Destination" value={item.destination} />
            <InfoRow label="Issue date" value={item.issueDate} />
            <InfoRow label="Expiration date" value={item.expirationDate} />
            {item.remarks && <InfoRow label="Remarks" value={item.remarks} />}
            {item.submittedAt && <InfoRow label="Submitted" value={formatDateTime(item.submittedAt)} />}
            {item.reviewRemarks && <InfoRow label="CY review remarks" value={item.reviewRemarks} />}
            <InfoRow label="ATW document" value={item.hasAtwDocument ? 'Attached by trucker' : 'Pending trucker upload'} />
            <Box sx={{ pt: 2 }}>
              <WithdrawalLinesTable lines={item.lines} summary={item.containerSummary} showLineStatus />
            </Box>
          </Paper>
        </>
      )}
    </Box>
  )
}
