import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { notificationApi, type Notification } from '../services/api'
import { useAppSelector } from '../store/hooks'
import { formatRelativeTime } from '../utils/datetime'
import { scheduleNonCritical } from '../utils/deferWork'

const primaryDark = '#0B3D91'

function isDepotBroadcast(notification: Notification): boolean {
  return notification.category === 'DepotBroadcast'
}

/**
 * Auto-presents unread depot broadcasts as a modal for trucker users.
 */
export default function TruckerBroadcastModal() {
  const role = useAppSelector((s) => s.auth.user?.role)
  const [active, setActive] = useState<Notification | null>(null)
  const [dismissing, setDismissing] = useState(false)
  const presentedRef = useRef<Set<number>>(new Set())
  const activeRef = useRef<Notification | null>(null)

  activeRef.current = active

  const pickNextBroadcast = useCallback((items: Notification[]) => {
    return items
      .filter((n) => isDepotBroadcast(n) && !n.isRead && !presentedRef.current.has(n.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
  }, [])

  const poll = useCallback(() => {
    if (role !== 'Trucker') return

    notificationApi
      .list({ unreadOnly: true, pageSize: 50 })
      .then(({ data }) => {
        if (activeRef.current) return
        const next = pickNextBroadcast(data.items)
        if (next) {
          presentedRef.current.add(next.id)
          setActive(next)
        }
      })
      .catch(() => {})
  }, [role, pickNextBroadcast])

  useEffect(() => {
    if (role !== 'Trucker') {
      setActive(null)
      presentedRef.current.clear()
      return undefined
    }

    const cancelDeferred = scheduleNonCritical(poll)
    const interval = setInterval(poll, 20_000)
    return () => {
      cancelDeferred()
      clearInterval(interval)
    }
  }, [role, poll])

  const handleDismiss = async () => {
    if (!active || dismissing) return
    setDismissing(true)

    const dismissedId = active.id
    try {
      await notificationApi.markRead(dismissedId)
    } catch {
      /* still advance so the user is not blocked */
    }

    try {
      const { data } = await notificationApi.list({ unreadOnly: true, pageSize: 50 })
      const remaining = data.items.filter(
        (n) => isDepotBroadcast(n) && !n.isRead && n.id !== dismissedId,
      )
      const next = pickNextBroadcast(remaining)
      if (next) presentedRef.current.add(next.id)
      setActive(next)
    } catch {
      setActive(null)
    } finally {
      setDismissing(false)
    }
  }

  if (role !== 'Trucker' || !active) return null

  return (
    <Dialog
      open
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') void handleDismiss()
      }}
      maxWidth="sm"
      fullWidth
      aria-labelledby="trucker-broadcast-title"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(11, 61, 145, 0.22)',
          },
        },
      }}
    >
      <DialogTitle
        id="trucker-broadcast-title"
        sx={{
          px: { xs: 2.5, sm: 3 },
          pt: 2.5,
          pb: 1.5,
          bgcolor: 'rgba(11, 61, 145, 0.04)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'rgba(11, 61, 145, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: primaryDark,
            }}
          >
            <CampaignOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.2, lineHeight: 1.2 }}>
              Notifications
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.3, mt: 0.25 }}>
              {active.title}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, py: 2.5 }}>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}
        >
          {active.message}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2 }}>
          {formatRelativeTime(active.createdAt)}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2.5, sm: 3 }, pb: 2.5, pt: 0 }}>
        <Button
          variant="contained"
          onClick={() => void handleDismiss()}
          disabled={dismissing}
          sx={{
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            bgcolor: primaryDark,
          }}
        >
          {dismissing ? 'Closing…' : 'Got it'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
