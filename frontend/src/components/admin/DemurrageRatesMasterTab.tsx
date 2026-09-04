import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import { Alert, Box, Button, Chip, Paper, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ListLoadingState } from '../layout/ListPagePrimitives'
import { demurrageDetentionRateApi, paymentApi } from '../../services/api'
import { formatDateTime, formatPeso } from '../../utils/datetime'

const primaryDark = '#0B3D91'

export default function DemurrageRatesMasterTab() {
  const [loading, setLoading] = useState(true)
  const [activeRules, setActiveRules] = useState(0)
  const [fallbackDemurrage, setFallbackDemurrage] = useState(0)
  const [fallbackDetention, setFallbackDetention] = useState(0)
  const [fallbackUpdatedAt, setFallbackUpdatedAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ratesRes, settingsRes] = await Promise.all([
        demurrageDetentionRateApi.list(),
        paymentApi.getSettings(),
      ])
      setActiveRules(ratesRes.data.filter((r) => r.isActive).length)
      setFallbackDemurrage(settingsRes.data.demurrageFeeAmount)
      setFallbackDetention(settingsRes.data.detentionFeeAmount)
      setFallbackUpdatedAt(settingsRes.data.updatedAt)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <ListLoadingState />

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 3 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'rgba(11, 61, 145, 0.08)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <PaymentsOutlinedIcon sx={{ color: primaryDark }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: primaryDark }}>
            Demurrage & detention rates
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
            Per shipping line rules apply automatically when expired CRO/eDO free time triggers billing.
            Manage full rule tables on the dedicated settings page.
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Active rules
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: primaryDark, mt: 0.5 }}>
            {activeRules}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            System fallback demurrage
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: primaryDark, mt: 0.5 }}>
            {formatPeso(fallbackDemurrage)}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            System fallback detention
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: primaryDark, mt: 0.5 }}>
            {formatPeso(fallbackDetention)}
          </Typography>
        </Paper>
      </Box>

      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        Demo seed includes MAERSK ICTSI 40&apos; at {formatPeso(4200)} / {formatPeso(2800)} when the database has no rules yet.
      </Alert>

      {fallbackUpdatedAt && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Fallback last updated {formatDateTime(fallbackUpdatedAt)}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
        <Button
          component={RouterLink}
          to="/admin/demurrage-rates"
          variant="contained"
          endIcon={<OpenInNewIcon />}
          sx={{ fontWeight: 700, borderRadius: 2 }}
        >
          Open rate settings
        </Button>
        <Chip label="Per line · depot · size · dates" size="small" variant="outlined" />
      </Box>
    </Box>
  )
}
