import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom'
import PreAdviceForm from '../../components/preAdvice/PreAdviceForm'
import { isPreAdviceManager } from '../../config/roleConfig'
import { preAdviceApi, type PreAdviceLookups } from '../../services/api'
import { useAppSelector } from '../../store/hooks'

const primaryDark = '#0B3D91'

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

const workflowSteps = [
  'Choose the shipping line and enter the container number.',
  'Select container size and type from the catalog.',
  'Save as draft — then submit when ready from the detail page.',
]

export default function PreAdviceNewPage() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const [lookups, setLookups] = useState<PreAdviceLookups | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    preAdviceApi
      .lookups()
      .then(({ data }) => setLookups(data))
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          setError('Access denied. Log out and sign in again to refresh your session.')
          return
        }
        setError('Failed to load form options.')
      })
      .finally(() => setLoading(false))
  }, [])

  if (!isPreAdviceManager(user?.role)) {
    return <Navigate to="/" replace />
  }

  const handleCreate = async (values: {
    shippingLineId: number
    containerNo: string
    containerSizeId: number
    containerTypeId: number
    remarks?: string
  }) => {
    setSubmitting(true)
    setError('')
    try {
      const { data } = await preAdviceApi.create(values)
      navigate(`/preadvice/${data.id}`)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to create pre-advice.'))
      setSubmitting(false)
    }
  }

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/preadvice"
        startIcon={<ArrowBackIcon />}
        sx={{
          mb: 2,
          color: 'text.secondary',
          fontWeight: 600,
          '&:hover': { color: primaryDark, bgcolor: 'rgba(11, 61, 145, 0.06)' },
        }}
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
          boxShadow: '0 8px 24px rgba(11, 61, 145, 0.22)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -30,
            top: -30,
            width: 140,
            height: 140,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
          }}
        />
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', position: 'relative' }}>
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
            <DescriptionOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              New pre-advice
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 560 }}>
              Create a draft empty container return request. You can submit it to the shipping line after review.
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
          gridTemplateColumns: { xs: '1fr', lg: '1fr 320px' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
            boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <AddIcon sx={{ color: primaryDark, fontSize: 22 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Request details
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: primaryDark }} />
            </Box>
          ) : lookups ? (
            <PreAdviceForm
              lookups={lookups}
              initial={{
                shippingLineId: '',
                containerNo: '',
                containerSizeId: '',
                containerTypeId: '',
                remarks: '',
              }}
              onSubmit={handleCreate}
              onCancel={() => navigate('/preadvice')}
              submitLabel="Create draft"
              submitting={submitting}
            />
          ) : (
            <Alert severity="error">Unable to load shipping lines, sizes, and types.</Alert>
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
            boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
          }}
        >
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
