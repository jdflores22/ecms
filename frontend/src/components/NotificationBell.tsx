import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import {
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationApi, type Notification } from '../services/api'
import { formatDateTime } from '../utils/datetime'
import { scheduleNonCritical } from '../utils/deferWork'

const primaryDark = '#0B3D91'

const categoryColor: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  PreForecast: 'info',
  PreAdvice: 'info',
  Evaluation: 'primary',
  Schedule: 'secondary',
  Payment: 'warning',
  QR: 'success',
  Auth: 'default',
  Profile: 'default',
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [items, setItems] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    Promise.all([notificationApi.unreadCount(), notificationApi.list({ pageSize: 15 })])
      .then(([countRes, listRes]) => {
        setUnreadCount(countRes.data.count)
        setItems(listRes.data.items)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const cancelDeferred = scheduleNonCritical(load)
    const interval = setInterval(load, 30_000)
    return () => {
      cancelDeferred()
      clearInterval(interval)
    }
  }, [load])

  const open = Boolean(anchorEl)

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
    setLoading(true)
    notificationApi
      .list({ pageSize: 20 })
      .then(({ data }) => {
        setItems(data.items)
        setUnreadCount(data.unreadCount)
      })
      .finally(() => setLoading(false))
  }

  const handleClose = () => setAnchorEl(null)

  const handleClick = async (item: Notification) => {
    if (!item.isRead) {
      await notificationApi.markRead(item.id).catch(() => {})
      setUnreadCount((c) => Math.max(0, c - 1))
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)))
    }
    handleClose()
    if (item.linkPath) navigate(item.linkPath)
  }

  const handleMarkAllRead = async () => {
    await notificationApi.markAllRead().catch(() => {})
    setUnreadCount(0)
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton color="inherit" onClick={handleOpen} aria-label="Notifications">
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsNoneOutlinedIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: 320, sm: 380 },
              maxHeight: 480,
              borderRadius: 2.5,
              mt: 1,
              boxShadow: '0 12px 40px rgba(15, 23, 42, 0.15)',
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllRead} sx={{ fontWeight: 600, textTransform: 'none' }}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} sx={{ color: primaryDark }} />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications yet.
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ py: 0, maxHeight: 360, overflow: 'auto' }}>
            {items.map((item) => (
              <ListItemButton
                key={item.id}
                onClick={() => handleClick(item)}
                sx={{
                  alignItems: 'flex-start',
                  py: 1.25,
                  bgcolor: item.isRead ? 'transparent' : hexToRgba(primaryDark, 0.04),
                  borderLeft: item.isRead ? '3px solid transparent' : `3px solid ${primaryDark}`,
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                      <Typography variant="body2" sx={{ fontWeight: item.isRead ? 600 : 700, flex: 1 }}>
                        {item.title}
                      </Typography>
                      <Chip
                        label={item.category}
                        size="small"
                        color={categoryColor[item.category] ?? 'default'}
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="caption" component="span" color="text.secondary" sx={{ display: 'block' }}>
                        {item.message}
                      </Typography>
                      <Typography variant="caption" component="span" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                        {formatDateTime(item.createdAt)}
                        {item.actorName ? ` · ${item.actorName}` : ''}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Popover>
    </>
  )
}
