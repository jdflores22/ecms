import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom'
import AtwIssueForm from '../../components/withdrawals/AtwIssueForm'
import { heroPaperSx, sectionPaperSx } from '../../components/layout/DetailPagePrimitives'
import { withdrawalApi, type EvaluatorAtwLookups } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { todayIsoDate } from '../../utils/datetime'

const primaryDark = '#0B3D91'

const workflowSteps = [
  'Confirm the auto-assigned ATW number and validity dates.',
  'Select the authorized trucker, current CY, and destination.',
  'Add every container in the batch — mixed sizes and types are supported.',
  'Issue ATW — the trucker is notified to upload the certificate and submit.',
]

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

export default function EvaluatorAtwNewPage() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const [lookups, setLookups] = useState<EvaluatorAtwLookups | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    withdrawalApi
      .evaluatorLookups()
      .then(({ data }) => setLookups(data))
      .catch(() => setError('Failed to load form data.'))
      .finally(() => setLoading(false))
  }, [])

  if (user?.role !== 'ShippingLineEvaluator') {
    return <Navigate to="/" replace />
  }

  const today = todayIsoDate()

  return (
    <Box sx={{ maxWidth: '100%' }}>
      <Button
        component={RouterLink}
        to="/evaluations/atw"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}
      >
        Back to list
      </Button>

      <Paper elevation={0} sx={heroPaperSx}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: 'flex-start',
            position: 'relative',
          }}
        >
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
            <AssignmentTurnedInOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              Issue new ATW
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 720 }}>
              Authorize a trucker to withdraw one or more containers for repositioning under a single ATW batch.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) 300px' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0, p: { xs: 2, sm: 2.5, md: 3 } }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress sx={{ color: primaryDark }} />
            </Box>
          ) : lookups ? (
            <AtwIssueForm
              lookups={lookups}
              initial={{
                atwNumber: lookups.nextAtwNumber,
                authorizedTruckerId: '',
                lines: [{ containerNo: '', containerSizeId: '', containerTypeId: '' }],
                currentDepotId: '',
                destination: '',
                issueDate: today,
                expirationDate: today,
                remarks: '',
              }}
              submitting={submitting}
              onCancel={() => navigate('/evaluations/atw')}
              onSubmit={async (values) => {
                setSubmitting(true)
                setError('')
                try {
                  const { data } = await withdrawalApi.issue(values)
                  navigate(`/evaluations/atw/${data.id}`, { state: { message: 'ATW issued. Trucker has been notified.' } })
                } catch (err) {
                  setError(apiErrorMessage(err, 'Failed to issue ATW.'))
                } finally {
                  setSubmitting(false)
                }
              }}
            />
          ) : (
            <Alert severity="error">Form data unavailable.</Alert>
          )}
        </Paper>

        <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0, position: { xl: 'sticky' }, top: { xl: 88 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            What happens next
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {workflowSteps.map((step, i) => (
              <Box key={step} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#fff',
                    bgcolor: i === 0 ? '#00A3E0' : primaryDark,
                  }}
                >
                  {i + 1}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, pt: 0.25 }}>
                  {step}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
