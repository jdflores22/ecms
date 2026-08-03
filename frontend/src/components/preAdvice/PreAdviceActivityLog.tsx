import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import {
  Alert,
  Box,
  Chip,
  Paper,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { ICS_PRIMARY, hexToRgba } from '../layout/DetailPagePrimitives'
import { InlineLoadingSkeleton } from '../layout/SkeletonPrimitives'
import { preAdviceApi, type AuditLog } from '../../services/api'
import { formatDateTime } from '../../utils/datetime'

const primaryDark = ICS_PRIMARY

const MODULE_LABELS: Record<string, string> = {
  PreForecast: 'Pre-forecast',
  PreAdvice: 'Pre-forecast',
  Evaluation: 'Evaluation',
  Schedule: 'Schedule',
  Payment: 'Payment',
  QR: 'Booking QR',
  BookingConfirmationPdf: 'Confirmation PDF',
  LOGICTECK: 'LOGICTECK',
}

const moduleColor: Record<string, 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'> = {
  PreForecast: 'info',
  PreAdvice: 'info',
  Evaluation: 'warning',
  Schedule: 'secondary',
  Payment: 'success',
  QR: 'success',
  BookingConfirmationPdf: 'success',
  LOGICTECK: 'primary',
}

type PreAdviceActivityLogProps = {
  preAdviceId: number
  active: boolean
}

export default function PreAdviceActivityLog({ preAdviceId, active }: PreAdviceActivityLogProps) {
  const [items, setItems] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    preAdviceApi
      .activity(preAdviceId)
      .then(({ data }) => {
        setItems(data)
      })
      .catch(() => setError('Failed to load activity log.'))
      .finally(() => setLoading(false))
  }, [preAdviceId])

  useEffect(() => {
    if (!active) return
    load()
  }, [active, load])

  if (!active) return null

  if (loading && items.length === 0) {
    return <InlineLoadingSkeleton rows={5} />
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }} action={
        <Chip label="Retry" size="small" onClick={load} clickable sx={{ fontWeight: 600 }} />
      }>
        {error}
      </Alert>
    )
  }

  if (items.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: hexToRgba(primaryDark, 0.12),
          bgcolor: hexToRgba(primaryDark, 0.02),
          textAlign: 'center',
        }}
      >
        <HistoryOutlinedIcon sx={{ color: hexToRgba(primaryDark, 0.45), fontSize: 36, mb: 1 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          No activity yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Actions on this pre-forecast — submit, evaluation, schedule, payment, and QR — will appear here.
        </Typography>
      </Paper>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Activity trail
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {items.length} event{items.length === 1 ? '' : 's'}
        </Typography>
      </Box>

      <Box sx={{ position: 'relative', pl: { xs: 0, sm: 1.5 } }}>
        {items.map((entry, index) => {
          const isLast = index === items.length - 1
          return (
            <Box
              key={entry.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '16px 1fr' },
                gap: { xs: 0, sm: 1.5 },
                mb: isLast ? 0 : 1.5,
              }}
            >
              <Box
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: primaryDark,
                    mt: 1.5,
                    flexShrink: 0,
                  }}
                />
                {!isLast && (
                  <Box
                    sx={{
                      width: 2,
                      flex: 1,
                      bgcolor: hexToRgba(primaryDark, 0.15),
                      mt: 0.75,
                      mb: -1.5,
                    }}
                  />
                )}
              </Box>

              <Paper
                elevation={0}
                sx={{
                  p: 1.75,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#fff',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 1,
                    mb: 0.75,
                  }}
                >
                  <Chip
                    size="small"
                    label={MODULE_LABELS[entry.module] ?? entry.module}
                    color={moduleColor[entry.module] ?? 'default'}
                    sx={{ fontWeight: 700 }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {entry.action}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: { sm: 'auto' } }}>
                    {formatDateTime(entry.timestamp)}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: entry.details ? 0.5 : 0 }}>
                  by <strong>{entry.username}</strong>
                </Typography>
                {entry.details ? (
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                      fontSize: '0.8rem',
                      color: 'text.primary',
                      wordBreak: 'break-word',
                    }}
                  >
                    {entry.details}
                  </Typography>
                ) : null}
              </Paper>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
