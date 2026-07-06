import { Alert, Box, Button, Paper, Typography } from '@mui/material'
import { FormWizardSkeleton } from '../../components/layout/SkeletonPrimitives'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined'
import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AtwIssueForm, { type AtwIssueFormValues } from '../../components/withdrawals/AtwIssueForm'
import { heroPaperSx, sectionPaperSx } from '../../components/layout/DetailPagePrimitives'
import { withdrawalApi, type EvaluatorAtwLookups } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import {
  clearAtwIssueDraft,
  emptyAtwIssueFormValues,
  loadAtwIssueDraft,
  normalizeAtwIssueDraft,
  saveAtwIssueDraft,
} from '../../utils/atwIssueDraftStorage'
import { todayIsoDate } from '../../utils/datetime'

const primaryDark = '#0B3D91'

const workflowSteps = [
  'Confirm the auto-assigned ATW number and validity dates.',
  'Select the authorized trucker, container yard (CY), and destination.',
  'Pick containers from CY inventory — use Bulk select for many units, or add one at a time.',
  'Issue ATW — official PDF generated, CY assigned, and depot + trucker notified.',
]

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

type AtwNewLocationState = {
  draft?: AtwIssueFormValues
  lookups?: EvaluatorAtwLookups
}

export default function EvaluatorAtwNewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state ?? {}) as AtwNewLocationState
  const user = useAppSelector((s) => s.auth.user)
  const [lookups, setLookups] = useState<EvaluatorAtwLookups | null>(locationState.lookups ?? null)
  const [loading, setLoading] = useState(!locationState.lookups)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formValues, setFormValues] = useState<AtwIssueFormValues | null>(null)
  const hydratedRef = useRef(false)

  const handleFormChange = useCallback((next: AtwIssueFormValues) => {
    setFormValues(next)
    saveAtwIssueDraft(next)
  }, [])

  useEffect(() => {
    if (locationState.lookups) return
    withdrawalApi
      .evaluatorLookups()
      .then(({ data }) => setLookups(data))
      .catch(() => setError('Failed to load form data.'))
      .finally(() => setLoading(false))
  }, [locationState.lookups])

  useEffect(() => {
    if (!lookups) return
    const defaults = emptyAtwIssueFormValues(lookups.nextAtwNumber, todayIsoDate())
    if (locationState.draft) {
      const next = normalizeAtwIssueDraft(
        { ...locationState.draft, atwNumber: lookups.nextAtwNumber },
        defaults,
      )
      setFormValues(next)
      saveAtwIssueDraft(next)
      hydratedRef.current = true
      return
    }
    if (hydratedRef.current) return
    hydratedRef.current = true
    setFormValues(normalizeAtwIssueDraft(loadAtwIssueDraft(), defaults))
  }, [lookups, locationState.draft])

  if (user?.role !== 'ShippingLineEvaluator') {
    return <Navigate to="/" replace />
  }

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
              Authorize a trucker to withdraw containers that are currently in CY inventory at the selected yard.
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
            <FormWizardSkeleton />
          ) : lookups && formValues ? (
            <AtwIssueForm
              lookups={lookups}
              values={formValues}
              onChange={handleFormChange}
              submitting={submitting}
              onCancel={() => navigate('/evaluations/atw')}
              onBulkSelect={(draft) => {
                saveAtwIssueDraft(draft)
                setFormValues(draft)
                navigate('/evaluations/atw/new/containers', { state: { draft, lookups } })
              }}
              onSubmit={async (values) => {
                setSubmitting(true)
                setError('')
                try {
                  const { data } = await withdrawalApi.issue(values)
                  clearAtwIssueDraft()
                  navigate(`/evaluations/atw/${data.id}`, {
                    state: { message: 'ATW issued — CY assigned. Trucker and container yard have been notified.' },
                  })
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
