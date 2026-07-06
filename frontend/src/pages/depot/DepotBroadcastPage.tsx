import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { hexToRgba } from '../../components/layout/DetailPagePrimitives'
import { ListLoadingState, LIST_PRIMARY, listPageRootSx } from '../../components/layout/ListPagePrimitives'
import { depotBroadcastApi, type DepotBroadcast } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatDateTime, formatRelativeTime } from '../../utils/datetime'

const primaryDark = LIST_PRIMARY
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

export default function DepotBroadcastPage() {
  const currentUser = useAppSelector((s) => s.auth.user)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<DepotBroadcast[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadHistory = useCallback(() => {
    setLoading(true)
    depotBroadcastApi
      .list()
      .then(({ data }) => setHistory(data))
      .catch(() => setError('Unable to load broadcast history.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  if (currentUser?.role !== 'DepotPersonnel') {
    return <Navigate to="/" replace />
  }

  const handleSend = async () => {
    setError('')
    setSuccess('')
    setSending(true)
    try {
      const { data } = await depotBroadcastApi.send({ subject, message })
      setSubject('')
      setMessage('')
      setSuccess(`Broadcast sent to ${data.recipientCount} trucker${data.recipientCount === 1 ? '' : 's'}.`)
      setHistory((prev) => [data, ...prev])
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to send broadcast.'
      setError(msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <Box sx={listPageRootSx}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${primaryDark} 0%, #0A3580 60%, #0C4DA8 100%)`,
          color: '#fff',
          boxShadow: '0 8px 24px rgba(11, 61, 145, 0.22)',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CampaignOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Depot broadcast
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5, maxWidth: 560 }}>
              Send yard advisories, holiday closures, and operational updates to truckers associated with your depot.
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          New broadcast
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Subject"
            placeholder="e.g. Crane Repair"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            sx={fieldSx}
            helperText='Shown to truckers as "Broadcast: {subject}"'
          />
          <TextField
            label="Message"
            placeholder="Kindly expect possible delay and queuing on our yard today..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            sx={fieldSx}
          />
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              {success}
            </Alert>
          )}
          <Box>
            <Button
              variant="contained"
              startIcon={<SendOutlinedIcon />}
              onClick={handleSend}
              disabled={sending || !subject.trim() || !message.trim()}
              sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 3 }}
            >
              {sending ? 'Sending…' : 'Send broadcast'}
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
        Sent broadcasts
      </Typography>

      {loading ? (
        <ListLoadingState />
      ) : history.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}
        >
          <Typography variant="body2" color="text.secondary">
            No broadcasts sent yet.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {history.map((item) => (
            <Paper
              key={item.id}
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: hexToRgba(primaryDark, 0.02),
              }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Broadcast: {item.subject}
                </Typography>
                <Chip
                  size="small"
                  label={`${item.recipientCount} recipient${item.recipientCount === 1 ? '' : 's'}`}
                  sx={{ ml: { sm: 'auto' } }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {item.message}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.disabled">
                {formatDateTime(item.createdAt)} · {item.createdByName} · {formatRelativeTime(item.createdAt)}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  )
}
