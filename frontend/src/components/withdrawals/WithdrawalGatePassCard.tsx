import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import { useEffect, useState } from 'react'
import { withdrawalApi, type WithdrawalGatePass } from '../../services/api'

interface WithdrawalGatePassCardProps {
  withdrawalId: number
  status: string
}

export default function WithdrawalGatePassCard({ withdrawalId, status }: WithdrawalGatePassCardProps) {
  const [pass, setPass] = useState<WithdrawalGatePass | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const eligible = ['Approved', 'Released', 'Completed'].includes(status)

  useEffect(() => {
    if (!eligible) {
      setPass(null)
      return
    }
    setLoading(true)
    setError('')
    withdrawalApi
      .gatePass(withdrawalId)
      .then(({ data }) => setPass(data))
      .catch(() => setError('Gate pass is not available yet.'))
      .finally(() => setLoading(false))
  }, [withdrawalId, eligible, status])

  if (!eligible) return null

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <QrCode2Icon sx={{ color: '#0B3D91' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Withdrawal gate pass
        </Typography>
      </Box>

      {loading ? (
        <CircularProgress size={22} />
      ) : error ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : pass ? (
        <Box>
          <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 800, mb: 0.5 }}>
            {pass.gateCode}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {pass.containerSummary} · Valid until {pass.expiresOn}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            {pass.currentDepotName} → {pass.destination}
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: '#fff',
              border: '1px dashed',
              borderColor: 'divider',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              wordBreak: 'break-all',
            }}
          >
            {pass.qrPayload}
          </Paper>
          <Button
            size="small"
            sx={{ mt: 1.5, fontWeight: 600 }}
            onClick={() => navigator.clipboard.writeText(pass.qrPayload)}
          >
            Copy gate QR payload
          </Button>
        </Box>
      ) : null}
    </Box>
  )
}
