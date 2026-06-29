import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom'
import WithdrawalForm, { type WithdrawalFormSubmitValues } from '../../components/withdrawals/WithdrawalForm'
import { isPreAdviceManager } from '../../config/roleConfig'
import { withdrawalApi, type WithdrawalLookups } from '../../services/api'
import { useAppSelector } from '../../store/hooks'

const primaryDark = '#0B3D91'

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

export default function WithdrawalNewPage() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const [lookups, setLookups] = useState<WithdrawalLookups | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    withdrawalApi
      .lookups()
      .then(({ data }) => setLookups(data))
      .catch(() => setError('Failed to load form options.'))
      .finally(() => setLoading(false))
  }, [])

  if (!isPreAdviceManager(user?.role)) {
    return <Navigate to="/" replace />
  }

  const handleCreate = async (values: WithdrawalFormSubmitValues) => {
    setSubmitting(true)
    setError('')
    try {
      const { data } = await withdrawalApi.create(values)
      navigate(`/trucker/withdrawals/${data.id}`)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to create withdrawal request.'))
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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
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
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              New withdrawal request
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 560 }}>
              Enter ATW details for repositioning. After saving, attach the ATW certificate and submit to the container yard.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        {loading || !lookups ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: primaryDark }} />
          </Box>
        ) : (
          <WithdrawalForm
            lookups={lookups}
            initial={{
              atwNumber: '',
              shippingLineId: '',
              lines: [{ containerNo: '', containerSizeId: '', containerTypeId: '' }],
              currentDepotId: '',
              destination: '',
              issueDate: '',
              expirationDate: '',
              remarks: '',
            }}
            onSubmit={handleCreate}
            onCancel={() => navigate('/trucker/withdrawals')}
            submitting={submitting}
          />
        )}
      </Paper>
    </Box>
  )
}
