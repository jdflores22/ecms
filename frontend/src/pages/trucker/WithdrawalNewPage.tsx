import { Alert, Box, Button, Paper, Typography } from '@mui/material'
import { FormWizardSkeleton } from '../../components/layout/SkeletonPrimitives'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import { useEffect, useState } from 'react'
import { Link as RouterLink, Navigate } from 'react-router-dom'
import { heroPaperSx } from '../../components/layout/DetailPagePrimitives'
import { listPageRootSx } from '../../components/layout/ListPagePrimitives'
import WithdrawalNewWizard from '../../components/withdrawals/WithdrawalNewWizard'
import { isPreAdviceManager } from '../../config/roleConfig'
import { withdrawalApi, type WithdrawalFormConfig } from '../../services/api'
import { useAppSelector } from '../../store/hooks'

const primaryDark = '#0B3D91'

export default function WithdrawalNewPage() {
  const user = useAppSelector((s) => s.auth.user)
  const [formConfig, setFormConfig] = useState<WithdrawalFormConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    withdrawalApi
      .formConfig()
      .then(({ data }) => setFormConfig(data))
      .catch(() => setError('Failed to load form options.'))
      .finally(() => setLoading(false))
  }, [])

  if (!isPreAdviceManager(user?.role)) {
    return <Navigate to="/" replace />
  }

  return (
    <Box sx={listPageRootSx}>
      <Button
        component={RouterLink}
        to="/trucker/withdrawals"
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

      <Paper elevation={0} sx={heroPaperSx}>
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
            <UnarchiveOutlinedIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              New withdrawal request
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 640 }}>
              Step through ATW details, upload your certificate with OCR assist, and submit to the container yard.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <FormWizardSkeleton />
      ) : formConfig ? (
        <WithdrawalNewWizard formConfig={formConfig} onError={setError} />
      ) : (
        <Alert severity="error">Unable to load withdrawal form configuration.</Alert>
      )}
    </Box>
  )
}
